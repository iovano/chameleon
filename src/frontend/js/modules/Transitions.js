import Canvas from "./Canvas.js";
export default class Transitions extends Canvas {
    transitions = ['DotGain','Pipe','Grinder','Fader'];
    additionalSettings = {
        imgLayerStyle: {opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent'},
        fps: 60,
        zoomspeed: 5,
        transitionEase: 0.2,
        transitionDuration: 2,
        direction: 'random',
        rotation: 0.1,
        grid: 'auto',
        transition: 'Fader'

    }
    constructor(albums) {
        super(albums);
        this.setPreferences(this.additionalSettings);
    }
    transitionPipe(canvas) {
        let context = canvas.getContext('2d');    
        context.beginPath();
        let r = this.transitionFrame * Math.max(canvas.width, canvas.height) / this.get('transitionDuration') / this.get('fps') + this.get('transitionEase',1) * this.transitionFrame * this.transitionFrame;
        context.arc(canvas.width / 2, canvas.height / 2, r, 0, 2 * Math.PI);
        context.fill();    
        context.closePath();
        if (r > Math.max(canvas.width, canvas.height)) {
            this.dispatchEvent("TransitionEnd");
        }
    }
    transitionGrinder(canvas) {
        let context = canvas.getContext('2d');    
        let max = Math.max(canvas.height, canvas.width)*2;
        let grid = this.get('grid') === 'auto' ? (grid = Math.floor(max / 10) + 1) : this.get('grid').x || this.get('grid');
        let cols = grid ? (max / grid) : 0;
        if (this.transitionFrame === 1) {
            this.preferences.currentDirection = this.get('direction') === 'random' ? Math.random()*360 : this.get('direction', 90);
        }

        context.moveTo(0,0);
        context.translate(canvas.width/2,canvas.height/2);
        this.preferences.currentDirection += this.get('rotation');
        context.rotate(this.get('currentDirection') * Math.PI / 180);
        context.beginPath();
        let h = this.transitionFrame * max / this.get('transitionDuration') / this.get('fps');
        for (let x = 0 ; x <= cols; x += 1) {
            context.rect((x) * grid - max/2, -max/2, grid / 2, h);
            context.rect((x + 0.5) * grid - max/2, max/2, grid / 2, -h);
        }
        context.fill();
        context.closePath();
        context.setTransform(1, 0, 0, 1, 0, 0);
        if (h === max) {
            this.dispatchEvent("TransitionEnd");
        }
    }
    transitionDotGain(canvas) {
        function calculateDistance(x1, y1, x2, y2) {
            const distance = ~~ Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            return distance;
        }
        let context = canvas.getContext('2d');    
        let max = Math.max(canvas.height, canvas.width);
        context.beginPath();
        if (this.transitionFrame === 1 || !this.preferences.origin) {
            let a = Math.floor(Math.random() * 4);
            this.preferences.origin = {x: a==0 || a==2 ? canvas.width * Math.random() : a==3 ? canvas.width : 0, y: a==1 || a==3 ? canvas.height * Math.random() : a==2 ? canvas.height : 0};
        }
        let grid;
        if (this.get('grid') === 'auto') {
            grid = {x: max / 25, y: max / 25};
        } else {
            grid = {x: this.get('grid').x || this.get('grid', max / 30), y: this.get('grid').y || this.get('grid', max / 30)};
        }
        let pending = 0;
        for (let x = 0 ; x <= canvas.width / grid.x + 1; x += 1) {
            for (let y = 0 ; y <= canvas.height / grid.y + 1; y += 1) {
                context.moveTo(0, 0);
                let r = - calculateDistance(x * grid.x, y * grid.y, this.preferences.origin.x , this.preferences.origin.y) * this.get('transitionDuration') / this.get('fps') / 2 + this.get('transitionEase',0) * this.transitionFrame + this.transitionFrame / this.get('fps') * Math.abs(grid.x, grid.y);
                if (r < Math.max(grid.x, grid.y)) {
                    pending ++;
                } else {
                    r = Math.max(grid.x, grid.y);
                }
                if (r > 0) {
                    context.arc( ~~ x * grid.x , ~~ y * grid.y ,  r, 0, 2 * Math.PI);
                }
                
            }
        }
        context.fillStyle = 'white';
        context.fill();
        context.closePath();
        if (!pending) {
            this.dispatchEvent("TransitionEnd");
        }
    }
    _onTransitionStart() {
        this.currentTransition = (this.get('transition') === 'random') ? this.transitions[Math.floor(Math.random()*this.transitions.length)] : this.get('transition');
        super._onTransitionStart();
    }

    updateClipPathTransition() {
        if (this.currentTransition === 'Fader') {
            this.img[0].style.backgroundColor = 'rgba(0,0,0,1)';
            return super.updateClipPathTransition();
        }
        for (let i = 0; i < this.img.length; i++) {
            let canvas = this.img[i];
            let scale = 1 + canvas.frame * this.get('zoomspeed',0) / 1000 / this.get('fps');
            if (i !== 0 || !this.suspended) {
                canvas.frame ++;
            }
            canvas.style.zIndex = this.img.length - i;
            if (canvas instanceof HTMLCanvasElement) {
                let context = canvas.getContext('2d');    
                context.globalCompositeOperation = "source-over";
                if (i === 0) {
                    context.clearRect(0,0,canvas.width,canvas.height);
                    context.fillStyle = "#000";
                    context.fillRect(0,0,canvas.width,canvas.height);
                    this.drawImage(canvas, canvas.video ?? canvas.bitmap ?? canvas.image, scale);
                    if (this.transitionFrame) {
                        context.globalCompositeOperation = "destination-in";
                        this['transition'+this.currentTransition](canvas);
                        canvas.style.opacity = 1;
                    }
//                } else {
//                    this.drawImage(i, 1 + canvas.frame * this.get('zoomspeed',0) / 1000 / this.get('fps'));                
                }    
            } else {
                canvas.style.transform = "scale("+scale+","+scale+")";
            }
        }
    }

}
customElements.define('chameleon-transitions', Transitions);