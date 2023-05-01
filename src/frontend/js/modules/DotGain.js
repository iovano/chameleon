import Gallery from "./Gallery.js";
export default class DotGain extends Gallery {
    additionalSettings = {
        grid: 25,
        clipPathTransitionSpeed: 2,
        transitionDuration: 40        
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
    _onTransitionEnd() {
        super._onTransitionEnd();
//        this.get('clipPathTransitionSpeed') = Math.floor(20 / (this.currentFPS / 5 + 1)); 
    }
    _onResize() {
        super._onResize();
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
            x: - this.get('grid') * 4, 
            y: Math.max(this.get('height'), this.get('width')) - ((this.transitionFrame || 0) - 5) * this.get('grid') * this.get('clipPathTransitionSpeed'), 
            limitY: - this.get('height') - this.clipPathNetSize.height,
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
        let w = this.get('width');
        let h = this.get('height');
        let cols = w / this.get('grid') * this.get('transitionDuration') / 50;
        let rows = h / this.get('grid') * this.get('transitionDuration') / 50;
        let maxRadius = this.get('grid') * Math.PI / 4;
        let r,x,y;
        for (y = 0; y <= Math.max(cols,rows) * 2; y += 1) {
            for (x = 0; x <= Math.max(cols,rows) * 2; x += 1) {
                r = y * maxRadius / (this.get('transitionDuration') || 10);
                if (r < 1) {
                    continue;
                }
                if (r > maxRadius) {
                    break;
                }
                /* draw dotgain circle and append to mask group */
                let circle = document.createElementNS(this.svgNS, "circle");
                circle.setAttribute("cx", x * this.get('grid'));
                circle.setAttribute("cy", y * this.get('grid'));
                circle.setAttribute("r", r < maxRadius ? r : maxRadius);
                circle.setAttribute("fill", "white");
                circle.setAttribute("stroke", "none");        
                clipPath.appendChild(circle);
            }
            if (r > maxRadius) {
                break;
            }

        }
        this.clipPathNetSize = {width: w * 4 + this.get('grid') * 2, height: (y-1) * this.get('grid')};
        /* create full coverage mask section path with previously collected coordinates */
        let filler = document.createElementNS(this.svgNS, "rect");
        filler.setAttributeNS(null, "x", -w);
        filler.setAttributeNS(null, "y", (y - 1) * this.get('grid'));
        filler.setAttributeNS(null, "width", w*4 + this.get('grid') * 2);
        filler.setAttributeNS(null, "height", h*4 + this.get('grid') * 2);
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
    _onImageLoad(event, image) {
        event.target.setAttributeNS(null, "x", (this.get('width') - event.target.getBBox().width) * this.get('imgStyle').alignment.x);
        event.target.setAttributeNS(null, "y", (this.get('height') - event.target.getBBox().height) * this.get('imgStyle').alignment.y);
        if (event.target === this.getImageSlot(1)) {
            /* active/current image (foreground) */
            if (!this.debugMask && this.clipPath) {
                document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#" + this.clipPathId + ")");
            }
            let iSlot = this.getImageSlot(1);
            iSlot.setAttributeNS(null, "visibility", "visible");
            this.suspended = false;
            this.transitionFrame = 0;
            this.updateClipPathTransition();
        } else if (event.target === this.getImageSlot(0)) {
            /* inactive/previous image (background) */
            let img = this.getCurrentImage();
            this.getImageSlot(1).setAttributeNS(null, "href", this.getImageSrc(img));
            if (!this.debugMask && this.clipPath) {
                document.getElementById('imageGroup1').setAttributeNS(null, "clip-path", "url(#" + this.clipPathId + ")");
            }
            this.getImageSlot(1).setAttributeNS(null, "visibility", "visible");
        }
    }    
    showImage() {
        let current = this.getImageSlot(1);
        let previous = this.getImageSlot(0);
        if (current.getAttributeNS(null, "href")) {
            /* deactivate clip path for foreground image */
            document.getElementById('imageGroup1').removeAttributeNS(null, "clip-path");
            /* copy previous image from main to background image slot */
            previous.setAttributeNS(null, "href", current.getAttributeNS(null, "href"));
        } else {
            let img = this.getCurrentImage();
            current.setAttributeNS(null, "visibility", "hidden");
            current.setAttributeNS(null, "href", this.getImageSrc(img));
        }
    }
    createCanvasContainer() {
        let w = this.get('width');
        let h = this.get('height');
        let clipPath = null;

        /* create svg object which contains dotGain - mask */
        let svg = document.createElementNS(this.svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 " + w + " " + h);

        for (let i = 0; i < 2; i++) {
            /* create image group (containing image + background) for each image slot */
            let imageGroup = document.createElementNS(this.svgNS, "g");
            imageGroup.id = 'imageGroup' + i;
            imageGroup.setAttributeNS(null, 'class', 'imageGroup');

            /* create placeholder image element */
            let image = document.createElementNS(this.svgNS, "image");
            image.id = 'imageSlot' + i;
            image.setAttributeNS(null, "visibility", "visible");
            /* assign internal onload - handler for image */
            image.addEventListener("error", (event) => this.dispatchEvent('Error', event));
            image.onload = (event) => this.dispatchEvent('ImageLoad', event, this.getCurrentImage());

            /* create background */
            let background = document.createElementNS(this.svgNS, "rect");
            background.setAttributeNS(null, 'width', this.get('width'));
            background.setAttributeNS(null, 'height', this.get('height'));
            background.setAttributeNS(null, 'fill', 'black');
            image.background = background;

            /* append elements to svg canvas */
            imageGroup.appendChild(background);
            imageGroup.appendChild(image);
            svg.appendChild(imageGroup);
        }

        if (this.createClipPath) {
            clipPath = this.createClipPath();
            /* append clipPath */
            svg.appendChild(clipPath);
            this.clipPath = clipPath;
        }


        /* create div element add it to gallery context element */
        let div = document.createElement('div')
        this.appendChild(div);
        this.canvasContainer = div;
        this.canvasContainer.setAttribute('class', 'canvasContainer');
        this.canvasContainer.style.width = "100%";/* this.get('width')+"px" */
        this.canvasContainer.style.height = "100%";/* this.get('height')+"px" */

        /* add svg to container/canvas */
        div.appendChild(svg);
        this.canvas = svg;
        this.dispatchEvent("CanvasCreated", { canvasContainer: this.canvasContainer, canvas: svg, clipPath: clipPath});
    }

}
customElements.define('chameleon-dotgain', DotGain);
