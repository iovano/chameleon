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
        if (albumNum !== undefined && albumNum !== this.selectedAlbumNum) {
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
    updateTabs() {
        let album = this.getAlbum();
        let tabs = [
            {name: 'Albums', title: 'Browse existing albums'},
            {name: album.title, class: 'currentAlbum', title: (album.description || album.title)}
        ];
        let photo = album.photos?.[this.selectedImageNum];
        if (photo) {
            tabs.push(
            {name: photo.title, class: 'currentImage', title: (photo.description || photo.title)}                    
            );
        }
        this.setTabs(tabs);
        super.updateTabs();
    }
    render() {
        let album = this.getAlbum();
        if (album) {
            if (this.images !== album.photos) {
                this.images = album.photos;
                super.render();    
            }    
        }
    }
}
customElements.define('album-strip',AlbumStrip);