const FlickrConnector = require('./FlickrConnector');
const fs = require('fs');

class FlickrExtractor extends FlickrConnector {
    retries = 3;
    retryDelay = 2000;
    requestDelay = 200;

    async sleep(ms = this.requestDelay) {
        await new Promise(resolve => setTimeout(resolve, ms));
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
            console.debug("flickr."+endpoint+": aggregating data"+(pages > 1 ? " [page "+page+"/"+pages+"]" : "")+": "+items.length+" entries", query);
            items.forEach (async (data, key) =>
                {
                    collected.push(this.cacheData(data));
                }
            );
            await this.sleep();
        }
        return collected;                                              
    }
    async enrichPhotoData(data, endpoint = 'flickr.photos.getInfo', attempt = 1) {
        let q = {'photo_id': data.id};
        try {
            let response = await this.flickr._('GET', endpoint, q);
            await this.sleep(this.requestDelay);
            Object.assign(data, response.body.photo)
            return data;
        } catch (error) {
            if (attempt <= this.retries) {
                console.warn('request to "'+endpoint+'" failed (attempt '+attempt+'/'+this.retries+')', q, error);
                await this.sleep(this.retryDelay);
                return await this.enrichPhotoData(data, attempt + 1);
            } else {
                console.error('Maximum retrials ('+this.retries+') to "'+endpoint+'" reached. Skipping dataset!', q);
            }
        }
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
        console.debug("downloading from "+url+" to "+filename);
        
        const request = https.get(url, function(response) {
           response.pipe(file);
           file.on("finish", () => {
               file.close();
               console.debug("Download Completed");
           });
           res.json(response.body);
        });
    }

    async getPhotoInfo(data) {
        await this.collectPhotoData('flickr.photos.getInfo',data,{photo_id: 'id'});
        return data;
    }

    async collectPhotoInfo(data) {
        let cache = this.cacheData(data, 'photoinfo', 'readOnly');
        if (cache) {
            data = cache;
        } else {
            try {
                data = await this.enrichPhotoData(data);
                data = await this.buildPhotoUri(data);
                data = await this.getPhotoSizes(data);  
                await this.sleep();  
            } catch (error) {
                console.error('error while collecting photo information for photo #'+data.id);
            }
            this.cacheData(data, 'photoinfo', true);
        }
        data = this.condenseData(data, ['id', {'title': 'title._content'}, {'description': 'description._content'}, 'size', {'tags' : 'tags.tag'}, {'url': 'url._content' }]);
        data.tags.forEach((tag, idx) => data.tags[idx] = tag._content);        
        return data;
    }

    async collectPhotos(req, res) {
        let collected = await this.aggregateData();
        console.debug("collecting photo information for "+collected.length+ "items");
        collected.forEach(async (data, key) => {
            collected[key] = await this.collectPhotoInfo(data);
        });
        let data = JSON.stringify(collected); 
        fs.writeFileSync('public/data/images.json', data);
        console.log("photo collection ("+collected.length+" items, "+data.length+" bytes) finished. ")
    }

    async collectPhotoSets(req, res) {
        let collect = ['id', {'title': 'title._content'}, {'description': 'description._content'}, 'photos', {'url': 'url._content'}];
        let collected = await this.aggregateData('photosets.getList','photosets','photoset',{});
        let pending = collected.length;
        const polling = function (change = 0) {
            pending +=change;
            return pending;
        }
        collected.forEach(async (photoset, i) => {
            photoset.photos = await this.aggregateData('photosets.getPhotos','photoset','photo',{photoset_id: photoset.id});
            photoset.photos.forEach(async (photo, photoNum) => {
                photoset.photos[photoNum] = await this.collectPhotoInfo(photo);
            });
            collected[i] = this.condenseData(photoset, collect);
            await this.sleep();
            polling(-1);
        });
        while (polling() > 0) {
            console.log("pending tasks: "+polling());
            await this.sleep();
        }
        
        let data = JSON.stringify(collected);
        console.log("photoset collection ("+collected.length+" items, "+data.length+" bytes) finished. ")
        fs.writeFileSync('public/data/albums.json', data);    
    }    

}

module.exports = FlickrExtractor;