export default class Dispatcher {
    context = undefined;
    listeners = undefined;
    constructor(context, listeners = undefined) {
        this.setContext(context);
        if (listeners) {
            this.setListeners(listeners);
            this.init();    
        }
    }
    setContext(context) {
        this.context = context;
    }
    setListeners(listeners) {
        this.listeners = listeners;
    }
    destroy() {
        this.init(true)
    }
    init(destroy = false) {
        let listeners = this.listeners;
        let action = (destroy === true) ? 'removeEventListener' : 'addEventListener';
        if (Array.isArray(listeners)) {
            /* IMPLEMENT Array Syntax: ['document.MouseMove', 'window.Resize', ...] */
        } else {
            for (let node of Object.keys(listeners)) {
            	  let list = listeners[node];
                let nodeObj;
                switch (node) {
                	case 'document':
                  	nodeObj = document;
                    break;
                  case 'window':
                    nodeObj = window;
                    break;
                  case 'context':
                    nodeObj = this.context;
                    break;
                  default:
                  	nodeObj = document.querySelector(node);
                }
                for (let event of list) {
                  if (Array.isArray(event)) {
	                  nodeObj[action](event[0].toLowerCase(), (e) => this.fire(event[1], e));      
                  } else {
	                  nodeObj[action](event.toLowerCase(), (e) => this.fire(event, e));      
                  }
                }
            }
        }
        this.listeners = listeners;
    }
    destroy() {

    }
    fire(eventName, ...args) {
		let callbackName = 'on'+eventName;
        let internalCallbackName = '_on'+eventName;
        if (typeof this.context.onEvent === 'function') {
            this.context.onEvent(eventName, ...args);
        }

        if (typeof this.context[internalCallbackName] === 'function') {
            this.context[internalCallbackName](...args);
        }
        if (typeof this.context[callbackName] === 'function') {
            this.context[callbackName](...args);
        }
    }
}