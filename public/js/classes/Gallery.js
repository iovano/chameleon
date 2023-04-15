import FilmStrip from './FilmStrip.js';

//import css from '../../css/gallery.css' assert { type: 'css' }; /* this currently does not work (chrome v101, safari, ...) */
import TagsUL from './TagsUL.js';
//document.adoptedStyleSheets.push(css);
class Gallery {
    /* namespaces */
    svgNS = "http://www.w3.org/2000/svg";

    meta = {title: "Chameleon | Image Gallery", delimiter: " | "}

    /* gallery settings */
    duration = 200; /* slideshow duration in frames */
    transitionDuration = 20;
    width = undefined;
    height = undefined;
    lazyLoad = false;
    suspended = false;
    waitForTransitionEnd = false;
    direction = "random";
    alignImages = { x: 0.5, y: 0.5 }; // 0 = left, 0.5 = center, 1 = right
    fps = [20,50]; /* canvas update frequency (frames per second) min/max (depending on client gpu) */
    infoBoxInertia = 1500; /* infobox inertia in milliseconds */
    infoBoxDuration = 150; /* infobox duration in frames */
    changeAlbumOnImageNumOverflow = true /* specifies how to treat exceeding image index: select previous/next album (true) or start over at the other end of the current album (false) */

    /* transition variables */
    idleTime = undefined;
    frame = 0;

    /* internal control variables */
    keysPressed = []
    currentFPS = Array.isArray(this.fps) ? this.fps[0] : this.fps;
    workload = 0; /* calculates the current workload */ 
    timer = [Date.now()];

    /* gallery image storage */
    images = [];
    loadedImages = [];
    previousImage = undefined;
    currentImageNum = 0;
    currentAlbumNum = 0;

    /* canvas elements */
    canvas = undefined;
    mask = undefined;
    canvasContainer = undefined;
    imageInfoBox = undefined;
    filmStrip = undefined;

