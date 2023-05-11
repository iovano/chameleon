import { readFileSync } from 'fs';

export default class ContentFaker {
    static use(req, res, next) {
        if (!res.headersSent) {
            let tokens = req.path.split('/');
            if (req.path === '/' || tokens[1] === 'album') {
                let album = getAlbumByProperty(req.query.album || decodeURI(tokens[2]));
                let photo = getAlbumPhotoByProperty(album, req.query.image || decodeURI(tokens[3]));
                let fileContents = readFileSync(`./public/index.html`, 'utf8');
                fileContents = fileContents.replace('<!-- :SSR_SPA_HEAD: -->', createHeader(album, photo));
                fileContents = fileContents.replace('<!-- :SSR_SPA_BODY: -->', createContent(album, photo));    
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
    return (string instanceof String || typeof string === 'string') ? string.replace(/[ \/]{1,}/gi,'-') : '';
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
function createContent(album = undefined, photo = undefined) {
    let html = '<h1>' + meta.title + '</h1>';
    if (album) {
        html += '<h2>' + album.title + '</h2> \n';
        html += '<p>' + (album.description || '') + '</p> \n';
        html += '<p>' + (album.primary || '') + '</p> \n';
    }
    if (photo) {
        html += '<h3>' + photo.title + '</h3> \n';
        html += '<p>' + (photo.description || '') + '</p> \n';
        html += '<img src="' + photo.size[photo.media][2] + '"> \n';
        html += '<h4>Photo Tags</h4> \n';
        html += '<ul><li>' + photo.tags.join('</li> \n<li>') + '</li></ul> \n';
        html += '<h4>Exif Data</h4> \n';
        html += createExifTable(photo);
    }
    if (album) {
        html += '<h3>More Photos in this Album</h3> \n';
        for (let p = 0; p < album.photos.length ; p++) {
            let photo = album.photos[p];
            html += '<h3>' + photo.title + '</h3> \n'
            html += '<a href="'+ getCanonicalURL(album,photo) +'">'+ photo.title +'</a> \n';
            html += photo.size ? '<img src="' + photo.size[photo.media][2] + '"> \n' : '';
            html += photo.description ? ('<p>' + photo.description + '</p> \n') : '';
        }
    }
    html += '<h3>More Albums'+(album?.author ? ' from ' + album.author : '')+'</h3> \n';
    html += '<ul>';
    for (let a = 0 ; a < albums.length ; a ++) {
        let album = albums[a];
        let primary = getPrimaryImage(album);
        if (primary) {
            let src = primary.size?.[primary.media]?.[2]; 
            html += '<li><a href="'+ getCanonicalURL(album) +'">'+ album.title +'</a>'+ (src ? '<img src="'+src+'">' : '') + '</li> \n';    
        }
    }    
    html += '</ul>';
    return html;
}
function createExifTable(photo) {
    let html = '<table>';
    html += '<tr><td>Camera</td><td>' + photo.camera + '</td></tr>'
    for (let [key, value] of Object.entries(photo.exif)) {
        html += '<tr><td>' + key + '</td><td>' + value + '</td></tr> \n';
    }
    html += '</table>';
    return html;
}
function getPrimaryImage(album) {
    let id = album.primary;
    for (let i = 0; i < album.photos.length; i++) {
        if (album.photos[i].id === id) {
            return album.photos[i];
        }
    }
}
function getCanonicalURL(album = undefined, photo = undefined) {
    return album ? ('/album/' + album?.title + (photo ? '/' + photo?.title : '')) : '/';
}
function createHeader(album = undefined, photo = undefined) {
    let url = getCanonicalURL(album, photo);
    let head = '';
    head += '<title>' + meta.title + (album ? album.title + meta.delimiter : '') + (photo ? photo.title : '') + '</title>';
    head += '<meta property="og:title" content="' + (album?.title || '') + ': ' + (photo?.title || '') + '"> \n';
    head += '<meta property="twitter:title" content="' + (album?.title || '') + ': ' + (photo?.title || '') + '"> \n';
    head += '<meta property="og:url" content="' + url + '"> \n';
    head += '<meta name="twitter:description" content="' + (album?.description || '') + ' ' + (photo?.description || '') + '"> \n';
    if (photo) {
        head += '<meta name="keywords" content="' + photo.tags + '"> \n';
        head += '<meta property="og:image" content="' + photo.size[photo.media][3] + '"> \n';
        head += '<meta name="twitter:card" content="' + photo.size[photo.media][4] + '">';
        head += '<meta name="twitter:image" content="' + photo.size[photo.media][3] + '">';
    }
    return head;
}


