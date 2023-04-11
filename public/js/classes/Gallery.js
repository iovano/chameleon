import FilmStrip from './FilmStrip.js';

import css from '../../css/gallery.css' assert { type: 'css' };
import TagsUL from './TagsUL.js';
document.adoptedStyleSheets.push(css);
class Gallery {
    /* namespaces */
    svgNS = "http://www.w3.org/2000/svg";

    /* gallery settings */
    duration = 200; /* slideshow duration in frames */
    transitionDuration = 20;
    width = undefined;
    height = undefined;
    lazyLoad = false;
    suspended = false;
    direction = "random";
    alignImages = { x: 0.5, y: 0.5 }; // 0 = left, 0.5 = center, 1 = right
    fps = 20; /* canvas update frequency (frames per second) */

    /* transition variables */
    idleTime = undefined;
    frame = 0;

    /* internal control variables */
    keysPressed = []

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
        /* use delta if target contains a signed value (e.g. "+1" or "-10"), use absolute value if target is unsigned or increase by 1 if target is undefined */
        this.setCurrentAlbumNum(parseInt(targetAlbum) + ((typeof targetAlbum === 'string' || targetAlbum instanceof String) && ["+", "-"].indexOf((targetAlbum || 0).substring(0, 1) !== -1) ? this.getCurrentAlbumNum() : 0));
        this.setCurrentImageNum(parseInt(targetImage) + ((typeof targetImage === 'string' || targetImage instanceof String) && ["+", "-"].indexOf((targetImage || 0).substring(0, 1) !== -1) ? this.getCurrentImageNum() : 0));
        this.imageInfoBox.classList.add('hide');
        this.suspended = true;
        this.frame = 0;
        this.idleTime = undefined;
        this.currentDirection = (this.direction === 'random' ? Math.random() * 360 : this.direction);
        this.dispatchEvent("onNavigation", { target: targetImage });
        this.updateClipPathTransition();
        this.showImage();
        this.filmStrip.select(this.currentImageNum);
    }
    getCurrentImage() {
        return this.getAlbumImages()[this.currentImageNum];
    }
    getImage(idx) {
        return this.getAlbumImages()[idx];
    }
    setCurrentAlbumNum(albumNum, imageNum = undefined) {
        if (albumNum !== this.currentAlbumNum) {
            this.currentAlbumNum = (albumNum % this.images.length) < 0 ? (albumNum % this.images.length) + this.images.length : albumNum % this.images.length;
            this.updateFilmStrip();
        }
        if (imageNum && imageNum !== this.currentImageNum) {
            this.setCurrentImageNum(imageNum);
        }
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
        return img?.src || img?.size[size] || img;
    }
    setCurrentImageNum(newIndex) {
        let images = this.getAlbumImages();
        /* set currentImage and normalize its value (i.e. make sure it is positive and within range of existing image amount) */
        this.currentImageNum = (newIndex % images.length) < 0 ? (newIndex % images.length) + images.length : newIndex % images.length;
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
    init(resize = true) {
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
        this.navigate(this.currentImageNum);
    }
    update() {
        if (!this.suspended) {
            this.frame++;
            if (this.idleTime !== undefined) this.idleTime++;
        }
        this.updateClipPathTransition();
        if (this.idleTime >= 100) {
            if (this.idleTime === 100) {
                this._onIdle();
            }
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
        this.update();
        setTimeout(() => { if (this.run) this.run() }, 1000 / (this.fps || 20))

    }
    loadAlbums(filename = '/data/albums.json') {
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
        this.dispatchEvent('onIdle', { idle: this.idleTime });
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
        if (this.idleTime !== undefined && this.idleTime > 0) {
            this.dispatchEvent('onIdleEnd', { idle: this.idleTime });
            this.imageInfoBox.classList.remove('hide');
            this.idleTime = 0;
        }
    }
    _onMouseMove() {
        this._onIdleEnd();
    }
    _onTransitionEnd() {
        if (this.idleTime === undefined) {
            this.dispatchEvent("onTransitionEnd", { image: this.getCurrentImage() });
            this.idleTime = 0;
        }
    }
    _onImageLoad(event, image) {
        setTimeout(() => this.showImageInfo(), 2000);
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
            list = {title: list.title, description: list.description, location: list.location, date: list.date}
            let ul = new TagsUL(list);
            ul.classList.add('imageInfo');
            el.replaceChildren(ul);
        }
    }

}
export default Gallery;