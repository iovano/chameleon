class Gallery {
    svgNS = "http://www.w3.org/2000/svg";
    images = [];
    loadedImages = [];
    previousImage = undefined;
    currentImageNum = 0;
    duration = 300;
    idleTime = undefined;
    canvas = undefined;
    frame = 0;
    width = undefined;
    height = undefined;
    lazyLoad = false;
    suspended = false;
    mask = undefined;
    constructor(canvas, images = undefined, width = undefined, height = undefined) {
        this.canvas = canvas;
        this.width = width || this.canvas.clientWidth || this.canvas.width || 800;
        this.height = height || this.canvas.clientHeight || this.canvas.height || 600;
        console.debug("canvas size: "+(this.width + "x" + this.height));
        if (images) {
            this.addImages(images);
        }
    }
    navigate(target = "+1") {
        /* use delta if target contains a signed value (e.g. "+1" or "-10"), use absolute value if target is unsigned or increase by 1 if target is undefined */
        this.setCurrentImageNum(parseInt(target) + ((typeof target === 'string' || target instanceof String) && ["+","-"].indexOf((target || 0).substring(0,1) !== -1) ? this.getCurrentImageNum() : 0));
        if (this.onNavigate) {
            this.onNavigate(delta);
        }
    }
    getCurrentImage() {
        return this.images[this.currentImageNum];
    }
    getImage(idx) {
        return this.images[idx];
    }
    setCurrentImageNum(newIndex) {
        /* set currentImage and normalize its value (i.e. make sure it is positive and within range of existing image amount) */
        this.currentImageNum = (newIndex % this.images.length) < 0 ? (newIndex % this.images.length) + this.images.length : newIndex % this.images.length;
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
    init() {
//        this.showImage();
    }
    update() {
        if (!this.suspended) {
            this.frame ++;
            if (this.idleTime !== undefined) this.idleTime ++;
        }
    }
    dispatchEvent(eventName, payload, ...args) {
        if (!payload.context) {
            payload['context'] = this;
        }
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
        setTimeout(() => {if (this.run) this.run()}, 20)
    }
    addImages(images, lazyLoad = undefined) {
        if (lazyLoad !== undefined) {
            this.lazyLoad = lazyLoad;
        }
        this.images = images;
    }
    /* internal event listener */
    _onImageLoad(event, image = null) {
        this.dispatchEvent("onImageLoad", {event: event, image: image});
        if (this.canvas instanceof HTMLCanvasElement) {
            const ctx = this.canvas.getContext("2d");
            ctx.drawImage(event.target,0,0);
        } else if (this.canvas instanceof HTMLElement) {
            let image = document.createElementNS(this.svgNS, "image");
            image.setAttributeNS(null, "href", event.target.src);
            image.setAttributeNS(null, "clip-path", "url(#clipPathMask)");
            ctx.addChild(image);
        }
        this.suspended = false;
    }
    showImage(index = undefined) {
        this.suspended = true;
        if (this.images) {
            let img = new Image(this.width,this.height);
            let cImg = this.getCurrentImage();
            img.src = cImg?.src || cImg;
            img.style.position = "absolute";
            img.style.top = 0;
            img.style.left = 0;
            img.style.zIndex = 5;
            img.onload = (event) => this._onImageLoad(event, {currentImage: cImg});
            return img;
        }
    }
    createCanvas() {

    }
}
export default Gallery;