    constructor(canvas, images = undefined, width = undefined, height = undefined) {
        if (images) {
            this.setImages(images);
        }
        if (width !== undefined) {
            this.width = width;
        }
        if (height !== undefined) {
            this.height = height;
        }
        this.canvas = canvas;
    }
    destroy() {
        this.canvas.removeChild(this.canvasContainer);
        this.canvas = undefined;
        this.run = undefined;
    }
    navigate(targetImage = "+1", targetAlbum = "+0") {
        if (typeof targetImage === 'object' || targetImage === undefined) {
            if (targetImage.album) {
                /* select album first (this is important if queried image exists in more than one album) */
                this.setCurrentAlbumNum(this.getAlbumNumByName(targetImage.album));
            }
            if (targetImage.image) {
                let target = this.getImageNumByName(targetImage.image);
                if (target) {
                    this.setCurrentAlbumNum(target.album);
                    this.setCurrentImageNum(target.image);
                }
            }
        } else {
            /* use delta if target contains a signed value (e.g. "+1" or "-10"), use absolute value if target is unsigned or increase by 1 if target is undefined */
            this.setCurrentAlbumNum(parseInt(targetAlbum) + ((typeof targetAlbum === 'string' || targetAlbum instanceof String) && ["+", "-"].indexOf((targetAlbum || 0).substring(0, 1) !== -1) ? this.getCurrentAlbumNum() : 0));
            this.setCurrentImageNum(parseInt(targetImage) + ((typeof targetImage === 'string' || targetImage instanceof String) && ["+", "-"].indexOf((targetImage || 0).substring(0, 1) !== -1) ? this.getCurrentImageNum() : 0));
        }
        const url = new URL(window.location);
        let albumName = this.getAlbum()?.title || this.getAlbum()?.name;
        let imageName = this.getCurrentImage()?.title || this.getCurrentImage()?.name;
        url.searchParams.set('album', albumName);
        url.searchParams.set('image', imageName);
        history.pushState({}, "", url);
        document.title = this.meta.title + this.meta.delimiter + albumName + this.meta.delimiter + imageName;

        this.imageInfoBox.classList.add('hide');
        if (this.idleTime > 0) {
            this.startTransition();
        } else {
            this.waitForTransitionEnd = true;
        }
        this.filmStrip.select(this.currentImageNum);
    }
    startTransition() {
        this.dispatchEvent("onNavigation", { target: this.currentIamgeNum });
        this.suspended = true;
        this.frame = 0;
        this.idleTime = undefined;
        this.currentDirection = (this.direction === 'random' ? Math.random() * 360 : this.direction);
        this.updateClipPathTransition();
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
            this.currentAlbumNum = (albumNum % this.images.length) < 0 ? (albumNum % this.images.length) + this.images.length : albumNum % this.images.length;
            this.updateFilmStrip();
        }
        if (imageNum !== undefined && imageNum !== this.currentImageNum) {
            this.setCurrentImageNum(imageNum);
        }
        return this.currentAlbumNum;
    }
    getAlbum(index = undefined) {
        return this.images[index || this.currentAlbumNum];
    }
    getAlbumInfo(index = undefined) {
        let info = { ...this.images[index || this.currentAlbumNum] };
        delete info.images;
        return info;
    }
    getCurrentAlbumNum() {
        return this.currentAlbumNum;
    }
    getAlbumImages(index = undefined) {
        return this.images[index || this.currentAlbumNum]?.photos || this.images?.photos || this.photos || this.images[index || this.currentAlbumNum]?.images || this.images?.images || this.images;
    }
    getImageSrc(img, size = 0) {
        if (typeof img === 'string' || img instanceof String) { 
            return img;
        }
        try {
            return img?.src || img?.size[size];
        } catch (error) {
            console.log("image #"+(img.id || img.title)+" does not provide src/sizes", error);
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
            this.width = this.canvas.clientWidth || this.canvas.width || document.clientWidth || 800;
            this.height = this.canvas.clientHeight || this.canvas.height || document.clientHeight || 600;
        }
        console.debug("canvas size: " + (this.width + "x" + this.height));
        if (this.canvasContainer) {
            /* remove existing canvasContainer first */
            this.canvas.removeChild(this.canvasContainer);
        }
        document.addEventListener('mousemove', (event) => this._onMouseMove(event));
        document.addEventListener('keyup', (event) => this._onKeyUp(event));
        document.addEventListener('keydown', (event) => this._onKeyDown(event));
        this.createCanvas();
        this.navigate(params || this.currentImageNum);
    }
    update() {
        if (!this.suspended) {
            this.frame++;
            if (this.idleTime !== undefined) this.idleTime++;
        }
        this.updateClipPathTransition();
        if (this.idleTime > 0) {
            this._onIdle();
        }
        if (this.idleTime === (this.infoBoxDuration)) {
            this.imageInfoBox.classList.add('hide');
        }
        if (this.idleTime > this.duration && !this.suspended) {
            this.navigate("+1");
        }
    }
    updateClipPathTransition() {
        if (this.suspended && this.frame !== 0) {
            document.getElementById('imageGroup1').setAttributeNS(null, "opacity", 1);
        } else if (this.frame <= this.transitionDuration && !this.suspended) {
            document.getElementById('imageGroup1').setAttributeNS(null, "opacity", (this.frame) / (this.transitionDuration || 10));
        }
        if (this.idleTime === undefined && this.frame > this.transitionDuration) {
            this._onTransitionEnd();
        }
    }
    updateFilmStrip() {
        this.filmStrip.setImages(this.getAlbumImages());
        this.filmStrip.setInfo(this.getAlbumInfo());
        this.filmStrip.render();
    }
    dispatchEvent(eventName, payload, ...args) {
        if (typeof this[eventName] === 'function') {
            this[eventName](payload, args);
        }
        if (this.eventHandler) {
            this.eventHandler(eventName, payload, args);
        }
    }
    /**
     * starts scene (continuously calls update())
     */
    run() {
        this.timer[1] = Date.now();
        this.update();
        this.workload = (this.workload * 49 + (this.timer[1] - this.timer[0])) / 50;
        if (Array.isArray(this.fps)) {
            this.currentFPS = this.fps[0] + (this.fps[1] - this.fps[0]) / (1 + this.workload);
            setTimeout(() => { if (this.run) this.run() }, 1000 / (this.currentFPS))
        } else {
            setTimeout(() => { if (this.run) this.run() }, 1000 / (this.fps || 20))
        }
        this.timer[0] = Date.now();
    }
    getImageNumByName(imageName, preferredAlbum = undefined) {
        preferredAlbum = preferredAlbum ?? this.getCurrentAlbumNum();
        for (let a = -1; a < this.images.length; a++) {
            let album = (a === -1 ? preferredAlbum : a);
            if (a === undefined) continue;
            let photos = this.images[album].photos || this.images[album].images;
            for (let i = 0; i < photos.length; i++) {
                if (photos[i].title === imageName || photos[i].name === imageName) {
                    return {album: album, image: i};
                }
            }
        }
    }
    getAlbumNumByName(albumName) {
        for (let i = 0; i < this.images.length; i++) {
            if (this.images[i].title == albumName || this.images[i].name == albumName ) {
                return i;
            }
        }
    }
    async loadData(filename = './data/albums.json') {
        return fetch(filename)
            .then(response => response.json())
            .catch(error => {
                console.error('Error:', error);
            });
    }
    setImages(images, lazyLoad = undefined) {
        if (lazyLoad !== undefined) {
            this.lazyLoad = lazyLoad;
        }
        this.images = images;
    }
    getImageSlot(index = undefined) {
        return document.getElementById("imageSlot" + (index !== undefined ? index : (this.imageSlots.length - 1)));
    }
    /* internal event listeners */
    _onIdle() {
        this.dispatchEvent('onIdle', this.idleTime);
    }
    _onKeyDown(event) {
        this.dispatchEvent('onKeyDown', { event: event });
        if (this.keysPressed.indexOf(event.key) === -1) {
            this.keysPressed.push(event.key);
        }
    }
    _onKeyUp(event) {
        this.dispatchEvent('onKeyUp', { event: event });
        if (this.keysPressed.indexOf('Shift') === -1) {
            /* Shift key can be used for "silent" navigation, i.e. with muted controls */
            this._onIdleEnd();
        }
        if (this.keysPressed.indexOf(event.key) !== -1) {
            this.keysPressed.splice(this.keysPressed.indexOf(event.key), 1);
        }
        switch (event.key) {
            case 'ArrowRight': this.navigate('+1'); break;
            case 'ArrowLeft': this.navigate('-1'); break;
            case 'ArrowUp': this.navigate(0, '-1'); break;
            case 'ArrowDown': this.navigate(0, '+1'); break;
        }
    }
    _onIdleEnd() {
        if (this.idleTime > 0) {
            this.dispatchEvent('onIdleEnd', { idle: this.idleTime });
            this.idleTime = 0;
        }
    }
    _onMouseMove() {
        this._onIdleEnd();
    }
    _onTransitionEnd() {
        if (this.waitForTransitionEnd) {
            this.waitForTransitionEnd = false;
            this.startTransition();
        }
        if (this.idleTime === undefined) {
            setTimeout(() => this.showImageInfo(), this.infoBoxInertia || 2000);
            this.dispatchEvent("onTransitionEnd", { image: this.getCurrentImage() });
            this.idleTime = 0;
        }
    }
    _onImageLoad(event, image) {
        if (event.target === this.getImageSlot(1)) {
            /* only dispatch event */
            this.dispatchEvent("onImageLoad", { event: event, image: image });
        }
        if (this.canvas instanceof HTMLCanvasElement) {
            const ctx = this.canvas.getContext("2d");
            ctx.drawImage(event.target, 0, 0);
        } else if (this.canvas instanceof HTMLElement) {
            event.target.setAttributeNS(null, "x", (this.width - event.target.getBBox().width) * this.alignImages.x);
            event.target.setAttributeNS(null, "y", (this.height - event.target.getBBox().height) * this.alignImages.y);

            if (event.target === this.getImageSlot(1)) {
                /* active/current image (foreground) */
                if (!this.debugMask && this.clipPath) {
                    document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#" + this.clipPathId + ")");
                }
                this.getImageSlot(1).setAttributeNS(null, "visibility", "visible");
                this.suspended = false;
                this.updateClipPathTransition();
            } else if (event.target === this.getImageSlot(0)) {
                /* inactive/previous image (background) */
                let img = this.getCurrentImage();
                this.getImageSlot(1).setAttributeNS(null, "href", this.getImageSrc(img));
                if (!this.debugMask && this.clipPath) {
                    document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#" + this.clipPathId + ")");
                }
                this.getImageSlot(1).setAttributeNS(null, "visibility", "visible");
            }
        }
    }
    showImage() {
        let current = this.getImageSlot(1);
        let previous = this.getImageSlot(0);
        if (current.getAttributeNS(null, "href")) {
            /* deactivate clip path for foreground image */
            document.getElementById('imageGroup1').removeAttributeNS(null, "clip-path");
            /* copy previous image from main to background image slot */
            previous.setAttributeNS(null, "href", current.getAttributeNS(null, "href"));
        } else {
            let img = this.getCurrentImage();
            current.setAttributeNS(null, "visibility", "hidden");
            current.setAttributeNS(null, "href", this.getImageSrc(img));
        }
    }
    createCanvas() {
        let w = this.width;
        let h = this.height;
        let context = this.canvas;
        let clipPath = null;

        /* create svg object which contains dotGain - mask */
        let svg = document.createElementNS(this.svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 " + w + " " + h);

        for (let i = 0; i < 2; i++) {
            /* create image group (containing image + background) for each image slot */
            let imageGroup = document.createElementNS(this.svgNS, "g");
            imageGroup.id = 'imageGroup' + i;
            imageGroup.setAttributeNS(null, 'class', 'imageGroup');

            /* create placeholder image element */
            let image = document.createElementNS(this.svgNS, "image");
            image.id = 'imageSlot' + i;
            image.setAttributeNS(null, "visibility", "visible");
            /* assign internal onload - handler for image */
            image.onload = (event) => this._onImageLoad(event, this.getCurrentImage());

            /* create background */
            let background = document.createElementNS(this.svgNS, "rect");
            background.setAttributeNS(null, 'width', this.width);
            background.setAttributeNS(null, 'height', this.height);
            background.setAttributeNS(null, 'fill', 'black');

            /* append elements to svg canvas */
            imageGroup.appendChild(background);
            imageGroup.appendChild(image);
            svg.appendChild(imageGroup);
        }

        if (this.createClipPath) {
            clipPath = this.createClipPath();
            /* append clipPath */
            svg.appendChild(clipPath);
            this.clipPath = clipPath;
        }


        /* create div element add it to gallery context element */
        let div = document.createElement('div')
        context.appendChild(div);
        this.canvasContainer = div;
        this.canvasContainer.setAttribute('class', 'canvasContainer');
        this.canvasContainer.style.width = "100%";/* this.width+"px" */
        this.canvasContainer.style.height = "100%";/* this.height+"px" */

        /* create and append infoBox Overlay */
        let infobox = document.createElement("div");
        infobox.classList.add('infoBox', 'hide');
        div.appendChild(infobox);
        infobox.onclick = (event) => {infobox.classList.toggle('minified')};
        this.imageInfoBox = infobox;

        /* create and append film strip */
        this.filmStrip = new FilmStrip(this.getAlbumImages(), this.getAlbumInfo());
        this.filmStrip.classList.add('filmStrip', 'hide');
        this.filmStrip.onClick = (event, selectedImage) => { this.navigate(selectedImage); }
        div.appendChild(this.filmStrip);

        /* add svg to container/canvas */
        if (context instanceof HTMLCanvasElement) {
            context.getContext("2d").drawImage(svg, 0, 0);
        } else {
            div.appendChild(svg);
        }
        this.dispatchEvent("onCanvasCreated", { canvasContainer: this.canvasContainer, canvas: svg, clipPath: clipPath, context: context });
    }

    showImageInfo() {
        if (this.waitForTransitionEnd) {
            return;
        }
        let el = this.imageInfoBox;
        el.classList.remove('hide');
        let list = this.getCurrentImage();
        if (typeof list === 'string' || list instanceof String || Object.keys(list).length === 0) {
            let div = document.createElement('div');
            div.classList.add('noInfo');
            div.innerHTML = "No Information available";
            el.replaceChildren(div);
        } else {
            list = { ...this.getCurrentImage() };
            delete list?.src;
            list = {
                title: list.title, 
                description: list.description, 
                location: list.location, 
                tags: list.tags, 
                date: list.dates?.taken, 
                posted: list.dates?.posted,
                exp: list.exif?.ExposureTime,
                aperture: list.exif?.FNumberm,
                focal: list.exif?.FocalLength,
                ISO: list.exif?.ISO,
                flash: list.exif?.Flash,
                lens: list.exif?.LensModel || list?.Lens
            }
            let ul = new TagsUL(list);
            ul.classList.add('imageInfo');
            el.replaceChildren(ul);
        }
    }

}
export default Gallery;