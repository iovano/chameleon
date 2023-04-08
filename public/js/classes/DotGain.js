import Gallery from "./Gallery.js";
class DotGain extends Gallery {
    grid = 25;
    transitionDuration = 50;
    clipPathTransitionSpeed = 4;
    clipPath = undefined;
    clipPathId = "clipPathMask";
    maskedImage = undefined;
    debugMask = false;
    updateClipPathTransition() {
        let parameters = {
            frame: this.frame -1, 
            x: - this.grid * 4, 
            y: Math.max(this.height, this.width) - (this.frame - 1) * this.grid * this.clipPathTransitionSpeed, 
            limitY: - this.height - this.clipPathNetSize.height,
            direction: this.currentDirection,
            suspended: this.suspended,
            idleTime: this.idleTime
        };
        this.dispatchEvent('onTransition', parameters);
        if (!parameters.suspended && parameters.y < parameters.limitY) {
            parameters.y = parameters.limitY;
            this._onTransitionEnd();
            if (parameters.idleTime === undefined) {
                document.getElementById('imageGroup1').removeAttributeNS(null, "clip-path");
            }
        }
        this.clipPath.style.transform = "rotate("+parameters.direction+"deg) translate("+parameters.x+"px, "+parameters.y+"px)";

    }
    createClipPath(clipPathId = undefined) {
        let clipPath = document.createElementNS(this.svgNS, this.debugMask ? "g" : "clipPath");
        let w = this.width;
        let h = this.height;
        let cols = w / this.grid;
        let rows = h / this.grid;
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