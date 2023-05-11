import Transitions from './modules/Transitions.js'
import Gallery from './modules/Gallery.js'

import Debugger from './elements/Debugger.js';

import Sandwich from './elements/Sandwich.js';
import Search from './elements/Search.js';

import styles from '../css/default.css' assert { type: 'css' };
import forms from '../css/forms.css' assert { type: 'css' };


let gallery;
let search;
let firstRun = true;
let interactionRequired = false;

document.querySelector('menu-sandwich').onLoadPage = function (doc, page, data) {
  window.setFormValues(doc.querySelector('form'));
}
window.setFormValues = function (form) {
  form = form || document.querySelector('form');
  let prefs = gallery.getPreferences(true);
  if (form) {
    /* set form values of "settings"-page according to current gallery preferences */
    for (const [key, value] of Object.entries(prefs)) {
      let elements = form.querySelectorAll('[name="' + key + '"]');
      if (Array.isArray(value) && elements.length === 0) {
        elements = form.querySelectorAll('[name="' + key + '[]"]');        
      }
      elements.forEach(
        (el) => {
          if (el.options) {
            for (let i = 0; i < el.options.length; i++) {
              let option = el.options[i];
              if (option.value === value || (Array.isArray(value) && value.indexOf(option.value) !== -1)) {
                el.options[i].setAttribute('selected', '');
              } else {
                el.options[i].removeAttribute('selected');
              }
            }
          } else if (el.type === 'checkbox') {
            el.checked = (prefs[el.name] == true);
          } else if (el.type !== 'hidden') {
            el.value = value;
          }
        }
      );
    }
  }

}
window.onSubmitSettings = function (event, form) {
  event.preventDefault();
  //gallery.digestFormData(form);
  let formData = new FormData(form);
  let settings = {};
  for (const [key, value] of formData.entries()) {
    if (key.substring(key.length-2) === '[]') {
      if (!Array.isArray(settings[key])) {
        settings[key] = [];
      }
      /* append to existing key */
      settings[key].push(value);
    } else {
      settings[key] = value;
    }
  }
  let changeset = {};
  const url = new URL(window.location);
  for (let [key, value] of Object.entries(settings)) {
    url.searchParams.set("p."+key, value);
    key = key.substring(key.length-2) === '[]' ? key.substring(0, key.length - 2) : key;
    changeset[key] = value;
    gallery.set(key, value);
  }
  history.pushState({}, "", url);
  if (changeset['filters.safety']) {
    /* TODO: make gallery reinitialize when filters affect current image selection */
    gallery.applyFilters();
    gallery.setCurrentAlbumNum(0);
    gallery.setCurrentImageNum(0);
    gallery.init();
   
  }
  window.setFormValues();
}
function start() {

  document.querySelectorAll('.ssrContent').forEach((el) => {el.innerHTML = '';});
  const urlSearchParams = new URLSearchParams(window.location.search);
  let params = Object.fromEntries(urlSearchParams.entries());

  let tokens = decodeURI(window.location.pathname)?.split('/');
  if (tokens[1] === 'album') {
    /* extract album and photo title from window.location if it starts with /album */
    params.album = tokens[2];
    params.image = tokens[3];
  }

  gallery = document.getElementById("gallery");
  if (!gallery) {
    gallery = new Transitions();
    //gallery = new Gallery();
  }

  if (params?.debug === 'screen') {
    let debug = new Debugger(gallery, ['onEvent'], ['suspended', 'transitionFrame', 'breakTimeFrame', 'currentImageNum', 'currentAlbumNum', 'userIdleTime'], ['Paused', 'Idle', 'MouseMove']);
    document.body.appendChild(debug);
  }

  gallery.setAttribute('id', 'gallery');
  document.body.appendChild(gallery);
  window.gallery = gallery;

  gallery.loadData('/data/albums.json').then(data => {
    console.log("params", params);
    gallery.setAlbums(data);
    gallery.importPreferences(params);
    gallery.init(params);
    gallery.run();
    window.setFormValues();
    updateSearchResults();
    /*
      }).catch(error => {
      gallery.loadData('./data/example.json').then(data => {
        gallery.setImages(data);
        gallery.init(params);
        gallery.run();
    })
        */
  });

  if (params?.order === 'shuffle') {
    gallery.setShuffleMode(true);
  }
  function updateSearchResults(searchterm) {
    let results = gallery.getFilteredResults({searchterm: searchterm});
    search.querySelectorAll('.searchResults').forEach(
      (el) => {
        el.innerHTML = "<span class='highlight'>"+results.photos.length+"</span> photos in <span class='highlight'>"+results.albums.length+"</span> albums";
      });
  }
  function doSearch(searchterm) {
    gallery.applyFilters({searchterm: searchterm});
    gallery.setCurrentAlbumNum(0);
    gallery.setCurrentImageNum(0);
    gallery.init();    
  }
  if (firstRun) {
    document.querySelectorAll('.requestFullscreen').forEach(
      (el) => {
        gallery.requestFullscreen(el, document.getElementById('fullscreenRoot'));
      }
    );
    search = document.querySelector('div-search');
    let icon = search.querySelector('.icon');
    icon.addEventListener('click', (event) => {search.input.value = ''; doSearch('') });
    
    search.onKeyUp = (event) => {
      updateSearchResults(event.target.value);
    }
    search.onSubmit = (event) => {
      doSearch(event.target.value);
    };
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
    gallery.loadData('/data/meta.json').then(data => {
      if (data) {
        console.log("meta data loaded", data);
        gallery.setMetaData(data);
        document.querySelectorAll('.meta-title')?.forEach((element) => element.innerHTML = data?.title);
      }
    });
    firstRun = false;
  }

  document.querySelectorAll('button.topic').forEach((button) => {
    if (button.dataset.topic === gallery.preferences.transition) {
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
    gallery.onIdle(180);
  }
  gallery.onPureEnd = () => {
    gallery.onIdleEnd();
  }

  gallery.onIdle = (idleTime) => {
    if (idleTime == 180) {
      document.querySelectorAll('.idleHide').forEach((element) => { element.classList.add('hide'); })
      //      } else if (idleTime == 200) {
      //        document.querySelectorAll('menu-sandwich').forEach((el) => {el._onToggle(false);});        
    }
  }
  gallery.onPauseStart = () => {
    updatePauseButtons('paused');
  }
  gallery.onPauseEnd = () => {
    updatePauseButtons('running');
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
  gallery.onRequireInteraction = function (video) {
    updatePauseButtons('requiresInteraction');
    console.log("Gallery requires interaction");
    interactionRequired = true;
  }
}

function updatePauseButtons(state) {
  document.querySelectorAll('.controls .button.toggle').forEach((el) => {
    if (el.previousState) {
      el.classList.remove(el.previousState);
      el.previousState = undefined;
    }
    el.classList.add('stress', state);
    el.previousState = state;
    setTimeout(() => {
      el.classList.remove('stress')
    }, 1000);  
    }
  );
}
function interactionHappened() {
  updatePauseButtons('running');
  gallery.dispatchEvent("VideoPlay");
  interactionRequired = false;
}
function togglePause(value = undefined) {
  if (interactionRequired) {
    interactionHappened();
  } else {
    gallery.setPaused(value);
  }
}
function move(delta) {
  gallery.navigate(delta);
  // gallery.direction = "random" /* in order to change direction permanently, change "direction"-parameter instead */
}

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
  document.addEventListener('mousedown', () => {
    interactionHappened();
  });
  document.addEventListener('keydown', () => {
    interactionHappened();
  });
  document.querySelectorAll('.controls .button.navi').forEach(
    button =>
      button.addEventListener("click", () => move(button.dataset.target))
  );
});
