import FilmStrip from './FilmStrip.js';

export default class AlbumStrip extends FilmStrip {
    albums = undefined;
    selectedAlbumNum = undefined;
    constructor(albums = undefined, selectedImageNum = undefined, selectedAlbumNum = undefined) {
        super(undefined, undefined, selectedImageNum);
        this.setAlbums(albums);
        this.selectedAlbumNum = selectedAlbumNum;
        this.selectedImageNum = selectedImageNum;
        this.render();
    }
    setAlbums(albums) {
        this.albums = albums;
    }
    select(imageNum = undefined, albumNum = undefined) {
        if (albumNum !== this.selectedAlbumNum) {
            this.selectedAlbumNum = albumNum;
            this.render();
        }
        super.select(imageNum);
    }
    getAlbum(albumNum) {
        if (albumNum === undefined) {
            albumNum = this.selectedAlbumNum;
        }
        return this.albums?.[albumNum];

    }
    _onSelectImage(event, selectedImage, selectedImageNum) {
        if (selectedImage.photoset !== undefined) {
            /* selection from album overview */
            this.select(selectedImage.titleImageNum, selectedImage.photoset);
        } else {
            /* selection from within a set */
            this.select(selectedImageNum, this.selectedAlbumNum);
        }
        if (this.onSelectImage) {
            this.onSelectImage(event, this.selectedImageNum, this.selectedAlbumNum);
        }
    }    
    _onSelectTab(event, tab, tabNum) {
        if (tabNum === 0) {
            this.select(undefined, undefined);
        }
    }
    updateTabs() {
        let album = this.getAlbum();
        let tabs = [{name: 'Albums', title: 'Browse existing albums'}];
        if (album) {
            tabs.push({name: album.title, class: 'currentAlbum', title: (album.description || album.title)});
            let photo = album.photos?.[this.selectedImageNum];
            if (photo) {
                tabs.push({name: photo.title, class: 'currentImage', title: (photo.description || photo.title)});
            }
        }
        this.setTabs(tabs);
        super.updateTabs();
    }
    render() {
        let album = this.getAlbum();
        if (album) {
            if (this.images !== album.photos) {
                this.images = album.photos;
            }    
        } else if (this.albums) {
            /* show album selection page if no album is selected */
            this.images = this.getAlbumTitleImages();
            console.log("album overview", this.images);
        }
        if (this.images) {
            super.render();    
        } else {
            console.error("AlbumStrip: No available Images to render");
        }
    }
    getAlbumList() {
        let albums = [];
        for (let i = 0; i < this.albums.length ; i ++) {
            let album = this.albums[i];
            for (let p = 0; p < album.photos.length ; p ++) {
                if (album.photos[p].id === album.primary) {
                    album.titleImage = album.photos[p];
                    album.titleImageNum = p;
                }
            }
            albums.push(album);
        }
        return albums;
    }
    getAlbumTitleImages() {
        let albums = this.getAlbumList();
        let images = [];
        for (let i = 0; i < albums.length ; i++) {
            let img = albums[i].titleImage;
            img.photoset = i;
            img.photosetTitle = albums[i].title;
            img.titleImageNum = albums[i].titleImageNum;
            images.push(img);
        }
        return images;
    }
}
customElements.define('album-strip',AlbumStrip);