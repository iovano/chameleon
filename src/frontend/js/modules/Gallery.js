import AlbumStrip from '../elements/AlbumStrip.js';

import css from '../../css/gallery.css' assert { type: 'css' };
import styles from '../../css/default.css' assert { type: 'css' };
import infobox from '../../css/infobox.css' assert { type: 'css' };

import TagsUL from '../elements/TagsUL.js';

//document.adoptedStyleSheets.push(css);

class Gallery {
    /* namespaces */
    svgNS = "http://www.w3.org/2000/svg";

    meta = {title: "Chameleon | Image Gallery", delimiter: " | "}

    /* USER SETTINGS */
    breakTimeDuration = 10; /* slideshow duration in seconds */
    userIdleTimeDuration = 7.5; /* slideshow will not continue before user idle Time exceeds this threshold */
    transitionDuration = 2;
    showCursorDuration = 10; /* hide the mouse cursor after x seconds */
    width = undefined;
    height = undefined;
    lazyLoad = false;
    afterTransition = undefined; /* function */
    direction = "random";
    fps = 20;
    pauseMode = "smooth";

    imgStyle = {marginLeft: 'auto', marginRight: 'auto', objectFit: 'contain', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, alignment: {x: 0.5, y: 0.5 /* 0 = left, 0.5 = center, 1 = right */}};
    imgLayerStyle = {opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,1)'};

    alignImages = { x: 0.5, y: 0.5 }; // 0 = left, 0.5 = center, 1 = right
    changeAlbumOnImageNumOverflow = true /* specifies how to treat exceeding image index: select previous/next album (true) or start over at the other end of the current album (false) */

    /* transition variables */
    transitionFrame = 0;
    breakTimeFrame = 0;
    totalFrames = 0;
    suspended = false; /* "suspend" prevents premature state changes during transitions or while images are loading */

    /* internal control variables */
    currentFPS = Array.isArray(this.fps) ? this.fps[0] : this.fps;
    workload = 0; /* calculates the current workload */ 
    timer = [Date.now()];
    keysPressed = []
    paused = false; /* user pause state */
    userIdleTime = 0;
    pureMode = false;
    firstRun = true;

    /* gallery image storage */
    albums = [];
    img = [];
    imageLayersMax = 3;
    imageContainer;
    previousImage = undefined;
    currentImageNum = 0;
    currentAlbumNum = 0;

    /* canvas elements */
    target = undefined;
    canvasContainer = undefined;
    canvas = undefined;
    mask = undefined;
    imageInfoBox = undefined;
    filmStrip = undefined;

    /* overlays */
    overlays = {
        imageInfoBox: {autostart: 2.5, duration: 5, idleEnd: true, idleMax: 5, pauseHide: true},
        filmStrip: {autostart: false, idleEnd: true, idleMax: 5, pauseHide: true}
    };


    constructor(targetObject, images = undefined, width = undefined, height = undefined) {
        if (images) {
            this.setImages(images);
        }
        if (width !== undefined) {
            this.width = width;
        }
        if (height !== undefined) {
            this.height = height;
        }
        this.target = targetObject;
        this.addEventListeners();
        this.dispatchEvent('Resize');
    }
    destroy() {
        this.target.removeChild(this.canvasContainer);
        this.removeEventListeners();
        this.target = undefined;
        this.run = undefined;
    }
    requestFullscreen(clickableElement, fullscreenTarget) {
        //fullscreenTarget = document.getElementById('gallery');
        clickableElement.addEventListener('click', function() {
          let result;
          if (!document.fullscreenElement) {
                if (fullscreenTarget.requestFullscreen) {
                    result = fullscreenTarget.requestFullscreen(fullscreenTarget);
                } else if (fullscreenTarget.mozRequestFullScreen) { // Firefox
                    result = fullscreenTarget.mozRequestFullScreen(fullscreenTarget);
                } else if (fullscreenTarget.webkitRequestFullscreen) { // Chrome, Safari and Opera
                    result = fullscreenTarget.webkitRequestFullscreen(fullscreenTarget);
                } else if (fullscreenTarget.msRequestFullscreen) { // IE/Edge
                    result = fullscreenTarget.msRequestFullscreen(fullscreenTarget);
                }
            } else {
                document.exitFullscreen();
            }
        });
        addEventListener("fullscreenchange", (event) => {this.dispatchEvent('FullscreenChange', event)});
    }
    
