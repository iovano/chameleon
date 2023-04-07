import Gallery from "./Gallery.js";
class DotGain extends Gallery {
    grid = 25;
    clipPathTransitionSteps = 50;
    clipPathTransitionSpeed = 4;
    clipPathTransitionDuration 
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
        this.navigate(0);
    }
    update() {
        super.update();
        this.updateClipPathTransition();
        if (this.idleTime > this.duration && !this.suspended) {
            this.navigate("+1");
        }
    }
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
        this.dispatchEvent('onTransitionStart', parameters);
        if (!parameters.suspended && parameters.y < parameters.limitY) {
            parameters.y = parameters.limitY;
            if (parameters.idleTime === undefined) {
                document.getElementById('imageGroup1').removeAttributeNS(null, "clip-path");
                this.dispatchEvent("onTransitionEnd", {image: this.getCurrentImage()});
                this.idleTime = 0;
            }
        }
        this.clipPath.style.transform = "rotate("+parameters.direction+"deg) translate("+parameters.x+"px, "+parameters.y+"px)";

    }
    navigate(delta = undefined) {
        this.dispatchEvent("onNavigation", {target: delta});
        super.navigate(delta);
        this.suspended = true;
        this.frame = 0;
        this.idleTime = undefined;
        this.currentDirection = (this.direction === 'random' ? Math.random() * 360 : this.direction);
        this.updateClipPathTransition();
        this.showImage();
    }
    getImageSlot(index = undefined) {
        return document.getElementById("imageSlot" + (index !== undefined ? index : (this.imageSlots.length - 1)));
    }
    /* internal event listeners */
    _onImageLoad(event, image) {
        if (event.target === this.getImageSlot(1)) {
            /* only dispatch event */
            this.dispatchEvent("onImageLoad", {event: event, image: image});
        }
        if (this.canvas instanceof HTMLCanvasElement) {
            const ctx = this.canvas.getContext("2d");
            ctx.drawImage(event.target,0,0);
        } else if (this.canvas instanceof HTMLElement) {
            event.target.setAttributeNS(null, "x", (this.width - event.target.getBBox().width) * this.alignImages.x);
            event.target.setAttributeNS(null, "y", (this.height - event.target.getBBox().height) * this.alignImages.y);

            if (event.target === this.getImageSlot(1)) {
                /* active/current image (foreground) */
                if (!this.debugMask) {
                    document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#"+this.clipPathId+")");
                }
                this.getImageSlot(1).setAttributeNS(null, "visibility", "visible");
                this.suspended = false;
            } else if (event.target === this.getImageSlot(0)) {
                /* inactive/previous image (background) */
                let img = this.getCurrentImage();
                this.getImageSlot(1).setAttributeNS(null, "href", img?.src || img);    
                if (!this.debugMask) {
                    document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#"+this.clipPathId+")");
                }
                this.getImageSlot(1).setAttributeNS(null, "visibility", "visible");
            }
        }
    }
    showImage(index = undefined) {
        let current = this.getImageSlot(1);
        let previous = this.getImageSlot(0);
        if (current.getAttributeNS(null, "href")) {
            /* deactivate clip path for foreground image */            
            document.getElementById('imageGroup1').removeAttributeNS(null, "clip-path");
            /* copy previous image from main to background image slot */
            previous.setAttributeNS(null, "href", current.getAttributeNS(null, "href"));
        } else {
            let img = this.getCurrentImage();
            current.setAttributeNS(null, "href", img?.src || img);    
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
                r = y * maxRadius / (this.clipPathTransitionSteps || 10);
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
            /* create image group (containing image + background) for each image slot */
            let imageGroup = document.createElementNS(this.svgNS, "g");
            imageGroup.id = 'imageGroup'+i;
            imageGroup.setAttributeNS(null, 'class', 'imageGroup');

            /* create placeholder image element */
            let image = document.createElementNS(this.svgNS, "image");            
            image.id = 'imageSlot'+i;
            image.setAttributeNS(null, "visibility", "visible");
            /* assign internal onload - handler for image */
            image.onload = (event) => this._onImageLoad(event, this.getCurrentImage());

            /* create background */
            let background = document.createElementNS(this.svgNS, "rect");
            background.setAttributeNS(null, 'width', this.width);
            background.setAttributeNS(null, 'height', this.height);
            background.setAttributeNS(null, 'fill', 'black');

            /* append elements to svg canvas */
            imageGroup.appendChild(background);
            imageGroup.appendChild(image);
            svg.appendChild(imageGroup);
        }

        /* svg canvas layout */
        svg.style.position = "absolute";
        svg.style.zIndex = 10;

        /* append clipPath */
        svg.appendChild(clipPath);

        this.dispatchEvent("onCanvasCreated", {canvas: svg, clipPath: clipPath, context: context});

        this.canvasContainer = svg;
        if (context instanceof HTMLCanvasElement) {
            context.getContext("2d").drawImage(svg,0,0);
        } else {
            /* create div element, append svg canvas container and add it to gallery context element */
            let div = document.createElement('div')
            div.appendChild(svg);
            context.appendChild(div);
            this.clipPath = clipPath;
        }
    }
}
export default DotGain;