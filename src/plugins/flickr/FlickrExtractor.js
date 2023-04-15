const FlickrConnector = require('./FlickrConnector');
const fs = require('fs');

class FlickrExtractor extends FlickrConnector {
    retries = 3;
    retryDelay = 2000;
    requestDelay = 1000;
    useCache = true;
    stats = {albums: {failed: [], cached: [], processed: []}, photos: {failed: [], cached: [], processed: []}}
    setParams(params) {
        for (const [key, value] of Object.entries(params)) {
            this[key] = value;
        }
    }
    async sleep(ms = this.requestDelay) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    async cacheClear() {
        const directory = "temp";
        const path = require("path");
        let files = 0;
        let total = fs.readdirSync(directory);
        for (const file of total) {
          if (file !== '.gitkeep') {
            fs.unlinkSync(path.join(directory, file));
            files ++;  
            this.log(this.consoler.progressBar(files, total.length, 50), 6);       
          }
        }
        this.log("cache cleared. unlinked "+files+" files from cache directory.")
    }
    cacheData(data, context = 'photo', mode = 'default') {
        let filename = "./temp/"+context+"_"+data.id+".json";
        if (fs.existsSync(filename)) {
            if (mode !== 'overwrite') {
                return JSON.parse(fs.readFileSync(filename));
            }
        }
        if (mode === 'readOnly') {
            /* if we reached this point we are having a cache miss */
            return;
        }
        let fd = fs.openSync(filename, 'wx');
        try {
            let content = JSON.stringify(data);
            fs.writeFileSync(filename, content);
            return data;
        } finally {
            fs.closeSync(fd);
        }   
    }
    /** mapping = ['description', {title: 'title._content'}] */
    condenseData(data, mapping, keepEmpty = false) {
        let result = {};
        mapping.forEach((element) => {
            if (element instanceof String || typeof element === 'string') {
                if (data[element] || keepEmpty === true) {
                    result[element] = data[element];
                }
            } else if (element instanceof Object || typeof element === 'object') {
                for (const [key, value] of Object.entries(element)) {
                    let subset = data;
                    value.split('.').forEach((node) => {
                        subset = subset?.[node];
                    });
                    if (subset || keepEmpty === true) {
                        result[key] = subset;
                    }
                }
            }
        }
        );
        return result;
    }
    async aggregateData(endpoint = 'people.getPhotos', rootNode = 'photos', dataNode = 'photo', query = {}) {
        query = {...{user_id: this.userId || 'me'}, ...query};

        let collected = [];
        let pages = 1, page = 0;
        while (page < pages) {
            page ++;
            query['page'] = page;
            let response = await this.flickr._('GET', 'flickr.'+endpoint, query);
            let collection = response.body[rootNode];
            pages = collection.pages;
            page = collection.page;
            let items = collection[dataNode];
            this.log("flickr."+endpoint+": aggregating "+rootNode+" "+(pages > 1 ? " [page "+page+"/"+pages+"]" : "")+": "+items.length+" entries", 1);
            items.forEach (async (data, key) => { collected.push(this.useCache ? this.cacheData(data) : data); });
            await this.sleep();
            this.log(this.consoler.progressBar(page, pages), 2);
        }
        return collected;                                              
    }
    async enrichPhotoData(data, endpoint = 'flickr.photos.getInfo', callback = undefined) {
        let q = {'photo_id': data.id};
        for (let attempt = 1; attempt < this.retries; attempt ++) {
            try {
                let response = await this.flickr._('GET', endpoint, q);
                await this.sleep(this.requestDelay);
                Object.assign(data, response.body.photo)
                return data;
            } catch (error) {
                this.log('request to "'+endpoint+'" failed for photo #'+data.id+' (attempt '+attempt+'/'+this.retries+')', 5);
                this.error('Error: '+(error.code ? error.code + ": " : '')+error.errno, 6);
                await this.sleep(this.retryDelay);
            }    
        }
        console.error('Maximum retrials ('+this.retries+') to "'+endpoint+'" reached. Skipping dataset!', q);
        return;
    }
    buildPhotoUri(photo, attributeName = 'thumb', sizeSuffix = 't') {
        photo[attributeName] = 'https://live.staticflickr.com/'+photo.server+'/'+photo.id+'_'+photo.secret+'_'+sizeSuffix+'.jpg';
        return photo;
    }

    async downloadPhoto(req, res) {
        let photoId = req.params.photoId;
        let size = req.params.size;

        let filename = "public/images/"+photoId+".jpg";
        const file = fs.createWriteStream(filename);
        const photo = await this.getPhotoSizes({id: photoId});
        const url = photo.size[size];
        this.log("downloading from "+url+" to "+filename);
        
        const request = https.get(url, function(response) {
           response.pipe(file);
           file.on("finish", () => {
               file.close();
               this.log("Download Completed");
           });
           res.json(response.body);
        });
    }