    isFullscreen() {
        return (window.fullScreen) || (window.innerWidth == screen.width && window.innerHeight == screen.height);
    }
    removeEventListeners() {
        document.removeEventListener('mousemove', (event) => this.dispatchEvent('MouseMove', event));
        document.removeEventListener('keyup', (event) => this.dispatchEvent('KeyUp', event));
        document.removeEventListener('keydown', (event) => this.dispatchEvent('KeyDown', event));
        window.removeEventListener('resize', (event) => this.dispatchEvent('Resize', event));
        window.removeEventListener("orientationchange", (event) => this.dispatchEvent('Resize', event));
        window.removeEventListener("offline", (event) => this.dispatchEvent('Offline', event));
        window.removeEventListener("online", (event) => this.dispatchEvent('Online', event));    
    }

    addEventListeners() {
        document.addEventListener('mousemove', (event) => this.dispatchEvent('MouseMove', event));
        document.addEventListener('keyup', (event) => this.dispatchEvent('KeyUp', event));
        document.addEventListener('keydown', (event) => this.dispatchEvent('KeyDown', event));
        window.addEventListener('resize', (event) => this.dispatchEvent('Resize', event));
        window.addEventListener("orientationchange", (event) => this.dispatchEvent('Resize', event));
        window.addEventListener("offline", (event) => this.dispatchEvent('Offline', event));
        window.addEventListener("online", (event) => this.dispatchEvent('Online', event));    
    }
    navigate(targetImage = "+1", targetAlbum = "+0") {
        if (this.isPaused()) {
            this.dispatchEvent("PauseEnd");
        }
        if (typeof targetImage === 'object' || targetImage === undefined) {
            if (targetImage.album) {
                /* select album first (this is important if queried image exists in more than one album) */
                this.setCurrentAlbumNum(this.getAlbumNumByPropertyValue(targetImage.album));
            }
            if (targetImage.image) {
                let target = this.getImageNumByPropertyValue(targetImage.image);
                if (target) {
                    this.setCurrentAlbumNum(target.album);
                    this.setCurrentImageNum(target.image);
                }
            }
        } else {
            /* use delta if target contains a signed value (e.g. "+1" or "-10"), use absolute value if target is unsigned or increase by 1 if target is undefined */
            if (targetAlbum !== undefined) {
                this.setCurrentAlbumNum(parseInt(targetAlbum) + ((typeof targetAlbum === 'string' || targetAlbum instanceof String) && ["+", "-"].indexOf((targetAlbum || 0).substring(0, 1) !== -1) ? this.getCurrentAlbumNum() : 0));
            }
            if (targetImage !== undefined) {
                this.setCurrentImageNum(parseInt(targetImage) + ((typeof targetImage === 'string' || targetImage instanceof String) && ["+", "-"].indexOf((targetImage || 0).substring(0, 1) !== -1) ? this.getCurrentImageNum() : 0));
            }
        }
        let albumName = this.getAlbum()?.title || this.getAlbum()?.name;
        let imageName = this.getCurrentImage()?.title || this.getCurrentImage()?.name;
        document.title = this.meta.title + this.meta.delimiter + albumName + this.meta.delimiter + imageName;
        if (!this.isFullscreen()) {
            /* window location change does not have any effect in fullscreen mode */
            const url = new URL(window.location);
            url.searchParams.set('album', albumName);
            url.searchParams.set('image', imageName);
            history.pushState({}, "", url);    
        }

        if (this.firstRun) {
            /* first image -- jump to the end of a transition */
            this.transitionFrame = undefined;
            this.firstRun = false;
            this.suspended = true;
        } 
        if (this.transitionFrame === undefined) {
            this.startTransition();
        } else {
            this.afterTransition = this.startTransition;
        }    
        this.filmStrip.select(this.currentImageNum, this.currentAlbumNum);
        this.dispatchEvent("Navigation", { target: this.currentImageNum });
    }
    startTransition() {
        this.suspended = true;
        this.transitionFrame = undefined;
        this.breakTimeFrame = 0;
        this.currentDirection = (this.direction === 'random' ? Math.random() * 360 : this.direction);
        this.updateClipPathTransition();
        this.dispatchEvent("TransitionStart");
        this.showImage();
    }
    getCurrentImage() {
        return this.getAlbumImages()[this.currentImageNum];
    }
    getImage(idx) {
        return this.getAlbumImages()[idx];
    }
    setCurrentAlbumNum(albumNum, imageNum = undefined) {
        if (albumNum !== undefined && albumNum !== this.currentAlbumNum) {
            this.currentAlbumNum = (albumNum % this.albums.length) < 0 ? (albumNum % this.albums.length) + this.albums.length : albumNum % this.albums.length;
            this.updateFilmStrip();
        }
        if (imageNum !== undefined && imageNum !== this.currentImageNum) {
            this.setCurrentImageNum(imageNum);
        }
        return this.currentAlbumNum;
    }
    getAlbum(index = undefined) {
        return this.albums[index || this.currentAlbumNum];
    }
    getAlbumInfo(index = undefined) {
        let info = { ...this.albums[index || this.currentAlbumNum] };
        delete info.images;
        return info;
    }
    getCurrentAlbumNum() {
        return this.currentAlbumNum;
    }
    getAlbumImages(index = undefined) {
        return this.albums[index || this.currentAlbumNum]?.photos || this.albums?.photos || this.photos || this.albums[index || this.currentAlbumNum]?.images || this.albums?.images || this.albums;
    }
    getImageSrc(img, size = 0) {
        if (typeof img === 'string' || img instanceof String) { 
            return img;
        }
        try {
            return img?.src || img?.size[size];
        } catch (error) {
            console.log("image #"+(img.id || img.title)+" does not provide src/sizes", error, img);
        }
    }
    setCurrentImageNum(newIndex) {
        if (this.changeAlbumOnImageNumOverflow) {
            if (newIndex >= this.getAlbumImages().length) {
                this.setCurrentAlbumNum(this.getCurrentAlbumNum()+1);
                newIndex = 0;
            } else if (newIndex < 0) {
                this.setCurrentAlbumNum(this.getCurrentAlbumNum()-1);
            }
        }
        let images = this.getAlbumImages();
        /* set currentImage and normalize its value (i.e. make sure it is positive and within range of existing image amount) */
        return this.currentImageNum = ((newIndex % images.length) < 0 ? (newIndex % images.length) + images.length : newIndex % images.length) || 0;
    }
    getCurrentImageNum() {
        return this.currentImageNum;
    }
    setWidth(width) {
        this.width = width;
    }
    setHeight(height) {
        this.height = height;
    }
    setMetaData(metaData) {
        this.meta = {...this.meta, ...metaData};
    }

