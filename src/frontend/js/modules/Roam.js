import Gallery from "./Gallery.js";
export default class Roam extends Gallery {
    img = [];
    additionalSettings = {
        zoomspeed: 5,
        imgStyle: {
            display: "block",
            objectFit: 'cover',
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "100%",
            height: "100%",
            transform: "translate(-50%, -50%) scale(1)",
            "backface-visibility": "hidden",
            "transition": "transform 0.35s"
        }
    };
    animationFrame = 0;
    imageContainer;
    constructor(albums) {
        super(albums);
        this.setPreferences(this.additionalSettings);
    }
    updateClipPathTransition() {
        if (this.transitionFrame > this.get('transitionDuration') * this.get('fps')) {
            this.dispatchEvent("TransitionEnd");
        } else if (this.transitionFrame) {
            for (let i = 0; i < this.img.length; i++) {
                let img = this.img[i];
                if (img.style.opacity < 1) {
                    img.style.opacity = parseFloat(img.style.opacity) + (1 / this.get('transitionDuration') / this.get('fps'));
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
            let scale = 1 + (this.img[i].animationFrame * this.get('zoomspeed') / 1000 / this.get('fps'));
            this.img[i].firstChild.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
        }
        //        let top = this.img[0].firstChild.style.top;
        //        this.img[0].firstChild.style.top = (parseFloat(top.substring(0,top.length-2)) + 0.1) + "px";
    }

}
customElements.define('chameleon-roam', Roam);