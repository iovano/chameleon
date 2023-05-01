import Gallery from "./Gallery.js";
export default class Canvas extends Gallery {
    constructor(albums) {
        super(albums);
    }
    showImage(cImage, src) {
        console.log("loading image", cImage, src);
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        let width = this.canvasContainer.clientWidth;
        let height = this.canvasContainer.clientHeight;
        canvas.width = width;
        canvas.height = height;
        canvas.style.opacity = 0;
        let image = new Image();
        canvas.image = image;
        this.setProps(image.style, this.preferences.imgStyle);
        this.setProps(canvas.style, this.preferences.imgLayerStyle);
        image.src = src;
        image.onload = (event) => {
            let s1 = {w: width, h: width * image.height / image.width};
            let s2 = {w: height * image.width / image.height, h: height};
            if (this.preferences.imgStyle.objectFit === 'contain') {
                width = (s1.w <= width && s1.h <= height) ? s1.w : s2.w;
                height = width / image.width * image.height;
            } else if (this.preferences.imgStyle.objectFit === 'cover') {
                width = (s1.w <= width && s1.h <= height) ? s2.w : s1.w;    
                height = width / image.width * image.height;
            }
            image.x1 = (canvas.width - width) * this.preferences.imgStyle.alignment.x;
            image.y1 = (canvas.height - height) * this.preferences.imgStyle.alignment.y;
            image.w = width;
            image.h = height;
            context.drawImage (event.target,(canvas.width - width) * this.preferences.imgStyle.alignment.x, (canvas.height - height) * this.preferences.imgStyle.alignment.y, width, height);
            this.dispatchEvent('ImageLoad');
        }
        this.addImageLayer(canvas);
    }
    createCanvasContainer() {
        super.createCanvasContainer('div');
    }
}
customElements.define('chameleon-canvas', Canvas);