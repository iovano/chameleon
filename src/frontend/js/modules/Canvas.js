import Gallery from "./Gallery.js";
export default class Canvas extends Gallery {
    constructor(albums) {
        super(albums);
    }
    drawImage(canvas, image, scale = 1) {
        if (canvas instanceof HTMLCanvasElement) {
            let context = canvas.getContext('2d');
            let width = this.canvasContainer.clientWidth;
            let height = this.canvasContainer.clientHeight;
            let style = this.get(image instanceof HTMLVideoElement ? 'videoStyle':'imgStyle');
            if (scale) {
                canvas.style.transform = "scale(" + scale + "," + scale + ")";
            }
            let imgh = image.videoHeight ?? image.height;
            let imgw = image.videoWidth ?? image.width;
            //context.imageSmoothingEnabled = true;
            //context.imageSmoothingQuality = "high";
            if (['contain', 'cover'].indexOf(style.objectFit) !== -1) {
                width = (width * imgh / imgw <= height || style.objectFit === 'cover') ? width : height * imgw / imgh;
                height = width / imgw * imgh;
            }
            context.drawImage(image, (canvas.width - width) * style.alignment.x, (canvas.height - height) * style.alignment.y, width, height);    
        }
    }
    _onTransitionEnd(...props) {
        let div = document.createElement('div');
        let img = this.img[0].video ?? this.img[0].image;
        let oldLayer = this.img[0];
        div.appendChild(img);

        div.image = img;
        div.frame = oldLayer.frame;

        this.addImageLayer(div);
        this.setProps(div.style, this.preferences[img instanceof HTMLVideoElement ? 'videoLayerStyle' : 'imgLayerStyle']);
        div.classList.add(img instanceof HTMLVideoElement ? 'video' : 'image')
        div.style.backgroundColor = 'rgb(0,0,0)'
        div.style.opacity = 1;
        div.style.transition = 'opacity 2s';
        console.log("replace canvas with div (improve image quality after transition)");
        super._onTransitionEnd(...props);
        this.img[1].classList.add('hide');
        this.img[1].style.opacity = 'inherit';
        //requestAnimationFrame(() => {this.imageContainer.removeChild(oldLayer); this.img.splice(1,1);});
    }
    _onVideoLoad(event) {
        console.log("video ready for playback");
        this.img[0].video = event.target;
    }
    _onImageLoad(event) {
        let image = event.target;
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
            super._onImageLoad(event);
            this.drawImage(this.img[0], bitmap);
        });    
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
        let image = this.createMediaElement();
        this.setProps(canvas.style, this.preferences[image instanceof HTMLVideoElement ? 'videoLayerStyle':'imgLayerStyle']);
        canvas.image = image;
        canvas.frame = 0;
        this.addImageLayer(canvas);
    }
    createCanvasContainer() {
        super.createCanvasContainer('div');
    }
}
customElements.define('chameleon-canvas', Canvas);