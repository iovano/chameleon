import Gallery from "./Gallery.js";
export default class Canvas extends Gallery {
    constructor(albums) {
        super(albums);
    }
    drawImage(slot = 0, scale = 1) {
        let canvas = this.img[slot];
        let context = canvas.getContext('2d');
        let image = canvas.image;
        let width = this.canvasContainer.clientWidth * scale;
        let height = this.canvasContainer.clientHeight * scale;
        let style = this.get('imgStyle');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        if (['contain', 'cover'].indexOf(style.objectFit) !== -1) {
            width = (width * image.height / image.width <= height || style.objectFit === 'cover') ? width : height * image.width / image.height;
            height = width / image.width * image.height;
        }
        context.drawImage (image,(canvas.width - width) * style.alignment.x, (canvas.height - height) * style.alignment.y, width, height);
    }
    showImage(cImage, src) {
        let canvas = document.createElement('canvas');
        canvas.width = this.canvasContainer.clientWidth;
        canvas.height = this.canvasContainer.clientHeight;
        canvas.style.opacity = 0;

        let image = new Image();
        this.setProps(canvas.style, this.preferences.imgLayerStyle);
        this.setProps(image.style, this.preferences.imgStyle);
        image.src = src;
        /* additional attributes */
        canvas.image = image;
        canvas.frame = 0;
        this.addImageLayer(canvas);
        image.onload = () => {
            this.drawImage();
            this.dispatchEvent('ImageLoad');
        }

    }
    createCanvasContainer() {
        super.createCanvasContainer('div');
    }
}
customElements.define('chameleon-canvas', Canvas);