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

app.get('/flickr/:endpoint', (req, res) => FC.endpoint(req, res));

app.get('/image/:photoId/:size?', (req, res) => FC.showPhoto(req, res));

app.get('/download/:photoId/:size?', (req, res) => FC.downloadPhoto(req, res));

app.get('/cover/:albumId/:size?', (req, res) => FC.showAlbumCover(req, res));

app.get('/:method', (req, res) => {
    try {
      FC[req.params.method](req, res)
    } catch (error) {
      console.log("User tried to call method '"+req.params.method+"' which does not exist.")
      res.json({code: 404, message: "The endpoint '"+req.params.method+"' does not exist"});
    }
  }
);

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});

function errorHandler (err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }
  res.status(500)
  res.render('error', { error: err })
}