    init(params = undefined, resize = true) {
        if (resize === true || !this.width && !this.height) {
            this.dispatchEvent('Resize');
        }
        if (this.canvasContainer) {
            /* remove existing canvasContainer first */
            this.target.removeChild(this.canvasContainer);
        }
        this.createCanvas();
        this.createInfoBox();
        this.createFilmStrip();
        this.navigate(params || this.currentImageNum);
    }
    updateOverlays() {
        for(let key of Object.keys(this.overlays)) {
            let os = this.overlays[key];
            if (!this.pureMode && !this.transitionFrame  && !this.suspended && ((os.autostart > 0 && this.breakTimeFrame === os.autostart * this.fps) || (this.breakTimeFrame > 0 && os.idleEnd === true && this.userIdleTime === 0))) {
                this[key].classList.remove('hide');
            } else if (this.pureMode || ((os.idleMax * this.fps === this.userIdleTime) && (!os.duration || this.breakTimeFrame > os.duration * this.fps))) {
                this[key].classList.add('hide');
            }
        }
    }
    update() {
        //this.img[0].firstChild.style.transform;

        this.userIdleTime++;
        if (this.userIdleTime % 20 === 0) {
            this.dispatchEvent('Idle', this.userIdleTime);
        }
        if (!this.isPaused()) {
            if (this.transitionFrame !== undefined) {
                this.transitionFrame ++;
                this.breakTimeFrame = 0;
            } else if (!this.suspended) {
                this.breakTimeFrame ++;
            }
            this.updateClipPathTransition();    
        }
        if (this.breakTimeFrame > this.breakTimeDuration * this.fps && this.userIdleTime > this.userIdleTimeDuration * this.fps && !this.suspended) {
            this.navigate("+1");
        }

    }
    updateClipPathTransition() {
        if (this.transitionFrame > this.transitionDuration * this.fps) {
            this.dispatchEvent("TransitionEnd");
        } else if (this.transitionFrame) {
            for (let i = 0; i < this.img.length; i++) {
                let img = this.img[i];
                if (img.style.opacity < 1) {
                    img.style.opacity = parseFloat(img.style.opacity) + (1 / this.transitionDuration / this.fps);
                }
                img.style.zIndex = this.img.length - i;
            }
        }
    }
    updateFilmStrip() {
        this.filmStrip.setImages(this.getAlbumImages());
        this.filmStrip.setInfo(this.getAlbumInfo());
        this.filmStrip.render();
    }
    run() {
        if (this.isPaused()) {
            this.paused ++;
            this.dispatchEvent('Paused', this.paused);
        }
        this.updateOverlays();
        this.update();
        if (this.userIdleTime === this.showCursorDuration * this.fps) {
            document.body.style.cursor = 'none';
        }
        this.totalFrames ++;
//      this.dispatchEvent('EnterFrame', this.transitionFrame, this.totalFrames);
        setTimeout(() => this.run(), 1000 / this.fps);    
    }
    getImageNumByPropertyValue(imageName, props = ['id', 'title', 'name'], preferredAlbum = undefined) {
        if (typeof props === 'string' || props instanceof String) {
            props = [props];
        }
        preferredAlbum = preferredAlbum ?? this.getCurrentAlbumNum();
        for (let a = -1; a < this.albums.length; a++) {
            let album = (a === -1 ? preferredAlbum : a);
            if (a === undefined) continue;
            let photos = this.albums[album].photos || this.albums[album].images;
            for (let i = 0; i < photos.length ; i ++) {
                let photo = photos[i];
                for (let keyIndex of props.values()) {
                    if (photo[keyIndex] == imageName) {
                        return {album: album, image: i};
                    }
                }
            }
        }
        console.error('image ' + imageName +' not found');
    }
    getAlbumNumByPropertyValue(albumName, props = ['id', 'title', 'name']) {
        if (typeof props === 'string' || props instanceof String) {
            props = [props];
        }
        for (let i = 0; i < this.albums.length; i++) {
            for (let keyIndex of props.values()) {
                if (this.albums[i][keyIndex] == albumName) {
                    return i;
                }
            }
        }
        console.error('album ' + albumName +' not found');
        

    }
    async loadData(filename = './data/albums.json') {
        return fetch(filename)
            .then(response => response.json())
            .catch(error => {
                this.dispatchEvent('Error', undefined, error);
            });
    }
    setImages(images, lazyLoad = undefined) {
        if (lazyLoad !== undefined) {
            this.lazyLoad = lazyLoad;
        }
        this.albums = images;
    }
    getImageSlot(index = undefined) {
        return document.getElementById("imageSlot" + (index !== undefined ? index : (this.albumslots.length - 1)));
    }
    dispatchEvent(eventName, ...args) {
        let callbackName = 'on'+eventName;
        let internalCallbackName = '_on'+eventName;
        if (typeof this.onEvent === 'function') {
            this.onEvent(eventName, ...args);
        }

        if (typeof this[internalCallbackName] === 'function') {
            this[internalCallbackName](...args);
        }
        if (typeof this[callbackName] === 'function') {
            this[callbackName](...args);
        }
    }
    isPaused() {
        return this.paused > 0;
    }
    setPaused(value = undefined) {
        if (value === undefined) {
            value = !this.paused;
        }
        if (value === true) {
            if (this.transitionFrame && !this.isPaused()) {
                this.afterTransition = () => this.dispatchEvent("PauseStart");
                this.userIdleTime = this.infoBoxDuration * this.fps - 1;
            } else {
                this.dispatchEvent("PauseStart");
            }    
        } else {
            this.dispatchEvent("PauseEnd");
        }
        return value;
    }
    _onFullscreenChange(event) {
        if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
            /* does not work. TODO: figure out what causes fullscreen mode to exit in the first place */
            event.preventDefault();
        }
    }
    _onScroll(event) {
        this._onIdleEnd();
    }
    _onPureStart() {
        this.pureMode = true;
    }
    _onPureEnd() {
        this.pureMode = false;
        this._onIdleEnd();
    }
    /* internal event listeners */
    _onKeyUp(event) {
        if (event.key === 'Escape') {
            if (this.pureMode) {
                this.dispatchEvent('PureEnd');
            } else {
                this.dispatchEvent('PureStart');
            }
            /* escape key can be used to toggle pure mode */
        } else if (event.key === ' ') {
            this.setPaused();
        } else if (this.keysPressed.indexOf('Shift') === -1) {
            /* Shift key can be used for "silent" navigation, i.e. with muted controls */
            this.dispatchEvent('IdleEnd', this.userIdleTime);
        }
        switch (event.key) {
            case 'ArrowRight': this.navigate('+1'); break;
            case 'ArrowLeft': this.navigate('-1'); break;
            case 'ArrowUp': this.navigate(0, '-1'); break;
            case 'ArrowDown': this.navigate(0, '+1'); break;
        }
        if (this.keysPressed.indexOf(event.key) !== -1) {
            this.keysPressed.splice(this.keysPressed.indexOf(event.key), 1);
        }        
    }
    _onPauseEnd() {
        this.paused = 0;
    }
    _onPauseStart() {
        this.paused = 1;
        if (this.overlays.imageInfoBox.pauseHide) {
            this.imageInfoBox?.classList.add('hide');
        }
        if (this.overlays.filmStrip.pauseHide) {
            this.filmStrip?.classList.add('hide');
        }

    }
    _onResize(event) {
        this.width = this.target.clientWidth || this.target.width || document.clientWidth || 800;
        this.height = this.target.clientHeight || this.target.height || document.clientHeight || 600;
        this.canvas?.setAttribute("viewBox", "0 0 " + this.width + " " + this.height);
        console.debug("canvas size: " + (this.width + "x" + this.height) + " fullscreen: "+this.isFullscreen());
        let iSlot = this.getImageSlot(1);
        if (iSlot) {
            iSlot.background.setAttributeNS(null, 'width', this.width);
            iSlot.background.setAttributeNS(null, 'height', this.height);    
        }
    }
    _onIdleEnd() {
        if (this.userIdleTime > 0) {
            this.userIdleTime = 0;
            document.body.style.cursor = 'auto';    
        }
    }
    _onMouseMove() {
        this.dispatchEvent('IdleEnd', this.userIdleTime );
        this.userIdleTime = 0;
    }
    _onTransitionStart() {
        this.imageInfoBox.classList.add('hide');
    }
    _onTransitionEnd() {
        this.showImageInfo();
        this.transitionFrame = undefined;
        this.breakTimeFrame = 0;
        this.suspended = false;
        if (this.paused) {
            this.setPaused(true);
        }
        if (this.afterTransition) {
            this.afterTransition();
            this.afterTransition = undefined;
        }
    }
    _onError(event) {
        this.showMessage("An error occurred", event);
        console.error(event);
    }
    _onOnline(event){
        this.navigate("+0","+0");
    }
    _onOffline(event){
        console.log("offline", event);
    }
    _onImageLoad(event) {
        this.suspended = false;
        this.transitionFrame = 0;
    }
    set(element, props) {
        for (let a of Object.keys(props)) {
            let value = props[a];
            element[a] = value;
        }
    }
    showImage() {
        let imgLayer = document.createElement('div');
        let img = document.createElement('img');
        img.src = this.getImageSrc(this.getCurrentImage());
        img.addEventListener("error", (event) => this.dispatchEvent('Error', event));
        this.set(img.style,this.imgStyle);
        this.img.unshift(imgLayer);
        this.set(imgLayer.style,this.imgLayerStyle);
        this.set(imgLayer.style.zIndex, this.img.length+1);
        imgLayer.appendChild(img);
        this.suspended = true;
        this.transitionFrame = undefined;
        img.onload = (event) => this._onImageLoad();
        this.imageContainer.insertBefore(imgLayer, this.imageContainer.firstChild);
        for (let idx = this.imageLayersMax; idx < this.imageContainer.children.length ; idx++) {
            this.imageContainer.removeChild(this.imageContainer.children[idx]);
            this.img.pop();
        }
    }
    createCanvas() {
        console.log("creating canvas");
        this.canvasContainer = document.createElement('div');
        this.target.appendChild(this.canvasContainer);
        this.set(this.canvasContainer.style, {width: '100%', height: '100%', position: 'absolute'})
        this.canvasContainer.setAttribute('class', 'canvasContainer');
        this.imageContainer = document.createElement('div');
        this.canvasContainer.appendChild(this.imageContainer);
    
    }    

    createFilmStrip() {
        if (!this.filmstrip) {
            /* create and append film strip */
            this.filmStrip = new AlbumStrip(this.albums, this.currentImageNum, this.currentAlbumNum);
            this.filmStrip.classList.add('filmStrip', 'hide');
            this.filmStrip.onSelectImage = (event, selectedImageNum, selectedAlbumNum) => { 
                this.navigate(selectedImageNum, selectedAlbumNum); 
            }
        }
        this.canvasContainer.appendChild(this.filmStrip);
    }
    createInfoBox() {
        if (!this.imageInfoBox) {
            /* create and append infoBox Overlay */
            let infobox = document.createElement("div");
            infobox.classList.add('infoBox', 'hide');
            infobox.onclick = (event) => {infobox.classList.toggle('minified')};
            this.imageInfoBox = infobox;
        }
        this.canvasContainer.appendChild(this.imageInfoBox);

    }

    showImageInfo(forceShow = false) {
        if (this.afterTransition && !forceShow) {
            return;
        }
        let el = this.imageInfoBox;
        if (forceShow) el.classList.remove('hide');
        let list = this.getCurrentImage();
        if (typeof list === 'string' || list instanceof String || Object.keys(list).length === 0) {
            let div = document.createElement('div');
            div.classList.add('noInfo');
            div.innerHTML = "No Information available";
            el.replaceChildren(div);
        } else {
            list = { ...this.getCurrentImage() };
            delete list?.src;
            let gearUL, exifUL;
            if (list.camera) {
                let gearList = {
                    camera: list.camera,
                    lens: list.exif?.LensModel || list?.Lens
                }    
                gearUL = new TagsUL(gearList);
                gearUL.classList.add('imageExif');  
            }
            if (list.exif) {
                let exifList = {
                    exposure: list.exif?.ExposureTime,
                    aperture: list.exif?.FNumber,
                    focus: list.exif?.FocalLength,
                    iso: list.exif?.ISO
                }
                if (list.exif?.Flash) {
                    if (list.exif?.Flash.substring(0,2).toLowerCase() === 'on') {
                        exifList.flash = 'on';
                    } else {
                        exifList.noflash = 'off';
                    }
                }
                exifUL = new TagsUL(exifList);
                exifUL.classList.add('imageExif');
            }

            let infoList = {
                title: list.title,
                album: this.getAlbum().title,
                description: list.description, 
                location: list.location, 
                tags: list.tags, 
                date: list.dates?.taken, 
                posted: list.dates?.posted,
                gear: gearUL,
                exif: exifUL
            }
            
            let infoUL = new TagsUL(infoList);
            infoUL.classList.add('imageInfo');
            el.replaceChildren(infoUL);
        }
    }

}
export default Gallery;