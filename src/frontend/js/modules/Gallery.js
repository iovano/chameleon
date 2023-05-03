import AlbumStrip from '../elements/AlbumStrip.js';

import css from '../../css/gallery.css' assert { type: 'css' };
import infobox from '../../css/infobox.css' assert { type: 'css' };

import TagsUL from '../elements/TagsUL.js';
import Dispatcher from '../classes/Dispatcher.js';
import DragonSwipe from '../classes/DragonSwipe.js';

//document.adoptedStyleSheets.push(css);

export default class Gallery extends HTMLElement {
    /* namespaces */
    svgNS = "http://www.w3.org/2000/svg";

    meta = {title: "Chameleon | Image Gallery", delimiter: " | "}

    /* USER SETTINGS */
    preferences = {
        breakTimeDuration: 10, /* slideshow duration in seconds */
        userIdleTimeDuration: 7.5, /* slideshow will not continue before user idle Time exceeds this threshold */
        transitionDuration: 2,
        showCursorDuration: 10, /* hide the mouse cursor after x seconds */
        filters : {safety: ["0","1"]}, /* filter NSFW- (adult-) content. 0 = safe for work content, 1 = moderate adult content, 2 = explicit content */
        width: undefined,
        height: undefined,
        direction: "random",
        fps: 20,
        shuffle: true,
        pauseMode: "smooth",
        videoStyle: {marginLeft: 'auto', objectFit: 'cover', position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', top: 0, left: 0, alignment: {x: 0.5, y: 0.5 /* 0 = left, 0.5 = center, 1 = right */}},
        videoLayerStyle: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0)'},
        imgStyle: {marginLeft: 'auto', marginRight: 'auto', objectFit: 'contain', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, alignment: {x: 0.5, y: 0.5 /* 0 = left, 0.5 = center, 1 = right */}},
        imgLayerStyle: {opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,1)'},
        changeAlbumOnImageNumOverflow: true /* specifies how to treat exceeding image index: select previous/next album (true) or start over at the other end of the current album (false) */
    };
    
    /* transition variables */
    transitionFrame = 0;
    breakTimeFrame = 0;
    totalFrames = 0;
    suspended = false; /* "suspend" prevents premature state changes during transitions or while images are loading */

    /* internal control variables */
    afterTransition = undefined; /* function */
    workload = 0; /* calculates the current workload */ 
    timer = [Date.now()];
    keysPressed = []
    paused = false; /* user pause state */
    userIdleTime = 0;
    pureMode = false;
    firstRun = true;
    userMove = {};

    /* gallery image storage */
    albums = [];
    img = [];
    imageLayersMax = 2;
    imageContainer;
    previousImage = undefined;
    currentImageNum = 0;
    currentAlbumNum = 0;

    /* canvas elements */
    canvasContainer = undefined;
    canvas = undefined;
    mask = undefined;
    imageInfoBox = undefined;
    filmStrip = undefined;

    /* Event Listeners */
    dispatcher = undefined;
    listeners = {document: ['MouseMove', 'KeyUp', 'KeyDown'], window: ['Resize', ['orientationchange', 'Resize'], 'Offline', 'Online']};

    /* overlays */
    overlays = {
        imageInfoBox: {autostart: 2.5, duration: 5, idleEnd: true, idleMax: 5, pauseHide: true},
        filmStrip: {autostart: false, idleEnd: true, idleMax: 5, pauseHide: true}
    };


