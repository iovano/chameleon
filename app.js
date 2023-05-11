import express from 'express';
import FlickrConnector from './src/plugins/flickr/FlickrConnector.js';
import path from 'path';
import { fileURLToPath } from 'url';
import ContentFaker from './src/ContentFaker.js';

const app = express();
const FC = new FlickrConnector();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

FC.onAuthentication = function (accessToken, accessTokenSecret) {
  FC.writeCredentialsToFile('.env.local');
}


app.use(express.static('./public', { followSymlinks: true, root: __dirname, extensions: ['html', 'htm'] }))
app.use(express.static('/app/public'))
app.use(ContentFaker.use);

app.get('/auth', (req, res) => FC.authenticate(req, res));
app.get('/callback', (req, res) => FC.callback(req, res));
app.get('/me', (req, res) => FC.me(req, res));

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