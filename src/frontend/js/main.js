import DotGain from './modules/DotGain.js';
import Fader from './modules/Fader.js';
import Roam from './modules/Roam.js';
import Gallery from './modules/Gallery.js'
import Sandwich from './elements/Sandwich.js';


import debug from 'debug';
const log = debug('app:log');
let gallery;

if (ENV !== 'production') {
  debug.enable('*');
  log('Logging is enabled!');
} else {
  debug.disable();
}

document.querySelector('menu-sandwich').onLoadPage = function (doc, page, data) {
  let form = doc.querySelector('form');
  let prefs = gallery.getPreferences(true);
  if (form) {
    for (const [key, value] of Object.entries(prefs)) {
      const el = form.querySelector('[name="'+key+'"]');
      if (el) {
        if (el.options) {
          for (let i = 0 ; i < el.options.length ; i++) {
            let option = el.options[i];
            el.options[i].setAttribute('selected', (option.value === value || (Array.isArray(value) && value.indexOf(option.value) !== -1)) ? 'selected' : '');
          }
        }
        el.value = value;
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
        settings[key].push (value);
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
}
function start(theme) {
  const urlSearchParams = new URLSearchParams(window.location.search);
  let params = Object.fromEntries(urlSearchParams.entries());
  theme = theme || params?.theme || 'DotGain';
  
  gallery = document.getElementById("gallery");
  if (!gallery) {
    switch (theme.toLowerCase()) {
      case "dotgain": gallery = new DotGain(); break;
      case "roam": gallery = new Roam(); break;
      default: gallery = new Gallery();
    }
    gallery.setAttribute('id', 'gallery');
    document.body.appendChild(gallery);
  }
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

  document.querySelectorAll('.requestFullscreen').forEach(
    (el) => {
      gallery.requestFullscreen(el, document.getElementById('fullscreenRoot'));
    }
  );
  //gallery.setPaused(true);
  document.querySelectorAll('menu-sandwich').forEach(
    (el) => {
      el.onToggle = (expanded) => {
        if (expanded) {
          gallery.dispatchEvent("PureStart");
        } else {            
          gallery.dispatchEvent("PureEnd");
        }
      }
    }
  );

  document.querySelectorAll('button.topic').forEach((button) => {
      if (button.dataset.topic === theme) {
        button.classList.add('active')
      } else {
        button.classList.remove('active');
      }
    })
  ;

  gallery.loadData('./data/meta.json').then(data => {
    if (data) {
      gallery.setMetaData(data);
      document.querySelectorAll('.meta-title')?.forEach((element) => element.innerHTML=data?.title);  
    }
  });

  
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
      document.querySelectorAll('.idleHide').forEach((element) => {element.classList.add('hide');})
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
      document.querySelectorAll('.idleHide').forEach((element) => {element.classList.remove('hide');})
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
    gallery.currentDirection = {'-1': 90, '+1': 270}[payload.target] || gallery.currentDirection;
  }

  gallery.onResize = function() {
      var scale = 'scale(1)';
      document.body.style.webkitTransform =  scale;
      document.body.style.msTransform =   scale;
      document.body.style.transform = scale;
      if (!gallery.isFullscreen()) {
        window.scrollTo(0,0);
      }
  }
}
function updatePauseButtons(paused) {
  document.querySelectorAll('.controls .button.toggle').forEach( (el) => {
    console.log("update pause ",el);
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
