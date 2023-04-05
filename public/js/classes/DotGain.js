import Gallery from "./Gallery.js";
class DotGain extends Gallery {
    grid = 25;
    clipPath = undefined;
    clipPathId = "clipPathMask";
    maskedImage = undefined;
    canvasContainer = undefined;
    debugMask = false;
    imageSlots = ["currentImage", "previousImage"]
    direction = 90;

    init() {
        super.init();
        this.createCanvas();
    }
    update() {
        super.update();
        let cFrame = (this.frame - 1) % 200;
        let x = this.width - cFrame * this.grid;
        let y = this.height - cFrame * this.grid;
        if (this.suspended) {
            this.clipPath.style.transform = "translate("+this.width+"px, "+this.height+"px)";
        } else if (cFrame < 81) {
            this.clipPath.style.transform = "translate("+x+"px, "+y+"px)";
        }
        if (cFrame === 0 && !this.suspended) {
            this.currentImage ++;
            this.currentImage = this.currentImage % this.images.length;
            this.suspended = true;
            this.showImage();
        }
    }
    getImage(index = undefined) {
        return document.getElementById("imageSlot" + (index !== undefined ? index : (this.imageSlots.length - 1)));
    }
    onImageLoaded(event) {
        if (this.canvas instanceof HTMLCanvasElement) {
            const ctx = this.canvas.getContext("2d");
            ctx.drawImage(event.target,0,0);
        } else if (this.canvas instanceof HTMLElement) {
            if (event.target === this.getImage(1)) {
                if (!this.debugMask) {
                    this.getImage(1).setAttributeNS(null, "clip-path", "url(#"+this.clipPathId+")");
                }
                this.getImage(1).setAttributeNS(null, "visibility", "visible");
            } else if (event.target === this.getImage(0)) {
                this.getImage(1).setAttributeNS(null, "href", this.images[this.currentImage % this.images.length]);    
                if (!this.debugMask) {
                    this.getImage(1).setAttributeNS(null, "clip-path", "url(#"+this.clipPathId+")");
                }
                this.getImage(1).setAttributeNS(null, "visibility", "visible");
            }
            this.suspended = false;
        }
    }
    showImage(index = undefined) {
        let current = this.getImage(1);
        let previous = this.getImage(0);
        if (current.getAttributeNS(null, "href")) {
            current.removeAttributeNS(null, "clip-path");
            previous.setAttributeNS(null, "href", current.getAttributeNS(null, "href"));
        } else {
            current.setAttributeNS(null, "href", this.images[this.currentImage % this.images.length]);    
        }
    }
    createClipPath(clipPathId = undefined) {
        let clipPath = document.createElementNS(this.svgNS, this.debugMask ? "g" : "clipPath");
        let fillUp = [];
        let w = this.width;
        let h = this.height;
        let cols = w / this.grid;
        let rows = h / this.grid;
        let maxRadius = this.grid * Math.PI / 4;

        for (let y = 1; y <= rows * 4; y += 1) {
            for (let x = 1; x <= cols * 4; x += 1) {
                let radius = maxRadius * x / cols * y / rows;
                if (radius >= maxRadius) {
                    /* collect boundary coordinates of 100% coverage  */
                    fillUp.push([(x - 1) * this.grid, (y - 1) * this.grid]);
                    break;
                }
                if (radius < 1) {
                    continue;
                }
                /* draw dotgain circle and append to mask group */
                let circle = document.createElementNS(this.svgNS, "circle");
                circle.setAttribute("cx", x * this.grid);
                circle.setAttribute("cy", y * this.grid);
                circle.setAttribute("r", radius < maxRadius ? radius : maxRadius);
                circle.setAttribute("fill", "white");
                circle.setAttribute("stroke", "none");        
                clipPath.appendChild(circle);
            }
        }
        /* add final coordinate to close full coverage path */
        fillUp.push([cols*4*this.grid,rows*4*this.grid]);
        let d = 'M '+fillUp[0][0]+' '+fillUp[0][1];
        for(let i = 1; i < fillUp.length; i++) {
            d += ' L'+fillUp[i][0]+' '+fillUp[i][1];
        }
        /* create full coverage mask section path with previously collected coordinates */
        let filler = document.createElementNS(this.svgNS, "path");
        filler.setAttributeNS(null, "d", d);  
        filler.setAttributeNS(null, "stroke", "none");
        filler.setAttributeNS(null, "fill", "red");
        clipPath.appendChild(filler);

        /* define id as clip path target */
        if (!this.debugMask) {
            clipPath.id = this.clipPathId || clipPathId;
        }
        return clipPath;
    }
    createCanvas() {
        let w = this.width;
        let h = this.height;
        let context = this.canvas;

        /* create svg object which contains dotGain - mask */
        let svg = document.createElementNS(this.svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 "+w+" "+h);

        let clipPath = this.createClipPath();


        for (let i=0;i<this.imageSlots.length;i++) {
            let image = document.createElementNS(this.svgNS, "image");
            image.id = 'imageSlot'+i;
            image.setAttributeNS(null, "visibility", "visible");
            image.onload = (event) => this.onImageLoaded(event);
            svg.appendChild(image);
        }

        /* append clipPath */
        svg.appendChild(clipPath);

        svg.style.position = "absolute";
        svg.style.zIndex = 10;
        this.canvasContainer = svg;
        if (context instanceof HTMLCanvasElement) {
            context.getContext("2d").drawImage(svg,0,0);
        } else {
            let div = document.createElement('div')
            div.appendChild(svg);
            context.appendChild(div);
            this.clipPath = clipPath;

        }
    }
}
export default DotGain;