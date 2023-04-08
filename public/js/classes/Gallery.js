class Gallery {
    svgNS = "http://www.w3.org/2000/svg";
    images = [];
    loadedImages = [];
    imageSlots = ["currentImage", "previousImage"]
    previousImage = undefined;
    currentImageNum = 0;
    duration = 200; /* slideshow duration in frames */
    idleTime = undefined;
    canvas = undefined;
    frame = 0;
    width = undefined;
    height = undefined;
    lazyLoad = false;
    suspended = false;
    mask = undefined;
    canvasContainer = undefined;
    direction = "random";
    alignImages = {x: 0.5, y: 0.5}; // 0 = left, 0.5 = center, 1 = right

    fps = 20; /* canvas update frequency (frames per second) */
    constructor(canvas, images = undefined, width = undefined, height = undefined) {
        this.canvas = canvas;
        this.width = width || this.canvas.clientWidth || this.canvas.width || document.clientWidth || 800;
        this.height = height || this.canvas.clientHeight || this.canvas.height || document.clientHeight || 600;
        console.debug("canvas size: "+(this.width + "x" + this.height));
        if (images) {
            this.addImages(images);
        }
    }
    destroy() {
        this.canvas.removeChild(this.canvasContainer);
        this.canvas = undefined;
        this.run = undefined;
    }
    navigate(target = "+1") {
        /* use delta if target contains a signed value (e.g. "+1" or "-10"), use absolute value if target is unsigned or increase by 1 if target is undefined */
        this.setCurrentImageNum(parseInt(target) + ((typeof target === 'string' || target instanceof String) && ["+","-"].indexOf((target || 0).substring(0,1) !== -1) ? this.getCurrentImageNum() : 0));
        this.dispatchEvent("onNavigation", {target: target});
        this.suspended = true;
        this.frame = 0;
        this.idleTime = undefined;
        this.currentDirection = (this.direction === 'random' ? Math.random() * 360 : this.direction);
        this.updateClipPathTransition();
        this.showImage();
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
        this.createCanvas();
        this.navigate(0);
    }
    update() {
        if (!this.suspended) {
            this.frame ++;
            if (this.idleTime !== undefined) this.idleTime ++;
        }
        this.updateClipPathTransition();
        if (this.idleTime > this.duration && !this.suspended) {
            this.navigate("+1");
        }
    }
    updateClipPathTransition() {
        if (this.idleTime === undefined) {
            this._onTransitionEnd();
        }
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
        setTimeout(() => {if (this.run) this.run()}, 1000 / (this.fps || 20))
    }
    addImages(images, lazyLoad = undefined) {
        if (lazyLoad !== undefined) {
            this.lazyLoad = lazyLoad;
        }
        this.images = images;
    }
    /* internal event listeners */
    _onTransitionEnd() {
        if (this.idleTime === undefined) {
            this.dispatchEvent("onTransitionEnd", {image: this.getCurrentImage()});
            this.idleTime = 0;
        }
    }
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
    getImageSlot(index = undefined) {
        return document.getElementById("imageSlot" + (index !== undefined ? index : (this.imageSlots.length - 1)));
    }
    /* internal event listeners */
    _onImageLoad(event, image) {
        if (event.target === this.getImageSlot(1)) {
            /* only dispatch event */
            this.dispatchEvent("onImageLoad", {event: event, image: image});
        }
        if (this.canvas instanceof HTMLCanvasElement) {
            const ctx = this.canvas.getContext("2d");
            ctx.drawImage(event.target,0,0);
        } else if (this.canvas instanceof HTMLElement) {
            event.target.setAttributeNS(null, "x", (this.width - event.target.getBBox().width) * this.alignImages.x);
            event.target.setAttributeNS(null, "y", (this.height - event.target.getBBox().height) * this.alignImages.y);

            if (event.target === this.getImageSlot(1)) {
                /* active/current image (foreground) */
                if (!this.debugMask) {
                    document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#"+this.clipPathId+")");
                }
                this.getImageSlot(1).setAttributeNS(null, "visibility", "visible");
                this.suspended = false;
            } else if (event.target === this.getImageSlot(0)) {
                /* inactive/previous image (background) */
                let img = this.getCurrentImage();
                this.getImageSlot(1).setAttributeNS(null, "href", img?.src || img);    
                if (!this.debugMask) {
                    document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#"+this.clipPathId+")");
                }
                this.getImageSlot(1).setAttributeNS(null, "visibility", "visible");
            }
        }
    }
    showImage(index = undefined) {
        let current = this.getImageSlot(1);
        let previous = this.getImageSlot(0);
        if (current.getAttributeNS(null, "href")) {
            /* deactivate clip path for foreground image */            
            document.getElementById('imageGroup1').removeAttributeNS(null, "clip-path");
            /* copy previous image from main to background image slot */
            previous.setAttributeNS(null, "href", current.getAttributeNS(null, "href"));
        } else {
            let img = this.getCurrentImage();
            current.setAttributeNS(null, "href", img?.src || img);    
        }
    }
    createCanvas() {
        let w = this.width;
        let h = this.height;
        let context = this.canvas;
        let clipPath = null;

        /* create svg object which contains dotGain - mask */
        let svg = document.createElementNS(this.svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 "+w+" "+h);

        for (let i=0;i<this.imageSlots.length;i++) {
            /* create image group (containing image + background) for each image slot */
            let imageGroup = document.createElementNS(this.svgNS, "g");
            imageGroup.id = 'imageGroup'+i;
            imageGroup.setAttributeNS(null, 'class', 'imageGroup');

            /* create placeholder image element */
            let image = document.createElementNS(this.svgNS, "image");            
            image.id = 'imageSlot'+i;
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

        this.dispatchEvent("onCanvasCreated", {canvas: svg, clipPath: clipPath, context: context});

        if (context instanceof HTMLCanvasElement) {
            context.getContext("2d").drawImage(svg,0,0);
        } else {
            /* create div element, append svg canvas container and add it to gallery context element */
            let div = document.createElement('div')
            div.appendChild(svg);
            context.appendChild(div);
            this.canvasContainer = div;
        }
    }
}
export default Gallery;