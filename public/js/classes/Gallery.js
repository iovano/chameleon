class Gallery {
    svgNS = "http://www.w3.org/2000/svg";
    images = [];
    loadedImages = [];
    previousImage = undefined;
    currentImage = 0;
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
        console.log(this.width + "x" + this.height);
        if (images) {
            this.addImages(images);
        }
    }
    navigate(delta = undefined) {
        this.currentImage += parseInt(delta || 1);
        this.currentImage = (this.currentImage + this.images.length) % this.images.length;
        if (this.onNavigate) {
            this.onNavigate(delta);
        }
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
    onImageLoaded(event) {
        if (this.canvas instanceof HTMLCanvasElement) {
            const ctx = this.canvas.getContext("2d");
            ctx.drawImage(event.target,0,0);
        } else if (this.canvas instanceof HTMLElement) {
            let image = document.createElementNS(this.svgNS, "image");
            image.setAttributeNS(null, "href", "images/example2.jpg");
            image.setAttributeNS(null, "clip-path", "url(#clipPathMask)");
            ctx.addChild(image);
        }
        this.suspended = false;
    }
    showImage(index = undefined) {
        this.suspended = true;
        let imgNum = (index || this.currentImage || 0) % this.images.length;
        console.log("show image "+imgNum);
        if (this.images) {
            let img = new Image(this.width,this.height);
            img.src = this.images[imgNum];
            img.style.position = "absolute";
            img.style.top = 0;
            img.style.left = 0;
            img.style.zIndex = 5;
            img.onload = (event) => this.onImageLoaded(event);
            return img;
        }
    }
    createCanvas() {

    }
}
export default Gallery;