import Dispatcher from "./Dispatcher";

export default class DragonSwipe {
    dispatcher;
    element;
    listeners = {document: ['TouchStart', 'TouchEnd', 'TouchCancel', 'MouseDown', 'MouseUp']};
    touches = [];
    mouse = {};
    constructor(element = undefined) {
        this.dispatcher = new Dispatcher(this, this.listeners);
        console.log("Dragon", this.dispatcher);
        this.element = typeof(element) === 'string' ? document.querySelector(element) : element;
    }
    getTouchNum(id) {
        for (let i = 0; i < touches.length; i++) {
          if (touches[i].id === id) {
            return i;
          }
        }
      }
    _onMouseDown(event) {
        this.mouse = {x: event.x, y: event.y, t: event.timeStamp, target: event.target};
        this.dispatcher.fire('MouseStart', this.mouse, event);
    }
    _onMouseUp(event) {
        this.mouse.x2 = event.x;
        this.mouse.y2 = event.y;
        this.mouse.t2 = event.timeStamp;
        this.mouse.dx = this.mouse.x2-this.mouse.x;
        this.mouse.dy = this.mouse.y2-this.mouse.y;
        this.mouse.dt = this.mouse.t2-this.mouse.t;
        this.dispatcher.fire('MouseEnd', this.mouse, event);
    }
    _onTouchStart(event) {
        const ct = event.changedTouches;
        for (let i = 0; i < ct.length ; i++) {
            let t = ct[i];

            this.touches.push({id: t.identifier, x: i.pageX, y: i.pageY, target: event.target, t: event.timeStamp});
            console.log(this.touches.length, t.identifier);
            if (this.touches.length === 1) {
                this.dispatcher.fire('FirstTouch', t, event);
            }
        }
    }   
    _onTouchEnd(event) {
        const ct = event.changedTouches;
        for (let i = 0; i < ct.length ; i++) {
            let t = ct[i];
            let idx = this.getTouchNum(t.identifier);
            let old = this.touches[idx];
            console.log(this.touches.length, t.identifier);
            if (this.touches.length === 1) {
                this.dispatcher.fire('LastTouch', {x: old.x, y: old.y, x2: t.pageX, y2: t.pageY, dx: t.pageX - old.x, dy: t.pageY - old.y, t: old.t, t2: t.timeStamp, dt: t.timeStamp - old.t}, event);
            }
            this.touches.splice(idx,1);
        }
    }
    _onTouchCancel(event) {
        const ct = event.changedTouches;
        for (let i = 0; i < ct.length; i++) {
          let idx = this.getTouchNum(ct[i].identifier);
          this.touches.splice(idx, 1);
        }
    }
}