import { readFileSync } from 'fs';

export default class ContentFaker {
    static use(req, res, next) {
        if (!res.headersSent) {
            let tokens = req.path.split('/');
            if (req.path === '/' || tokens[1] === 'album') {
                let album = getAlbumByProperty(req.query.album || decodeURI(tokens[2]));
                let photo = getAlbumPhotoByProperty(album, req.query.image || decodeURI(tokens[3]));
                req.query = {album: album.title, image: photo.title};
                let fileContents = readFileSync(`./public/index.html`, 'utf8');
                fileContents = fileContents.replace('<!-- :SSR_SPA_HEAD: -->', createHeaderFromAlbumPhoto(album, photo));
                fileContents = fileContents.replace('<!-- :SSR_SPA_BODY: -->', createContentFromAlbumPhoto(album, photo));
                res.set('Content-Type', 'text/html')
                res.send(fileContents);
                res.end();
            } else {
                next();
            }
        }
    }
}

const albums = JSON.parse(readFileSync(`./public/data/albums.json`));
const meta = JSON.parse(readFileSync(`./public/data/meta.json`));

function sanitize(string) {
    return string.replace(/[ \/]{1,}/gi,'-');
}

function getAlbumByProperty(value, prop = 'title') {
    for (let i = 0; i < albums.length; i++) {
        if (albums[i][prop] === value || sanitize(albums[i][prop]) === value) {
            return albums[i];
        }
    }
}
function getAlbumPhotoByProperty(album, value, prop = 'title') {
    for (let i = 0; i < album?.photos.length; i++) {
        if (album.photos[i][prop] === value || sanitize(album.photos[i][prop]) === value) {
            return album.photos[i];
        }
    }
}
function createContentFromAlbumPhoto(album, photo) {
    if (album && photo) {
        let html = '<h1>' + album.title + '</h1> \n';
        html += '<h2>' + photo.title + '</h2> \n';
        html += '<p>' + (album.description || '') + '</p> \n';
        html += '<p>' + (photo.description || '') + '</p> \n';
        html += '<img src="' + photo.size[photo.media][2] + '"> \n';
        html += '<h3>Photo Tags</h3>';
        html += '<ul><li>' + photo.tags.join('</li><li>') + '</li></ul> \n';
        html += '<h3>Exif Data</h3>';
        html += '<table>';
        html += '<tr><td>Camera</td><td>' + photo.camera + '</td></tr>'
        for (let [key, value] of Object.entries(photo.exif)) {
            html += '<tr><td>' + key + '</td><td>' + value + '</td></tr> \n';
        }
        html += '</table>';
        return html;
    }
    return '';
}
function createHeaderFromAlbumPhoto(album, photo) {
    if (album && photo) {
        let url = 'http://photo.kodal.de/album/' + album.title + '/' + photo.title;
        let head = '<meta name="keywords" content="' + photo.tags + '"> \n';
        head += '<meta property="og:title" content="' + album.title + ': ' + photo.title + '"> \n';
        head += '<meta property="og:image" content="' + photo.size[photo.media][3] + '"> \n';
        head += '<meta property="og:url" content="' + url + '"> \n';
        head += '<meta name="twitter:card" content="' + photo.size[photo.media][4] + '">';
        head += '<meta name="twitter:title" content="' + album.title + ': ' + photo.title + '"> \n';
        head += '<meta name="twitter:description" content="' + (album.description || '') + ' ' + (photo.description || '') + '"> \n';
        head += '<meta name="twitter:image" content="' + photo.size[photo.media][3] + '">';
        return head;
    }
    return '';
}


