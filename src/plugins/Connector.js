export default class Connector {
    consumerKey;
    consumerSecret;
    accessToken;
    accessTokenSecret;
    userId;

    constructor(consumerKey = undefined, consumerSecret = undefined, accessToken = undefined, accessTokenSecret = undefined, userId = undefined) {
        this.setCredentials(consumerKey, consumerSecret, accessToken, accessTokenSecret, userId)
    }
    setCredentials(consumerKey = undefined, consumerSecret = undefined, accessToken = undefined, accessTokenSecret = undefined, userId = undefined) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
        this.accessToken = accessToken;
        this.accessTokenSecret = accessTokenSecret;
        this.setUserId(userId);
    }
    setUserId(uid) {
        this.userId = uid;
    }
}