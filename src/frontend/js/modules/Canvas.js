import Gallery from "./Gallery.js";
export default class Canvas extends Gallery {
    constructor(albums) {
        super(albums);
    }
    drawImage(slot = 0, scale = 1) {
        let canvas = this.img[slot];
        let context = canvas.getContext('2d');
        let image = canvas.bitmap ?? canvas.image;
        let width = this.canvasContainer.clientWidth;
        let height = this.canvasContainer.clientHeight;
        let style = this.get('imgStyle');
        if (scale) {
            canvas.style.transform = "scale("+scale+","+scale+")";

//            canvas.style.scale = scale;
        }
        //context.imageSmoothingEnabled = true;
        //context.imageSmoothingQuality = "high";
        if (['contain', 'cover'].indexOf(style.objectFit) !== -1) {
            width = (width * image.height / image.width <= height || style.objectFit === 'cover') ? width : height * image.width / image.height;
            height = width / image.width * image.height;
        }
        context.drawImage (image,(canvas.width - width) * style.alignment.x, (canvas.height - height) * style.alignment.y, width, height);
    }
    _onTransitionEnd(...props) {
        let div = document.createElement('div');
        let img = this.img[0].image;
        let oldLayer = this.img[0];
        div.appendChild(img);

        div.image = img;
        div.frame = oldLayer.frame;

        this.addImageLayer(div);
        this.setProps(div.style, this.preferences.imgLayerStyle);
        div.style.backgroundColor = 'rgb(0,0,0)'
        div.style.opacity = 1;
        div.style.transition = 'opacity 2s';
        console.log("replace canvas with div (improve image quality after transition)");
        super._onTransitionEnd(...props);
        this.img[1].classList.add('hide');
        this.img[1].style.opacity = 'inherit';
        //requestAnimationFrame(() => {this.imageContainer.removeChild(oldLayer); this.img.splice(1,1);});
    }

    showImage(cImage, src) {
        let canvas = document.createElement('canvas');
        canvas.width = this.canvasContainer.clientWidth;
        canvas.height = this.canvasContainer.clientHeight;
        canvas.style.opacity = 0;
        /*
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = canvas.width * pixelRatio;
        canvas.height = canvas.height * pixelRatio;
        canvas.getContext('2d').scale(pixelRatio, pixelRatio);
        console.log("pixelRatio", window.devicePixelRatio);
        */
        canvas.style.imageRendering = 'pixelated';

        let image = new Image();
        this.setProps(canvas.style, this.preferences.imgLayerStyle);
        this.setProps(image.style, this.preferences.imgStyle);
        image.src = src;
        /* additional attributes */
        canvas.image = image;
        canvas.frame = 0;
        this.addImageLayer(canvas);
        image.onload = (canvas) => {
            let style = this.get('imgStyle');
            let width = this.canvasContainer.clientWidth;
            let height = this.canvasContainer.clientHeight;    
            width = (width * image.height / image.width <= height || style.objectFit === 'cover') ? width : height * image.width / image.height;
            height = width / image.width * image.height;
            createImageBitmap(image, {
                resizeWidth: width,
                resizeHeight: height,
                resizeQuality: 'high'
              }).then((bitmap) => {
                this.img[0].bitmap = bitmap;
                console.log("image loaded and bitmapped");
             });
             this.drawImage();
             this.dispatchEvent('ImageLoad');
     }

    }
    createCanvasContainer() {
        super.createCanvasContainer('div');
    }
}
customElements.define('chameleon-canvas', Canvas);