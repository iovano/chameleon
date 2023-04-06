import Gallery from "./Gallery.js";
class DotGain extends Gallery {
    grid = 25;
    clipPath = undefined;
    clipPathId = "clipPathMask";
    maskedImage = undefined;
    canvasContainer = undefined;
    debugMask = false;
    imageSlots = ["currentImage", "previousImage"]
    direction = "random";
    alignImages = {x: 0.5, y: 0.5}; // 0 = left, 0.5 = center, 1 = right

    init() {
        super.init();
        this.createCanvas();
    }
    update() {
        super.update();
        let cFrame = (this.frame - 1) % 200;
        let x = - this.grid * 4;
        let y = Math.max(this.height, this.width) - cFrame * this.grid;
        let direction = this.currentDirection;

        if (this.suspended) {
            this.clipPath.style.transform = "rotate("+direction+"deg) translate("+x+"px, "+y+"px)";
        } else if (y > - this.clipPath.getBBox().height / 2) {
            this.clipPath.style.transform = "rotate("+direction+"deg) translate("+x+"px, "+y+"px)";
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
            event.target.setAttributeNS(null, "x", (this.width - event.target.getBBox().width) * this.alignImages.x);
            event.target.setAttributeNS(null, "y", (this.height - event.target.getBBox().height) * this.alignImages.y);

            if (event.target === this.getImage(1)) {
                if (!this.debugMask) {
                    document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#"+this.clipPathId+")");
                }
                this.getImage(1).setAttributeNS(null, "visibility", "visible");
                this.currentDirection = (this.direction === 'random' ? Math.random() * 360 : this.direction);
            } else if (event.target === this.getImage(0)) {
                this.getImage(1).setAttributeNS(null, "href", this.images[this.currentImage % this.images.length]);    
                if (!this.debugMask) {
                    document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#"+this.clipPathId+")");
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
            document.getElementById('imageGroup1').removeAttributeNS(null, "clip-path");
            previous.setAttributeNS(null, "href", current.getAttributeNS(null, "href"));
        } else {
            current.setAttributeNS(null, "href", this.images[this.currentImage % this.images.length]);    
        }
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
                r = y / 4;
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
        /* create full coverage mask section path with previously collected coordinates */
        let filler = document.createElementNS(this.svgNS, "rect");
        filler.setAttributeNS(null, "x", 0);
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
    createCanvas() {
        let w = this.width;
        let h = this.height;
        let context = this.canvas;

        /* create svg object which contains dotGain - mask */
        let svg = document.createElementNS(this.svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 "+w+" "+h);

        let clipPath = this.createClipPath();


        for (let i=0;i<this.imageSlots.length;i++) {
            let imageGroup = document.createElementNS(this.svgNS, "g");
            let image = document.createElementNS(this.svgNS, "image");
            imageGroup.id = 'imageGroup'+i;
            imageGroup.setAttributeNS(null, 'class', 'imageGroup');
            image.id = 'imageSlot'+i;
            image.setAttributeNS(null, "visibility", "visible");
            image.onload = (event) => this.onImageLoaded(event);
            let background = document.createElementNS(this.svgNS, "rect");
            background.setAttributeNS(null, 'width', this.width);
            background.setAttributeNS(null, 'height', this.height);
            background.setAttributeNS(null, 'fill', 'black');
            imageGroup.appendChild(background);
            imageGroup.appendChild(image);
            svg.appendChild(imageGroup);
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