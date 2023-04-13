const express = require('express');

const FlickrConnector = require('./FlickrConnector');

const app = express();
const FC = new FlickrConnector();

FC.onAuthentication = function (accessToken, accessTokenSecret) {
  FC.writeCredentialsToFile('.env.local');
}

app.get('/', function(req, res){
    res.sendFile('/app/public/index.html');
});

app.use(express.static('/app/public'))

app.get('/auth', (req, res) => FC.authenticate(req, res));
app.get('/callback', (req, res) => FC.callback(req, res));
app.get('/me', (req, res) => FC.me(req, res));

/* TODO: run these heavy tasks from the command line instead
app.get('/collect/photos', (req, res) => FC.collectPhotos(req, res));
app.get('/collect', (req, res) => FC.collectPhotoSets(req, res));
app.get('/download/:photoId/:size?', (req, res) => FC.downloadPhoto(req, res));
*/

app.get('/image/:photoId/:size?', (req, res) => FC.showPhoto(req, res));
app.get('/cover/:albumId/:size?', (req, res) => FC.showAlbumCover(req, res));

app.get('/flickr/:endpoint', (req, res) => FC.endpoint(req, res));


app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});

function errorHandler (err, req, res, next) {
  if (res.headersSent) {
    return next({ error: err.code, request: req })
  }
  res.status(500)
  res.render('error', { error: err.code, request: req })
}