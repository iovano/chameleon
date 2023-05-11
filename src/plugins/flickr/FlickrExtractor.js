import FlickrConnector from './FlickrConnector.js';
import * as fs from 'fs';
import path from 'path';

export default class FlickrExtractor extends FlickrConnector {
    retries = 3;
    retryDelay = 2000;
    requestDelay = 1000;
    useCache = true;
    stats = {
        albums: {failed: 0, cached: 0, processed: 0, skipped: 0}, 
        photos: {failed: 0, cached: 0, processed: 0, skipped: 0},
        videos: {failed: 0, cached: 0, processed: 0, skipped: 0}
    }
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
        let files = 0;
        let total = fs.readdirSync(directory);
        for (const file of total) {
          if (file !== '.gitkeep') {
            fs.unlinkSync(path.join(directory, file));
            files ++;  
            this.log(this.consoler.progressBar(files, total.length, 50), 6);       
          } else {
            files ++;
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
        mapping = [
            'id', 
            'media', 
            {'author': 'owner.username'}, 
            {'authorUrl': 'owner.path_alias'}, 
            {'title': 'title._content'}, 
            {'description': 'description._content'}, 
            {'safety': 'safety_level'}, 
            'size', 
            {'tags' : 'tags.tag'}, 
            {'url': 'url._content' }, 
            {'dateCreated': 'dates.taken'}, 
            {'datePosted': 'dateuploaded'}, 
            {'format': 'originalformat'} ,
            'camera', 
            'exif'], 
        collectExif = ['ExposureTime','FNumber','FocalLength','ISO','Flash','LensModel','Lens','CreatorTool']
        ) {
        let cache = this.useCache ? this.cacheData(data, 'photoinfo', 'readOnly') : undefined;
        let mediaContext = (data.media === 'video' ? 'videos' : 'photos');
        if (cache) {
            data = cache;
            this.stats[mediaContext].cached ++;
            return data;
        } else {
            try {
                data = await this.enrichPhotoData(data);
                if (data.ispublic == 0) {
                    this.stats[mediaContext].skipped++;
                } else {
                    data = await this.getPhotoSizes(data);
                    data = await this.enrichPhotoData(data, 'flickr.photos.getExif');
                    data = await this.buildPhotoUri(data);
                    await this.sleep();  
//                    console.log(data);
//                    process.exit();

                    data = this.condenseData(data, mapping);
                    data.tags.forEach((tag, idx) => data.tags[idx] = tag._content);      
                    let collectedExif = {};
                    data.exif?.forEach((exif) => {if (collectExif.indexOf(exif.tag) !==-1) { collectedExif[exif.tag] = exif.raw._content}});
                    data.exif = collectedExif;
                    if (this.useCache) {
                        this.cacheData(data, 'photoinfo', true);
                    }            
                    this.stats[mediaContext].processed++;
                }
                return data;
            } catch (error) {
                this.stats[mediaContext].failed++;
            }
        }
    }

    async collectPhotos(req, res) {
        let collected = await this.aggregateData();
        this.log("collecting photo information for "+collected.length+ "items");
        collected.forEach(async (data, key) => {
            let result = await this.collectPhotoInfo(data);
            if (result !== undefined && result.ispublic != 0) {
                collected[key] = result;
            }
        });
        let data = JSON.stringify(collected); 
        fs.writeFileSync('public/data/images.json', data);
        this.log("photo collection ("+collected.length+" items, "+data.length+" bytes) finished. ", 5)
    }

    async collectPhotoSets(req, res) {
        this.log("Collecting Photosets from Flickr", 1);
        let collect = [
            'id', 
            {'title': 'title._content'}, 
            {'description': 'description._content'}, 
            {author: 'username'}, 
            {dateCreated: 'date_create'}, 
            {dateUpdated: 'date_update'}, 
            'primary', 
            'photos', 
            {'url': 'url._content'}
        ];
        let collected = await this.aggregateData('photosets.getList','photosets','photoset',{});
        let jobs = {total: 0, completed: 0, failed: 0};
        let excludeSets = this.excludeSets?.split(",");
//        console.log(collected);
//        process.exit();
        for(var i = 0; i < collected.length; i++) {
            let album = collected[i];
            if (excludeSets?.length > 0 && (excludeSets.includes(album.id) || excludeSets.includes(album.title._content))) {
                this.log("skipping album #"+album.id+" due to exclusion parameter");
                this.stats.albums.skipped++;        
                this.stats.photos.skipped+=album.count_photos;
                this.stats.videos.skipped+=album.count_videos;
                collected.splice(i,1);
                i-=1;
            } else {
                jobs.total += album.count_photos + album.count_videos;
            }
        }
        let consoler = this.consoler;
        const done = function () {
            consoler.log(consoler.progressBar(jobs.completed + jobs.failed, jobs.total, 50, true), 4)
            return (jobs.completed + jobs.failed) >= jobs.total;
        }

        //const pb = new ProgressBar(50);
        //pb.start();

        let timeoutThreshold = 20;
        let timeoutCounter = 0;
        let fps = 10;

        collected.forEach(async (photoset, i) => {
            this.log("collecting photo information for photoset #"+photoset.id, 3);
            photoset.photos = await this.aggregateData('photosets.getPhotos','photoset','photo',{photoset_id: photoset.id});
            photoset.photos.forEach(async (photo, photoNum) => {
                let result = await this.collectPhotoInfo(photo);
                if (result === undefined) {
                    jobs.failed++;
                } else if (photo.ispublic == 0) {
                    jobs.completed++;
                    photoset.photos[photoNum] = undefined;
                } else {
                    photoset.photos[photoNum] = result;
                    jobs.completed ++;
                }
                timeoutCounter = 0;
            });
            collected[i] = this.condenseData(photoset, collect);
            await this.sleep();
            this.stats.albums.processed++;
        });
        while (!done()) {
            timeoutCounter ++;
            if (timeoutCounter > timeoutThreshold * fps) {
                this.error('Connection timed out after '+timeoutThreshold+' seconds.', 5);
                process.exit();
            }
            await this.sleep(1000 / (fps || 1));
        }
        /* clean up skipped photos and empty photosets */
        for (let i = 0; i < collected.length ; i++) {
            for (let p = 0; p < collected[i].photos.length; p++) {
                if (collected[i].photos[p] === undefined) {
                    collected[i].photos.splice(p,1);
                    p-=1;
                }
            }
            if (collected[i].photos.length === 0) {
                collected.splice(i,1);
                i-=1;
            }
        }
        
        let data = JSON.stringify(collected);
        this.log("photoset collection ("+jobs.completed+" photos ,"+data.length+" bytes) finished. ", 6);
        this.success("[ done ]");
        console.table({
            albums: {cached: this.stats.albums.cached, processed: this.stats.albums.processed, skipped: this.stats.albums.skipped, failed: this.stats.albums.failed},
            photos: {cached: this.stats.photos.cached, processed: this.stats.photos.processed, skipped: this.stats.photos.skipped,failed: this.stats.photos.failed},
            videos: {cached: this.stats.videos.cached, processed: this.stats.videos.processed, skipped: this.stats.videos.skipped,failed: this.stats.videos.failed}

        });
        if (this.errors) {
            console.error(this.errors);
        }
        fs.writeFileSync('public/data/albums.json', data);    
    }    
    showStats() {

    }
}
