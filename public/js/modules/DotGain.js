import Gallery from "./Gallery.js";
class DotGain extends Gallery {
    grid = 25;
    transitionDuration = 40;
    clipPathTransitionSpeed = 2;
    clipPath = undefined;
    clipPathId = "clipPathMask";
    maskedImage = undefined;
    debugMask = false;
    _onTransitionEnd() {
        super._onTransitionEnd();
//        this.clipPathTransitionSpeed = Math.floor(20 / (this.currentFPS / 5 + 1)); 
    }
    _onResize() {
        if (this.canvas) {
            console.log("updating clipMask");
            let oldClipPath = this.clipPath;
            this.createClipPath();
            this.canvas.replaceChild(oldClipPath, this.clipPath);    
        }
    }
    updateClipPathTransition() {
        let parameters = {
            frame: this.transitionFrame -1, 
            x: - this.grid * 4, 
            y: Math.max(this.height, this.width) - ((this.transitionFrame || 0) - 5) * this.grid * this.clipPathTransitionSpeed, 
            limitY: - this.height - this.clipPathNetSize.height,
            direction: this.currentDirection,
            suspended: this.suspended,
            userIdleTime: this.userIdleTime
        };
        this.dispatchEvent('onTransition', parameters);
        if (!parameters.suspended && parameters.y < parameters.limitY) {
            parameters.y = parameters.limitY;
            this.dispatchEvent("TransitionEnd");
            document.getElementById('imageGroup1').removeAttributeNS(null, "clip-path");
        }
        this.clipPath.style.transform = "rotate("+parameters.direction+"deg) translate("+parameters.x+"px, "+parameters.y+"px)";

    }
    createClipPath(clipPathId = undefined) {
        let clipPath = document.createElementNS(this.svgNS, this.debugMask ? "g" : "clipPath");
        let w = this.width;
        let h = this.height;
        let cols = w / this.grid * this.transitionDuration / 50;
        let rows = h / this.grid * this.transitionDuration / 50;
        let maxRadius = this.grid * Math.PI / 4;
        let r,x,y;
        for (y = 0; y <= Math.max(cols,rows) * 2; y += 1) {
            for (x = 0; x <= Math.max(cols,rows) * 2; x += 1) {
                r = y * maxRadius / (this.transitionDuration || 10);
                if (r < 1) {
                    continue;
                }
                if (r > maxRadius) {
                    break;
                }
                /* draw dotgain circle and append to mask group */
                let circle = document.createElementNS(this.svgNS, "circle");
                circle.setAttribute("cx", x * this.grid);
                circle.setAttribute("cy", y * this.grid);
                circle.setAttribute("r", r < maxRadius ? r : maxRadius);
                circle.setAttribute("fill", "white");
                circle.setAttribute("stroke", "none");        
                clipPath.appendChild(circle);
            }
            if (r > maxRadius) {
                break;
            }

        }
        this.clipPathNetSize = {width: w * 4 + this.grid * 2, height: (y-1) * this.grid};
        /* create full coverage mask section path with previously collected coordinates */
        let filler = document.createElementNS(this.svgNS, "rect");
        filler.setAttributeNS(null, "x", -w);
        filler.setAttributeNS(null, "y", (y - 1) * this.grid);
        filler.setAttributeNS(null, "width", w*4 + this.grid * 2);
        filler.setAttributeNS(null, "height", h*4 + this.grid * 2);
        filler.setAttributeNS(null, "stroke", "none");
        filler.setAttributeNS(null, "fill", "red");
        clipPath.appendChild(filler);

        clipPath.style.transformOrigin = "center center";

        /* define id as clip path target */
        if (!this.debugMask) {
            clipPath.id = this.clipPathId || clipPathId;
        }
        return clipPath;
    }
}
export default DotGain;