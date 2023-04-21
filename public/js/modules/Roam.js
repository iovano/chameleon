import Fader from "./Fader.js";
export default class Roam extends Fader {
    transitionDuration = 2;
    clipPathTransitionSpeed = 4;
    fps = 40;
    img = [];
    imgStyle = {display: "block",
        width: "100%",
        objectFit: 'cover',
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) scale(1)",
        "backface-visibility": "hidden",
        "transition": "transform 0.35s"
    };
    animationFrame = 0;
    imgLayerStyle = {opacity: 0,zIndex: this.img.length+1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,1)'};
    imageContainer;
    updateClipPathTransition() {
        if (this.transitionFrame > this.transitionDuration * this.fps) {
            this.dispatchEvent("TransitionEnd");
        } else if (this.transitionFrame) {
            for (let i = 0; i < this.img.length; i++) {
                let img = this.img[i];
                if (img.style.opacity < 1) {
                    img.style.opacity = parseFloat(img.style.opacity) + (1 / this.transitionDuration / this.fps);
                }
                img.style.zIndex = this.img.length - i;
            }
        }
    }
    update() {
        super.update();
        for (let i = 0; i < this.img.length; i++) {
            if (i > 1) {
                break;
            }
            this.img[i].animationFrame = (this.img[i].animationFrame === undefined) ? 0 : this.img[i].animationFrame + 1;
            let scale = 1 + (this.img[i].animationFrame / 200 / this.fps);
            this.img[i].firstChild.style.transform = "translate(-50%, -50%) scale("+scale+")";
        }
//        let top = this.img[0].firstChild.style.top;
//        this.img[0].firstChild.style.top = (parseFloat(top.substring(0,top.length-2)) + 0.1) + "px";
    }

}