    constructor(albums = undefined, preferences = undefined) {
        super();
        if (albums) {
            this.setAlbums(albums);
        }
        if (preferences) {
            this.setPreferences(preferences);
        }
        this.dispatcher = new Dispatcher(this, this.listeners);
        this.dispatcher.fire('Resize');
    }
    get(key, defaultValue = undefined) { /* outsource to Preferences class */
        if (this.preferences[key] === undefined) {
            console.warn('preference "'+key+'" not found');
        }
        return this.preferences[key] || defaultValue;
    }
    read(query) { /* outsource to Preferences class */ 
        let tokens = query.split('.');
        let payload = this.preferences;
        for (let token of tokens) {
            payload = payload?.[token];
        }
        return payload;
    }
    set(key, value) { /* outsource to Preferences class */
        const setProperty = (obj, path, value) => {
            const [head, ...rest] = path.split('.')
            return {
                ...obj,
                [head]: rest.length
                    ? setProperty(obj[head], rest.join('.'), value)
                    : value
            }
        }
        console.log(key,value);
        this.preferences = setProperty(this.preferences, key, value);
    }
    setPreferences(preferences, merge = true) { /* outsource to Preferences class */
        if (merge && this.preferences) {
            this.preferences = {...this.preferences, ...preferences};
        } else {
            this.preferences = preferences;
        }
    }
    getPreferences(flat = false) { /* outsource to Preferences class */
        if (flat) {
            function isScalar(v) {
                return (!isNaN(v) || (v instanceof String || typeof v === 'string'));
            }
        
            function flatten(settings, collected = {}, tokens = []) {
              for (const [key, value] of Object.entries(settings)) {
                let t = tokens.concat(key)
                if (Array.isArray(value) && value.some(isScalar)) {
                    collected[t.join(".")] = value;      
                } else if (value instanceof Object) {
                  flatten(value, collected, tokens.concat(key))
                } else {
                    collected[t.join(".")] = value;      
                }
                    }
              return collected;
            }
            return flatten(this.preferences);
        } else {
            return this.preferences;
        }
    }
    destroy() {
        this.removeChild(this.canvasContainer);
        this.dispatcher.destroy();
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
    dispatchEvent(eventName, event) {
        this.dispatcher.fire(eventName, event);
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
        this.suspended = true; /* hold transition ignition until media has been loaded */
        this.transitionFrame = undefined; /* reset transitionFrame counter */
        this.breakTimeFrame = 0; /* reset slide show duration counter */
        this.currentDirection = (this.get('direction') === 'random' ? Math.random() * 360 : this.get('direction'));
        this.updateClipPathTransition();
        this.showImage(this.getCurrentImage(), this.getImageSrc(this.getCurrentImage()));
        this.dispatchEvent("TransitionStart");
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
    getImageSrc(img, size = 0, media = undefined) {
        if (typeof img === 'string' || img instanceof String) { 
            return img;
        }
        media = media ?? img?.media;
        try {
            return img?.src || img?.size[media][size];
        } catch (error) {
            console.log("image #"+(img.id || img.title)+" does not provide src/sizes", error, img);
        }
    }
    setCurrentImageNum(newIndex) {
        if (this.get('changeAlbumOnImageNumOverflow')) {
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
    setMetaData(metaData) {
        this.meta = {...this.meta, ...metaData};
    }

    init(params = undefined, resize = true) {
        if (resize === true || !this.get('width') && !this.get('height')) {
            this.dispatchEvent('Resize');
        }
        if (this.canvasContainer) {
            /* remove existing canvasContainer first */
            this.removeChild(this.canvasContainer);
        }
        this.createCanvasContainer();
        this.createInfoBox();
        this.createFilmStrip(true);
        this.navigate(params || this.currentImageNum);
        this.swiper = new DragonSwipe();
        this.swiper.onEvent = (eventName, ...args) => {
            this.dispatchEvent(eventName, ...args);
        }
    
    }
    updateOverlays() {
        for(let key of Object.keys(this.overlays)) {
            let os = this.overlays[key];
            if (!this.pureMode && !this.transitionFrame  && !this.suspended && ((os.autostart > 0 && this.breakTimeFrame === os.autostart * this.get('fps')) || (this.breakTimeFrame > 0 && os.idleEnd === true && this.userIdleTime === 0))) {
                this[key].classList.remove('hide');
            } else if (this.pureMode || ((os.idleMax * this.get('fps') === this.userIdleTime) && (!os.duration || this.breakTimeFrame > os.duration * this.get('fps')))) {
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
        if (this.breakTimeFrame > this.get('breakTimeDuration') * this.get('fps') && this.userIdleTime > this.get('userIdleTimeDuration') * this.get('fps') && !this.suspended) {
            this.navigate("+1");
        }

    }
    updateClipPathTransition() {
        if (this.transitionFrame > this.get('transitionDuration') * this.get('fps')) {
            this.dispatchEvent("TransitionEnd");
        } else if (this.transitionFrame) {
            let transitionProgress =  1 / this.get('transitionDuration') / this.get('fps');
            for (let i = 0; i < this.img.length; i++) {
                let img = this.img[i];
                if (img.style.opacity < 1) {
                    img.style.opacity = parseFloat(img.style.opacity) + transitionProgress;
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
        if (this.userIdleTime === this.get('showCursorDuration') * this.get('fps')) {
            document.body.style.cursor = 'none';
        }
        this.totalFrames ++;
        requestAnimationFrame(() => this.run());
//      this.dispatchEvent('EnterFrame', this.transitionFrame, this.totalFrames);
//        setTimeout(() => this.run(), 1000 / this.get('fps'));    
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
    applyFilters(albums = undefined, filters = undefined) {
        albums = albums || this.loadedAlbums || this.albums;
        filters = filters || this.get('filters');
        let filteredAlbums = [];
        for (let a = 0; a < albums.length ; a++) {
            let filteredAlbum = {...albums[a]};
            filteredAlbum.photos = [];
            for (let p = 0; p < albums[a].photos.length; p++) {
                let photo = albums[a].photos[p];
                if (this.get('filters')?.safety.indexOf(photo.safety) !== -1) {
                    filteredAlbum.photos.push(photo);
                }
            }
            if (filteredAlbum.photos.length > 0) {
                filteredAlbums.push(filteredAlbum);
            }
        }
        this.albums = filteredAlbums;
    }
    resetFilters() {
        this.albums = this.loadedAlbums;
    }
    setAlbums(albums) {
        this.loadedAlbums = albums;
        this.applyFilters(albums);
    }
    getImageSlot(index = undefined) {
        return document.getElementById("imageSlot" + (index !== undefined ? index : (this.albumslots.length - 1)));
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
                this.userIdleTime = this.infoBoxDuration * this.get('fps') - 1;
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
    _onMouseEnd(mouse) {
        if (mouse.y2 > 0 && mouse.x2 > 0 && mouse.dt > 50 && mouse.dt < 4000) {
            if (mouse.dx > 50) {
                this.navigate("-1","+0");
            } else if (mouse.dx < -50) {
                this.navigate("+1","+0");
            }
            if (mouse.dy> 50) {
                this.navigate("+0","-1");
            } else if (mouse.dy < -50) {
                this.navigate("+0","+1");
            }

        }
    }
    _onLastTouch(touch) {
        if (touch.y2 > 0 && touch.x2 > 0 && touch.dt > 50 && touch.dt < 4000) {
            if (touch.dx > 50) {
                this.navigate("-1","+0");
            } else if (touch.dx < -50) {
                this.navigate("+1","+0");
            }
            if (touch.dy > 50) {
                this.navigate("+0","-1");
            } else if (touch.dy < -50) {
                this.navigate("+0","+1");
            }
        }
    }
    _onTouchStart(event) {
        this.dispatchEvent('IdleEnd');
    }
    _onScroll(event) {
        this.dispatchEvent('IdleEnd');
    }
    _onPureStart() {
        this.pureMode = true;
    }
    _onPureEnd() {
        this.pureMode = false;
        this.dispatchEvent('IdleEnd');
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
        this.set('width', this.clientWidth || this.width || document.clientWidth || 800);
        this.set('height', this.clientHeight || this.height || document.clientHeight || 600);
        this.canvas?.setAttribute("viewBox", "0 0 " + this.get('width') + " " + this.get('height'));
        console.debug("canvas size: " + (this.get('width') + "x" + this.get('height')) + " fullscreen: "+this.isFullscreen());
        let iSlot = this.getImageSlot(1);
        if (iSlot) {
            iSlot.background.setAttributeNS(null, 'width', this.get('width'));
            iSlot.background.setAttributeNS(null, 'height', this.get('height'));    
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
        if (this.suspended) {
            this.suspended = false;
            this.transitionFrame = 0;    
        }
    }
    _onVideoStart(event) {
        console.log("video started");
        if (this.suspended) {
            this.suspended = false;
            this.transitionFrame = 0;    
        }
    }
    setProps(element, props) {
        for (let a of Object.keys(props)) {
            let value = props[a];
            element[a] = value;
        }
    }
    showMessage(message) {
        /* TODO: make this an overlay dialogue */
        console.error(message);
    }
    createMediaElement(cImage = undefined) {
        cImage = cImage ?? this.getCurrentImage();
        let img;
        if (cImage.media === 'video') {
            img = document.createElement('video');
            img.addEventListener('loadeddata', (event) => this.dispatchEvent('VideoLoad', event));
            img.addEventListener('play', (event) => this.dispatchEvent('VideoStart', event));
            img.setAttribute('autoplay', '');
            img.setAttribute('muted', '');
            img.setAttribute('loop','');
            img.src = this.getImageSrc(cImage,1);
            this.setProps(img.style,this.get('videoStyle'));
        } else {
            img = document.createElement('img');
            img.addEventListener('load', (event) => this.dispatchEvent('ImageLoad', event));
            img.src = this.getImageSrc(cImage);
            this.setProps(img.style,this.get('imgStyle'));
        }
        img.addEventListener("error", (event) => this.dispatchEvent('Error', event));
        return img;
    }
    showImage() {
        let imgLayer = document.createElement('div');
        let media = this.createMediaElement();
        imgLayer.appendChild(media);
        this.setProps(imgLayer.style,this.get(media instanceof HTMLVideoElement ? 'videoLayerStyle' : 'imgLayerStyle'));
        this.addImageLayer(imgLayer);
    }
    addImageLayer(imgLayer) {
        this.img.unshift(imgLayer);
        this.setProps(imgLayer.style.zIndex, this.img.length+1);
        this.imageContainer.insertBefore(imgLayer, this.imageContainer.firstChild);
        for (let idx = this.imageLayersMax; idx < this.imageContainer.children.length ; idx++) {
            this.imageContainer.removeChild(this.imageContainer.children[idx]);
            this.img.pop();
        }
    }
    createCanvasContainer(canvasElement = 'div') {
        this.canvasContainer = document.createElement(canvasElement);
        this.appendChild(this.canvasContainer);
        this.setProps(this.canvasContainer.style, {width: '100%', height: '100%', position: 'absolute'})
        this.canvasContainer.setAttribute('class', 'canvasContainer');
        this.imageContainer = document.createElement('div');
        this.imageContainer.setAttribute('class', 'imageContainer');
        this.canvasContainer.appendChild(this.imageContainer);
    }    

    createFilmStrip(forceRecreation = false) {
        if (!this.filmstrip || forceRecreation) {
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
customElements.define('chameleon-gallery', Gallery);
