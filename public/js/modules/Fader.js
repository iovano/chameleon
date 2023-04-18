import Gallery from "./Gallery.js";
export default class Fader extends Gallery {
    transitionDuration = 60;
    clipPathTransitionSpeed = 4;
    fps = 60;
    objectFit = 'cover';
    img = [];
    imageContainer;
    updateClipPathTransition() {
        if (this.transitionFrame > this.transitionDuration) {
            this.dispatchEvent("TransitionEnd");
        } else if (this.transitionFrame) {
            for (let i = 0; i < this.img.length; i++) {
                let img = this.img[i];
                if (img.style.opacity < 1) {
                    img.style.opacity = parseFloat(img.style.opacity) + (1 / this.transitionDuration);
                }
                img.style.zIndex = this.img.length - i;
            }
        }
    }
    update() {
        super.update();
        this.img[0].firstChild.style.transform
        //let top = this.img[0].firstChild.style.top;
        //this.img[0].firstChild.style.top = (parseFloat(top.substring(0,top.length-2)) + 0.1) + "px";
    }
    _onImageLoad(event) {
        this.suspended = false;
        this.transitionFrame = 0;
    }
    showImage() {
        let imgLayer = document.createElement('div');
        let img = document.createElement('img');
        img.src = this.getImageSrc(this.getCurrentImage());
        this.set(img.style,this.imgStyle);
        this.img.unshift(imgLayer);
        this.set(imgLayer.style,this.imgLayerStyle)
        imgLayer.appendChild(img);
        this.suspended = true;
        this.transitionFrame = undefined;
        img.onload = (event) => this._onImageLoad();
        this.imageContainer.insertBefore(imgLayer, this.imageContainer.firstChild);
        for (let idx = 5; idx < this.imageContainer.children.length ; idx++) {
            this.imageContainer.removeChild(this.imageContainer.children[idx]);
            this.img.pop();
        }
        this.showImageInfo(true);
    }
    createCanvas() {
        console.log("creating canvas");
        this.canvasContainer = document.createElement('div');
        this.target.appendChild(this.canvasContainer);
        this.set(this.canvasContainer.style, {width: '100%', height: '100%', position: 'absolute'})
        this.canvasContainer.setAttribute('class', 'canvasContainer');
        this.imageContainer = document.createElement('div');
        this.canvasContainer.appendChild(this.imageContainer);
    
    }    
}