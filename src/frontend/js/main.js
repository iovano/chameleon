import Transitions from './modules/Transitions.js'
import Gallery from './modules/Gallery.js'

import Sandwich from './elements/Sandwich.js';

import styles from '../css/default.css' assert { type: 'css' };
import forms from '../css/forms.css' assert { type: 'css' };
import debug from '../css/debug.css' assert { type: 'css' };


let gallery;
let theme;
let firstRun = true;

document.querySelector('menu-sandwich').onLoadPage = function (doc, page, data) {
  window.setFormValues(doc.querySelector('form'));
}
window.setFormValues = function (form) {
  form = form || document.querySelector('form');
  let prefs = gallery.getPreferences(true);
  prefs.theme = window.theme || 'DotGain';
  if (form) {
    /* set form values of "settings"-page according to current gallery preferences */
    for (const [key, value] of Object.entries(prefs)) {
      const el = form.querySelector('[name="' + key + '"]');
      if (el) {
        if (el.options) {
          for (let i = 0; i < el.options.length; i++) {
            let option = el.options[i];
            if (option.value === value || (Array.isArray(value) && value.indexOf(option.value) !== -1)) {
              el.options[i].setAttribute('selected', '');
            }
          }
        } else {
          el.value = value;
        }
      }
    }
  }

}
window.onSubmitSettings = function (event, form) {
  event.preventDefault();
  let formData = new FormData(form);
  let settings = {};
  for (const [key, value] of formData.entries()) {
    if (settings[key]) {
      if (!Array.isArray(settings[key])) {
        settings[key] = [settings[key]];
      }
      /* append to existing key */
      settings[key].push(value);
    } else {
      settings[key] = value;
    }
  }
  for (const [key, value] of Object.entries(settings)) {
    gallery.set(key, value);
  }
  if (settings['filters.safety']) {
    /* TODO: make gallery reinitialize when filters affect current image selection */
    gallery.applyFilters();
    gallery.setCurrentAlbumNum(0);
    gallery.setCurrentImageNum(0);
    gallery.init();
  }
  window.setFormValues();
}
function start(newTheme) {

  const urlSearchParams = new URLSearchParams(window.location.search);
  let params = Object.fromEntries(urlSearchParams.entries());
  theme = newTheme || params?.theme || 'DotGain';
  window.theme = theme;

  if (window.screenTop || window.screenY) {
    const url = new URL(window.location);
    if (theme) {
      url.searchParams.set('theme', theme);
    } else {
      url.searchParams.delete('theme');
    }
    history.pushState({}, "", url);
  }

  gallery = document.getElementById("gallery");
  if (!gallery) {
    gallery = new Transitions();
    //gallery = new Gallery();
  }

  if (params?.debug === 'screen') {
    let lastMessage;
    let repetitions = 0;
    function debug(event, ...payload) {
      let target = debugContent;
      if (event === lastMessage) {
        repetitions ++;
        return;
      } else if (repetitions > 1) {
        let span = document.createElement('span'); 
        span.classList.add("repetitions ");
        span.innerHTML = ".."+repetitions+"x ";
        target.appendChild(span);
      }
      repetitions = 0;
      let atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 1
      let span = document.createElement('span');
      span.classList.add(event);
      span.innerHTML = event;
      target.appendChild(span);
      if (payload !== undefined && payload.length > 0) {
        for (let i = 0; i < payload.length; i++) {
          if (payload[i] === undefined) {
            continue;
          }
          span = document.createElement('span');
          span.classList.add(event, "payload");
          span.innerHTML = " "+JSON.stringify(payload[i]);
          target.appendChild(span);  
        }  
      }
      span = document.createElement('span');
      span.innerHTML = ' ';
      target.appendChild(span);
      if (atBottom) {
        target.scrollTo(0, target.scrollHeight);
      }
      lastMessage = event;
    }

    let debugContainer = document.createElement('div');
    debugContainer.classList.add('debugContainer');
    document.body.appendChild(debugContainer);
    let debugHeader = document.createElement('div');
    debugHeader.classList.add('header');
    debugContainer.appendChild(debugHeader);
    let debugContent = document.createElement('div');
    debugContent.classList.add('content');
    debugContainer.appendChild(debugContent);

    gallery.onEvent = (event, ...props) => {
      let p = ['suspended', 'transitionFrame', 'breakTimeFrame', 'currentImageNum', 'currentAlbumNum', 'userIdleTime'];
      debugHeader.innerHTML = '';
      for (let i = 0; i < p.length ; i++) {
        let div = document.createElement('div');
        let span = document.createElement('span');
        span.classList.add('label', p[i]);
        span.innerHTML = p[i];
        div.appendChild(span);
        span = document.createElement('span');
        span.classList.add('value', p[i]);
        span.innerHTML = gallery[p[i]];
        div.appendChild(span);
        debugHeader.appendChild(div);
      }
      
      if (['Paused', 'Idle'].indexOf(event) === -1) debug(event, ...props);
    }
    console.log = function (message, ...props) {
      if (typeof message == 'object') {
        debug('log', JSON.stringify(message));
      } else {
        debug('log', message, JSON.stringify(props));
      }
    }
  }


  gallery.preferences.transition = theme || 'random';
  gallery.setAttribute('id', 'gallery');
  document.body.appendChild(gallery);
  window.gallery = gallery;

  gallery.loadData('./data/albums.json').then(data => {
    gallery.setAlbums(data);
    gallery.init(params);
    gallery.run();
    /*
      }).catch(error => {
      gallery.loadData('./data/example.json').then(data => {
        gallery.setImages(data);
        gallery.init(params);
        gallery.run();
    })
        */
  });

  if (firstRun) {
    document.querySelectorAll('.requestFullscreen').forEach(
      (el) => {
        gallery.requestFullscreen(el, document.getElementById('fullscreenRoot'));
      }
    );
    document.querySelectorAll('menu-sandwich').forEach(
      (el) => {
        el.onToggle = (expanded) => {
          if (expanded) {
            gallery.dispatchEvent("PureStart");
          } else {
            gallery.dispatchEvent("PureEnd");
          }
        }
        el.init();
      }
    );
    gallery.loadData('./data/meta.json').then(data => {
      if (data) {
        gallery.setMetaData(data);
        document.querySelectorAll('.meta-title')?.forEach((element) => element.innerHTML = data?.title);
      }
    });

  }

  document.querySelectorAll('button.topic').forEach((button) => {
    if (button.dataset.topic === theme) {
      button.classList.add('active')
    } else {
      button.classList.remove('active');
    }
  })
    ;



  //gallery.setImages(albums);

  // in order to listen to all events from the gallery, you can implement "eventHandler" and digest events yourself:
  // gallery.eventHandler = (event, payload, args) => {console.log(event);console.log(payload);console.log(args);}

  // in order to digest particular events, you can do so by implementing a custom callback function which will be called when a certain event has been dispatched, for example:
  // gallery.onNavigation(event);
  // gallery.onImageLoad(event);
  // gallery.onTransisitionEnd(image);
  // gallery.onCanvasCreated(canvasObject);
  // gallery.onTransition = (transition) => {gallery.currentDirection += (gallery.getCurrentImageNum() % 2 == 0) ? 1 : -1;}
  // etc.

  /* set event listeners */

  //screen.orientation.addEventListener("change", onResize); /* TODO: CHECK WHY RESIZE DOES NOT WORK ON iOS */

  gallery.direction = "random";
  gallery.onPureStart = () => {
    console.log("pure start");
    gallery.onIdle(60);
  }
  gallery.onPureEnd = () => {
    gallery.onIdleEnd();
  }

  gallery.onIdle = (idleTime) => {
    if (idleTime == 60) {
      document.querySelectorAll('.idleHide').forEach((element) => { element.classList.add('hide'); })
      //      } else if (idleTime == 200) {
      //        document.querySelectorAll('menu-sandwich').forEach((el) => {el._onToggle(false);});        
    }
  }
  gallery.onPauseStart = () => {
    updatePauseButtons(true);
  }
  gallery.onPauseEnd = () => {
    updatePauseButtons(false);
  }
  gallery.onIdleEnd = (idleTime) => {
    if (!gallery.pureMode) {
      document.querySelectorAll('.idleHide').forEach((element) => { element.classList.remove('hide'); })
    }
  }
  gallery.onNavigation = function (payload) {
    if (document.querySelector('div.curtain')) {
      document.querySelector('div.curtain').classList.add('hide');
      setTimeout(
        () => {
          document.querySelector('div.curtain').classList.add('disabled');
          document.body.removeChild(document.querySelector('div.curtain'));
        }, 2000
      );
      document.body.classList.remove('darkness');
    }
    gallery.currentDirection = { '-1': 90, '+1': 270 }[payload.target] || gallery.currentDirection;
  }

  gallery.onResize = function () {
    var scale = 'scale(1)';
    document.body.style.webkitTransform = scale;
    document.body.style.msTransform = scale;
    document.body.style.transform = scale;
    if (!gallery.isFullscreen()) {
      window.scrollTo(0, 0);
    }
  }
  firstRun = false;
}
function updatePauseButtons(paused) {
  document.querySelectorAll('.controls .button.toggle').forEach((el) => {
    console.log("update pause ", el);
    el.classList.add('stress');
    if (paused) {
      el.classList.add('paused');
    } else {
      el.classList.remove('paused');
    }
    setTimeout(() => {
      el.classList.remove('stress')
    }, 1000);
  }
  );
}
function togglePause(value = undefined) {
  gallery.setPaused(value);
}
function move(delta) {
  gallery.navigate(delta);
  // gallery.direction = "random" /* in order to change direction permanently, change "direction"-parameter instead */
}
window.startTheme = start;
document.addEventListener("DOMContentLoaded", function () {
  start();
  document.querySelectorAll('button.topic').forEach(
    button =>
      button.addEventListener("click", () => start(button.dataset.topic))
  );
  document.querySelectorAll('.controls .button.toggle').forEach(
    button =>
      button.addEventListener("click", () => togglePause())
  );

  document.querySelectorAll('.controls .button.navi').forEach(
    button =>
      button.addEventListener("click", () => move(button.dataset.target))
  );
});
