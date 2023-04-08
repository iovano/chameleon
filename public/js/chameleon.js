import DotGain from './classes/DotGain.js';
import Gallery from './classes/Gallery.js'
let gallery;
let images = [
  {src: 'images/example.png', title: '<h2>Hohe Tatra</h2>', 'location': 'High Tatra | Slovakia', 'date': '2021-07-06'},
  {src: 'images/example2.jpg', title: '<h2>Monteverde</h2><h3></h3>', 'location': 'Gomera | Canary Islands'},
  {src: 'images/example3.jpg', title: '<h2>Wetterleuchten am Zalew Wióry</h2>', 'location': 'Poland', link: '<a href="https://www.flickr.com/photos/timor-kodal/51343261551/in/datetaken-public/" target="_blank">link</a>'},
  'images/FoKo-WEuro-22-0028.jpg','images/FoKo-WEuro-22-0048.jpg','images/FoKo-WEuro-22-0109.jpg','images/FoKo-WEuro-22-0261.jpg','images/FoKo-WEuro-22-9940.jpg','images/Osteuropa-2021-7574.jpg'
  
  ];
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
    gallery.addImages(images);
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
      document.querySelector('header').classList.add('hide');
      document.querySelectorAll('.controls').forEach((element) => {element.classList.add('hide');})
      document.body.classList.add('noCursor');
    }
    gallery.onIdleEnd = (idleTime) => {
      document.querySelector('header').classList.remove('hide');
      document.querySelectorAll('.controls').forEach((element) => {element.classList.remove('hide');})
      document.body.classList.remove('noCursor');
    }
    onResize();
    gallery.run();

    function onResize(event = null) {
        var scale = 'scale(1)';
        document.body.style.webkitTransform =  scale;
        document.body.style.msTransform =   scale;
        document.body.style.transform = scale;
        if (gallery) {
          gallery.init();
        }
        window.scrollTo(0,0);
    }
  }
  function move(delta) {
    gallery.navigate(delta);
    gallery.currentDirection = delta === "-1" ? 90 : 270; /* temporarily change transition direction via "currentDirection". */
    // gallery.direction = "random" /* in order to change direction permanently, change "direction"-parameter instead */
  }
  window.startTheme = start;
  document.addEventListener("DOMContentLoaded", function () {
    start('standard');
    document.querySelectorAll('button.topic').forEach(
      button =>
        button.addEventListener("click", () => start(button.dataset.topic))
    );
    document.querySelectorAll('.controls .button').forEach(
      button =>
        button.addEventListener("click", () => move(button.dataset.target))
    );
  });
