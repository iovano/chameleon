import debug from '../../css/debug.css' assert { type: 'css' };

export default class Debugger extends HTMLElement {
  lastMessage;
  keepEventsNum = 50;
  repetitions = 0;
  skipRedundantMessages = false;
  debugContainer;
  debugHeader;
  debugContent;
  context;
  constructor(context, watchListeners = [], watchProperties = [], ignoreEvents = []) {
    super();
    this.context = context;
    this.watchProperties = watchProperties;
    this.watchListeners = watchListeners;
    this.ignoreEvents = ignoreEvents;
    this.buildContainer();
    this.addWatchers();
    
    console.log = function (message, ...props) {
      if (typeof message == 'object') {
        this.debug('log', JSON.stringify(message));
      } else {
        this.debug('log', message, JSON.stringify(props));
      }
    } 
       
  }
  addWatchers() {
    for (let i = 0; i < this.watchListeners.length ; i ++) {
      let listener = this.watchListeners[i];
      this.context[listener] = (event, ...props) => {
        this.onWatch(event, ...props);
      }  
    }
  }
  onWatch(event, ...props) {
    let p = this.watchProperties;
    this.debugHeader.innerHTML = '';
    for (let i = 0; i < p.length ; i++) {
      let div = document.createElement('div');
      let span = document.createElement('div');
      span.classList.add('label', p[i]);
      span.innerHTML = p[i];
      div.appendChild(span);
      span = document.createElement('div');
      span.classList.add('value', p[i]);
      span.innerHTML = this.context[p[i]];
      div.appendChild(span);
      this.debugHeader.appendChild(div);
    }
    if (this.ignoreEvents.indexOf(event) === -1) this.debug(event, ...props);
  }
  cutOff() {
    while (this.debugContent.children.length > this.keepEventsNum) {
      this.debugContent.removeChild(this.debugContent.firstChild);
    }
  }
  buildContainer() {
    this.debugContainer = document.createElement('div');
    this.debugContainer.classList.add('debugContainer');
    this.appendChild(this.debugContainer);

    this.debugHeader = document.createElement('div');
    this.debugHeader.classList.add('header');
    this.debugContainer.appendChild(this.debugHeader);
    
    this.debugContent = document.createElement('div');
    this.debugContent.classList.add('content');
    this.debugContainer.appendChild(this.debugContent);    
  }
  debug(event, ...payload) {
    let target = this.debugContent;
    let atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 1
    if (this.skipRedundantMessages) {
      if (event === this.lastMessage) {
        this.repetitions++;
        return;
      } else if (this.repetitions > 1) {
        let span = document.createElement('span');
        span.classList.add("repetitions");
        span.innerHTML = ".." + this.repetitions + "x ";
        target.appendChild(span);
      }  
    }
    this.repetitions = 0;
    let div = document.createElement('div');
    div.classList.add('event', event);
    let span = document.createElement('span');
    span.innerHTML = event;
    div.appendChild(span);

    if (payload) {
      span = document.createElement('span');
      span.classList.add(event, "payload");
      span.innerHTML = " " + JSON.stringify(payload);
      div.appendChild(span);
  
    }

    span = document.createElement('span');
    span.innerHTML = ' ';
    div.appendChild(span);
    target.appendChild(div);
    if (atBottom) {
      target.scrollTo(0, target.scrollHeight);
    }
    this.lastMessage = event;
    this.cutOff();
  }
}
customElements.define('screen-debugger',Debugger);