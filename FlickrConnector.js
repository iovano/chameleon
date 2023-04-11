const Flickr = require('flickr-sdk');
const fs = require('fs');
const https = require('https'); 

class FlickrConnector {
    consumerKey;
    consumerSecret;
    accessToken;
    accessTokenSecret;
    userId;
    requestTokenSecret;
    flickr;
    flickrAuth;
    retries = 3;
    retryDelay = 2000;
    requestDelay = 200;
    constructor(consumerKey = undefined, consumerSecret = undefined, accessToken = undefined, accessTokenSecret = undefined, userId = undefined) {
        this.setCredentials(consumerKey, consumerSecret, accessToken, accessTokenSecret, userId)
        if (!consumerKey || !consumerSecret) {
            this.getCredentialsFromDotEnv();
        }
        this.init();
    }
    setUserId(uid) {
        this.userId = uid;
    }
    getUserId() {
        return this.userId;
    }
    getCredentialsFromDotEnv(filename = ".env.local") {
        const dotenv = require('dotenv');
        dotenv.config();
        dotenv.config({ path: filename, override: true });
        this.setCredentials(process.env.FLICKR_CONSUMER_KEY, process.env.FLICKR_CONSUMER_SECRET, process.env.FLICKR_ACCESS_TOKEN, process.env.FLICKR_ACCESS_TOKEN_SECRET, process.env.FLICKR_USER_ID);
    }
    setCredentials(consumerKey = undefined, consumerSecret = undefined, accessToken = undefined, accessTokenSecret = undefined, userId = undefined) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
        this.accessToken = accessToken;
        this.accessTokenSecret = accessTokenSecret;
        this.userId = userId;
    }
    init() {
        this.flickrAuth = new Flickr.OAuth(this.consumerKey, this.consumerSecret, this.accessToken, this.accessTokenSecret);
        if (this.accessToken && this.accessTokenSecret) {
            this.flickr = new Flickr(this.flickrAuth.plugin(this.accessToken, this.accessTokenSecret));
            console.debug("flickr connector initialized and ready for authenticated requests.");            
        } else {
            this.flickr = new Flickr(this.consumerKey, this.consumerSecret);
            console.debug("flickr connector initialized. authentication required.");
        }
    }
    writeCredentialsToFile(filename = '.env.local') {
        let envVars = {
          FLICKR_CONSUMER_KEY: this.consumerKey,
          FLICKR_CONSUMER_SECRET: this.consumerSecret,
          FLICKR_ACCESS_TOKEN: this.accessToken, 
          FLICKR_ACCESS_TOKEN_SECRET: this.accessTokenSecret,
          FLICKR_USER_ID: this.userId
        };
        let fileContent = '';
        for (let key in envVars) {
          if (envVars[key]) {
            fileContent += key+' = "'+envVars[key]+'"\n';
          }
        }
        fs.writeFileSync(filename, fileContent);        
    }
    initAuthenticatedFlickr(accessToken = undefined, accessTokenSecret = undefined, userId = undefined) {
        this.accessToken = accessToken || this.accessToken;
        this.accessTokenSecret = accessTokenSecret || this.accessTokenSecret;
        userId = userId || this.userId;
        this.userId = userId || this.userId;
        this.flickr = new Flickr(Flickr.OAuth.createPlugin(this.consumerKey, this.consumerSecret, this.accessToken, this.accessTokenSecret, this.userId));
        if (this.onAuthentication) {
            this.onAuthentication(this.accessToken, this.accessTokenSecret, this.userId);
        }
    }
    async sleep(ms = this.requestDelay) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    async authenticate(req, res) {
        this.flickrAuth.request('http://localhost:3000/callback').then((response) => {
            this.requestTokenSecret = response.body.oauth_token_secret;
            const redirectUrl = this.flickrAuth.authorizeUrl(response.body.oauth_token, 'read');
            res.redirect(redirectUrl);
        });
    }
    async callback(req, res) {
        const { oauth_verifier: verifier, oauth_token: token } = req.query;
        const accessToken = await this.flickrAuth.verify(token, verifier, this.requestTokenSecret);

        this.initAuthenticatedFlickr(accessToken.body.oauth_token, accessToken.body.oauth_token_secret, accessToken.body.user_nsid);
        this.me(req, res);
    }
    async endpoint(req, res) {
        const query = {...req.query};
        const endpoint = req.params.endpoint;
        try {
            const response = await this.flickr._('GET', 'flickr.'+endpoint, query);;
            res.json(response.body);
        } catch (error) {
            console.error("/"+endpoint+": #"+error.code+" "+error.stat);
            res.json(error);
        }        
    }
    async me(req, res) {
        let query = {...{user_id: this.userId || 'me'}, ...req.query};
        try {
            const response = await this.flickr.people.getPhotos(query);
            if (response.body.photos) {
                res.json(response.body);
            }
        } catch (error) {
            console.error("/me: #"+error.code+" "+error.stat);
            res.json(error);
        }
    }
    async aggregateData(endpoint, rootNode, dataNode, query = {}, callback = undefined, collect = undefined) {
        query = {...{user_id: this.userId || 'me'}, ...query};
        let response = await this.flickr._('GET', 'flickr.'+endpoint, query);

        let collection = response.body[rootNode];
        let pages = collection.pages;
        let page = collection.page;
        let collected = [];
        console.log("flickr."+endpoint+": aggregating data"+(pages > 1 ? " ["+pages+" pages]" : ""), query);
        while (page <= pages) {
            let items = collection;
            for (let i in items[dataNode]) {
                let data = items[dataNode][i];
                if (collect) {
                    let agg = {}
                    for (let key in collect) {
                        agg[collect[key]] = data[collect[key]]?._content ?? data[collect[key]];
                        if (agg[collect[key]] === '') {
                            delete agg[collect[key]];
                        }
                    }    
                    data = agg;
                }
                if (callback) {
                    callback(data);
                }
                collected.push(data);
            }
            page ++;
            query[page] = page;
            response = await this.flickr._('GET', 'flickr.'+endpoint, query);
            await this.sleep();
        }
        return collected;                                              
    }
    async collectPhotoInfo (endpoint, data, query, attempt = 1) {
        let q = {}
        for (var key in query) {
            q[key] = data[query[key]];
        }
        try {
            let response = await this.flickr._('GET', endpoint, q);
            await this.sleep(this.requestDelay);
            data = {...data, ...response.body.photo};
        } catch (error) {
            if (attempt <= this.retries) {
                console.warn('request to "'+endpoint+'" failed (attempt '+attempt+'/'+this.retries+')', q);
                await this.sleep(this.retryDelay);
                await this.collectPhotoInfo(endpoint, data, query, attempt + 1);
            } else {
                console.error('Maximum retrials ('+this.retries+') to "'+endpoint+'" reached. Skipping dataset!', q);
            }
        }
    }
    buildPhotoUris(photos, attributeName = 'thumb', sizeSuffix = 't') {
        for (let i=0; i< photos.length; i++) {
            let item = photos[i];
            photos[i][attributeName] = 'https://live.staticflickr.com/'+item.server+'/'+item.id+'_'+item.secret+'_'+sizeSuffix+'.jpg';
        }
    }

    async collectPhotos(req, res) {
        let collect = ['id', 'title', 'description', 'server', 'secret'];
        let collected = await this.aggregateData('people.getPhotos','photos','photo',{},(data) => this.getPhotoInfo(data),collect);
        this.buildPhotoUris(collected);
        let data = JSON.stringify(collected); 
        fs.writeFileSync('public/data/images.json', data);
        res.json(collected);
    }

    async getPhotoInfo(data) {
        await this.collectPhotoInfo('flickr.photos.getInfo',data,{photo_id: 'id'});
        return data;
    }
    async getPhotoSizes(data, fieldName = 'size', amount = undefined) {
        let response = await this.flickr._('GET', 'flickr.photos.getSizes', {user_id: this.userId, photo_id: data.id});
        let preferences = ['Original', 'Large 1600', 'Large', 'Medium 800', 'Medium 640', 'Medium', 'Small 400', 'Square'];
        let sizes = response.body.sizes.size;
        data[fieldName] = [];
        for (let i = 0 ; i < preferences.length ; i ++) {
            for (let s = 0 ; s < sizes.length ; s ++) {
                if (sizes[s].label === preferences[i] && (!amount || data.files.length < amount)) {
                    data[fieldName].push(sizes[s].source);
                }
            }
        }
        return data;
    }
    async getPhotosetItems(data) {
        return await this.collectPhotoInfo('flickr.photosets.getInfo',data,{user_id: this.userId, photoset_id: 'id'});
    }

    async collectPhotoSets(req, res) {
        let collect = ['id', 'title', 'description', 'photos', 'url'];
        let collected = await this.aggregateData('photosets.getList','photosets','photoset',{},(data) => this.getPhotosetItems(data),collect);
        for (let i=0; i< collected.length; i++) {
            let item = collected[i];
            collected[i].photos = await this.aggregateData('photosets.getPhotos','photoset','photo',{photoset_id: item.id},(data) => {this.getPhotoInfo(data);this.getPhotoSizes(data);});
            this.buildPhotoUris(collected[i].photos);
            await this.sleep();
        }
        let data = JSON.stringify(collected);
        fs.writeFileSync('public/data/albums.json', data);
        res.json(collected);
    }
    async getPhotoURL(photoId, size = 0) {
        const photo = await this.getPhotoSizes({id: photoId});
        return photo.size[size];
    }
    async showPhoto(req, res) {
        let photoId = req.params.photoId;
        let size = req.params.size || 0;
        let url = await this.getPhotoSizes({id: photoId});
        url = url['size'][size];
        if (!url) {
            return res.json('invalid image size');
        }
        const request = https.get(url, function(response) {
            response.pipe(res);
            }
        );
    }
    async showAlbumCover(req, res) {
        let id = req.params.albumId;
        let size = req.params.size;
        let response = await this.flickr.photosets.getInfo({photoset_id: id, user_id: this.userId});
        this.showPhoto({params: {size: size, photoId: response.body.photoset.primary}}, res);
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
}

module.exports = FlickrConnector;
