import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import Consoler from './Consoler.js';

let albums;
let meta;
const template = './src/frontend/index.html';
const distTarget = './public/';

export default class ContentFaker {
    static loadData() {
        if (!albums) {
            albums = JSON.parse(readFileSync(`./public/data/albums.json`));
        }
        if (!meta) {
            meta = JSON.parse(readFileSync(`./public/data/meta.json`));        
        }
    }
    static use(req, res, next) {
        ContentFaker.loadData();
        console.log("use ContentFaker");
        if (!res.headersSent) {
            let tokens = req.path.split('/');
            if (req.path === '/' || tokens[1] === 'album') {
                let album = getAlbumByProperty(req.query.album || decodeURI(tokens[2]));
                let photo = getAlbumPhotoByProperty(album, req.query.image || decodeURI(tokens[3]));
                let fileContents = ContentFaker.generate(album, photo);
                res.set('Content-Type', 'text/html')
                res.send(fileContents);
                res.end();
            } else {
                next();
            }
        }
    }
    static generate(album = undefined, photo = undefined) {
        let fileContents = readFileSync(template, 'utf8');
        fileContents = fileContents.replace('<!-- :SSR_SPA_HEAD: -->', createHeader(album, photo));
        fileContents = fileContents.replace('<!-- :SSR_SPA_BODY: -->', createContent(album, photo));
        return fileContents;
    }
    static all() {
        ContentFaker.loadData();
        let consoler = new Consoler(4);
        consoler.log("initializing server side renderer", 3);  
        mkdirSync(distTarget, {recursive: true});     
        writeFileSync(distTarget + 'index.html', ContentFaker.generate());
        rmSync(distTarget + "album/", {recursive: true, force: true});
        let photos = 0;
        for (let i = 0; i < albums.length ; i++) {
            let album = albums[i];
            consoler.log("Render: " + album.title, 0);
            consoler.log("Albums: " + consoler.progressBar(i + 1, albums.length), 1);
            let path = distTarget + "album/" + sanitize(album.title);
            mkdirSync(path, {recursive: true});      
            writeFileSync(path + '.html', ContentFaker.generate(album));
            for (let p = 0; p < album.photos.length ; p ++) {
                photos ++;
                consoler.log("Photos: " + consoler.progressBar(p + 1, album.photos.length), 2);
                let photo = album.photos[p];
                writeFileSync(path + "/" + sanitize(photo.title) +'.html', ContentFaker.generate(album, photo));
            }
        }
        consoler.log("Finish: Static html files for " + Consoler.FgGreen + albums.length + " albums" + Consoler.Reset + " and " + Consoler.FgGreen + photos + " photos" + Consoler.Reset + " rendered.", 0);
        consoler.success("[ done ]", 3);  

    }
}

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
        let primary = getPrimaryImage(album);
        html += '<h2>' + album.title + '</h2> \n';
        html += '<p>' + (album.description || '') + '</p> \n';
        html += '<a href="'+ getCanonicalURL(album) +'">' + (primary ? ('<img src="' + (primary.size?.[primary.media]?.[2] || '') + '"> \n') : '') + "</a>"; 
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
            html += photo.size ? '<img src="' + photo.size[photo.media][1] + '"> \n' : '';
            html += photo.description ? ('<p>' + photo.description + '</p> \n') : '';
        }
    }
    html += '<h3>More Albums'+(album?.author ? ' from ' + album.author : '')+'</h3> \n';
    html += '<ul>';
    for (let a = 0 ; a < albums.length ; a ++) {
        let album = albums[a];
        let primary = getPrimaryImage(album);
        if (primary) {
            let src = primary.size?.[primary.media]?.[1]; 
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
    return album ? ('/album/' + sanitize(album?.title) + (photo ? '/' + sanitize(photo?.title) : '')) : '/';
}
function createHeader(album = undefined, photo = undefined) {
    let url = getCanonicalURL(album, photo);
    let head = '';
    let d = meta.delimiter || ' | ';
    head += '<title>' + meta.title + (album ? d + album.title : '') + (photo ? d + photo.title : '') + '</title>';
    head += '<meta property="og:title" content="' + (album?.title || '') + ': ' + (photo?.title || '') + '"> \n';
    head += '<meta property="twitter:title" content="' + (album?.title || '') + ': ' + (photo?.title || '') + '"> \n';
    head += '<meta property="og:url" content="' + url + '"> \n';
    head += '<meta name="twitter:description" content="' + (album?.description || '') + ' ' + (photo?.description || '') + '"> \n';
    if (photo) {
        head += '<meta name="keywords" content="' + photo.tags + '"> \n';
        head += '<meta property="og:image" content="' + photo.size[photo.media][1] + '"> \n';
        head += '<meta name="twitter:card" content="' + photo.size[photo.media][4] + '">';
        head += '<meta name="twitter:image" content="' + photo.size[photo.media][1] + '">';
    }
    return head;
}


