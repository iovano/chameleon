import Canvas from "./Canvas.js";
export default class Pipe extends Canvas {
    additionalSettings = {
        imgLayerStyle: {opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent'},
        fps: 60
    }
    grid = 25;
    transitionDuration = 40;
    clipPathTransitionSpeed = 2;
    clipPath = undefined;
    clipPathId = "clipPathMask";
    maskedImage = undefined;
    debugMask = false;
    constructor(albums) {
        super(albums);
        this.setPreferences(this.additionalSettings);
    }

    updateClipPathTransition() {
        if (this.transitionFrame > this.get('transitionDuration') * this.get('fps')) {
            this.dispatchEvent("TransitionEnd");
        } else if (this.transitionFrame) {
            for (let i = 0; i < this.img.length; i++) {
                let canvas = this.img[i];
                canvas.style.opacity = 1;
                canvas.style.zIndex = this.img.length - i;
                if (i === 0) {
                    let context = canvas.getContext('2d');    
                    //context.globalAlpha = this.transitionFrame / this.preferences.transitionDuration / this.preferences.fps + 0.5;
                    context.globalCompositeOperation = "source-over";
                    context.clearRect(0,0,canvas.width,canvas.height);
                    context.fillStyle = "#000";
                    context.fillRect(0,0,canvas.width,canvas.height);
                    context.drawImage (canvas.image,canvas.image.x1,canvas.image.y1,canvas.image.w,canvas.image.h);
                    context.globalCompositeOperation = "destination-in";
                    context.beginPath();
                    context.arc(canvas.width / 2, canvas.height / 2, this.transitionFrame * Math.max(canvas.width, canvas.height) / this.preferences.transitionDuration / this.preferences.fps / 1.5, 0, 2 * Math.PI);
                    context.fill();
    
                }
            }
        }
    }

}
customElements.define('chameleon-bubbles', Pipe);