    async getPhotoInfo(data) {
        await this.collectPhotoData('flickr.photos.getInfo',data,{photo_id: 'id'});
        return data;
    }

    async collectPhotoInfo(data, 
        mapping = ['id', {'title': 'title._content'}, {'description': 'description._content'}, 'size', {'tags' : 'tags.tag'}, {'url': 'url._content' }, 'camera', 'exif'], 
        collectExif = ['ExposureTime','FNumber','FocalLength','ISO','Flash','LensModel','Lens','CreatorTool']
        ) {
        let cache = this.useCache ? this.cacheData(data, 'photoinfo', 'readOnly') : undefined;
        if (cache) {
            data = cache;
            this.stats.photos.cached.push(data.id);
            return data;
        } else {
            try {
                data = await this.enrichPhotoData(data);
                data = await this.getPhotoSizes(data);
                data = await this.enrichPhotoData(data, 'flickr.photos.getExif');
                data = await this.buildPhotoUri(data);
                await this.sleep();  
                data = this.condenseData(data, mapping);
                data.tags.forEach((tag, idx) => data.tags[idx] = tag._content);      
                let collectedExif = {};
                data.exif?.forEach((exif) => {if (collectExif.indexOf(exif.tag) !==-1) { collectedExif[exif.tag] = exif.raw._content}});
                data.exif = collectedExif;
                if (this.useCache) {
                    this.cacheData(data, 'photoinfo', true);
                }            
                this.stats.photos.processed.push(data.id);
                return data;
            } catch (error) {
                this.stats.photos.failed.push(data.id);
            }
        }
    }

    async collectPhotos(req, res) {
        let collected = await this.aggregateData();
        this.log("collecting photo information for "+collected.length+ "items");
        collected.forEach(async (data, key) => {
            let result = await this.collectPhotoInfo(data);
            if (result === undefined) {
                this.stats.photos.failed.push(photo.id);
            } else {
                collected[key] = result;
            }
        });
        let data = JSON.stringify(collected); 
        fs.writeFileSync('public/data/images.json', data);
        this.log("photo collection ("+collected.length+" items, "+data.length+" bytes) finished. ", 5)
    }

    async collectPhotoSets(req, res) {
        this.log("Collecting Photosets from Flickr", 1);
        let collect = ['id', {'title': 'title._content'}, {'description': 'description._content'}, 'photos', {'url': 'url._content'}];
        let collected = await this.aggregateData('photosets.getList','photosets','photoset',{});
        let jobs = {total: 0, completed: 0, failed: 0};
        for(var i = 0; i < collected.length; i++) {
            jobs.total += collected[i].count_photos + collected[i].count_videos;
        }
        let consoler = this.consoler;
        const done = function () {
            consoler.log(consoler.progressBar(jobs.completed + jobs.failed, jobs.total, 50, true), 4)
            return (jobs.completed + jobs.failed) >= jobs.total;
        }
        //const pb = new ProgressBar(50);
        //pb.start();

        collected.forEach(async (photoset, i) => {
            this.log("collecting photo information for photoset #"+photoset.id, 3);
            photoset.photos = await this.aggregateData('photosets.getPhotos','photoset','photo',{photoset_id: photoset.id});
            photoset.photos.forEach(async (photo, photoNum) => {
                let result = await this.collectPhotoInfo(photo);
                if (result === undefined) {
                    this.stats.photos.failed.push(photo.id);
                    jobs.failed++;
                } else {
                    photoset.photos[photoNum] = result;
                    jobs.completed ++;
                }
            });
            collected[i] = this.condenseData(photoset, collect);
            await this.sleep();
            this.stats.albums.processed.push(photoset.id);
        });
        while (!done()) {
            await this.sleep(50);
        }
        
        let data = JSON.stringify(collected);
        this.log("photoset collection ("+jobs.completed+" photos ,"+data.length+" bytes) finished. ", 6);
        this.log("done");
        console.table({
            albums: {cached: this.stats.albums.cached.length, processed: this.stats.albums.processed.length, failed: this.stats.albums.failed.length},
            photos: {cached: this.stats.photos.cached.length, processed: this.stats.photos.processed.length, failed: this.stats.photos.failed.length}
            });
        if (this.errors) {
            console.error(this.errors);
        }
        fs.writeFileSync('public/data/albums.json', data);    
    }    
    showStats() {

    }
}

module.exports = FlickrExtractor;