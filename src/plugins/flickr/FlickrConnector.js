import Flickr from 'flickr-sdk';
import https from 'https';
import Connector from '../Connector.js';
import Consoler from '../../Consoler.js';
import dotenv from 'dotenv';

export default class FlickrConnector extends Connector {
    requestTokenSecret;
    flickr;
    flickrAuth;
    constructor(consumerKey = undefined, consumerSecret = undefined, accessToken = undefined, accessTokenSecret = undefined, userId = undefined) {
        super(consumerKey, consumerSecret, accessToken, accessTokenSecret, userId);
        if (!consumerKey || !consumerSecret) {
            this.getCredentialsFromDotEnv();
        }
        this.init();
        this.consoler = new Consoler(8);
    }
    log(message, line = undefined, payload = undefined) {
        this.consoler.log(message, line, payload);
    }
    error(message, line = undefined, payload = undefined) {
        this.consoler.error(message, line, payload);
    }

    setUserId(uid) {
        this.userId = uid;
    }
    getUserId() {
        return this.userId;
    }
    getCredentialsFromDotEnv(filename = ".env.local") {
        dotenv.config();
        dotenv.config({ path: filename, override: true });
        this.setCredentials(process.env.FLICKR_CONSUMER_KEY, process.env.FLICKR_CONSUMER_SECRET, process.env.FLICKR_ACCESS_TOKEN, process.env.FLICKR_ACCESS_TOKEN_SECRET, process.env.FLICKR_USER_ID);
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
    async writeCredentialsToFile(filename = '.env.local') {
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
        fs.writeFile(filename, fileContent);        
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

    async getPhotoSizes(data, fieldName = 'size', amount = undefined) {
        let response = await this.flickr._('GET', 'flickr.photos.getSizes', {user_id: this.userId, photo_id: data.id});
        let preferences = {
            photo: ['Original', 'Large 1600', 'Large', 'Medium 800', 'Medium 640', 'Medium', 'Small 400', 'Square'],
            video: ['Video Original', '1080p', '720p', '360p']
        };
        let sizes = response.body.sizes.size;
        data[fieldName] = {};
//        data['oSize'] = sizes;
        for (let media of Object.keys(preferences)) {
            let catSizes = preferences[media]; 
            for (let i = 0 ; i < catSizes.length ; i ++) {
                for (let s = 0 ; s < sizes.length ; s ++) {
                    if (sizes[s].label === catSizes[i] && (!amount || data.files.length < amount)) {
                        if (!Array.isArray(data[fieldName][media])) {
                            data[fieldName][media] = [];
                        }
                        data[fieldName][media].push(sizes[s].source);
                    }
                }
            }
        }
        return data;
    }
    async getPhotoURL(photoId, size = 0) {
        const photo = await this.getPhotoSizes({id: photoId});
        return photo.size[size];
    }

    async getPhotosetItems(data) {
        return await this.collectPhotoInfo('flickr.photosets.getInfo',data,{user_id: this.userId, photoset_id: 'id'});
    }

    /* express API endpoints */

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

}
