import DotGain from './modules/DotGain.js';
import Gallery from './modules/Gallery.js'


let gallery;
  function start(theme) {

    const canvas = document.getElementById("gallery");
    if (gallery) {
      gallery.destroy();
    }    
    if (theme == 'standard') {
      gallery = new Gallery(canvas);
    } else {
      gallery = new DotGain(canvas);
    }
    document.querySelectorAll('.requestFullscreen').forEach(
      (el) => {gallery.requestFullscreen(el, document.getElementById('fullscreenRoot'));}
    );
    //gallery.setPaused(true);
  
    document.querySelectorAll('button.topic').forEach((button) => {
        if (button.dataset.topic === theme) {
          button.classList.add('active')
        } else {
          button.classList.remove('active');
        }
      })
    ;
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
 
    gallery.loadData('./data/meta.json').then(data => {
      if (data) {
        gallery.setMetaData(data);
        document.querySelectorAll('.meta-title')?.forEach((element) => element.innerHTML=data?.title);  
      }
    });
 
    gallery.loadData('./data/albums.json').then(data => {
      gallery.setImages(data);
      gallery.init();
      gallery.run();
  }).catch(error => {
    gallery.loadData('./data/example.json').then(data => {
      gallery.setImages(data);
      gallery.init();
      gallery.run();
  })

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
    addEventListener('resize', onResize);

    window.addEventListener("orientationchange", onResize);
    //screen.orientation.addEventListener("change", onResize); /* TODO: CHECK WHY RESIZE DOES NOT WORK ON iOS */

    gallery.direction = "random";
    gallery.onIdle = (idleTime) => {
      if (idleTime == Math.floor(gallery.infoBoxDuration / 2)) {
        document.querySelector('header').classList.add('hide');
        document.querySelectorAll('.controls').forEach((element) => {element?.classList.add('hide');})
      } else if (idleTime == gallery.infoBoxDuration) {
        document.querySelector('#gallery .canvasContainer .filmStrip')?.classList.add('hide');
        document.body.classList.add('noCursor');  
      }
    }
    gallery.onPauseStart = () => {
      updatePauseButtons(true);
    }
    gallery.onPauseEnd = () => {
      updatePauseButtons(false);
    }
    gallery.onIdleEnd = (idleTime) => {
      document.querySelector('header')?.classList.remove('hide');
      document.querySelector('#gallery .canvasContainer .filmStrip')?.classList.remove('hide');
      document.querySelectorAll('.controls').forEach((element) => {element?.classList.remove('hide');})
      document.body.classList.remove('noCursor');
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

    function onResize(event = null) {
        var scale = 'scale(1)';
        document.body.style.webkitTransform =  scale;
        document.body.style.msTransform =   scale;
        document.body.style.transform = scale;
        gallery.resize();
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
    start('dotgain');
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
