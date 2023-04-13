import DotGain from './classes/DotGain.js';
import Gallery from './classes/Gallery.js'
let gallery;
let albums = [
  {
    title: 'Osteuropa',
    description: 'Bilder von Reisen nach Osteuropa',
    images: [
  {src: 'images/example.png', title: 'Hohe Tatra im Abendlicht', 'location': 'High Tatra | Slovakia', 'date': '2021-07-06'},
  {src: 'images/example3.jpg', title: 'Wetterleuchten am Zalew Wióry', 'location': 'Poland', link: '<a href="https://www.flickr.com/photos/timor-kodal/51343261551/in/datetaken-public/" target="_blank">link</a>'},
  {src: 'images/Osteuropa-2021-7574.jpg', title: 'Garagen in Oschgorod', 'location': 'Ukraine'}
  
  ]},
  {
    title: 'Spanien',
    description: 'Reisefotos vom spanischen Festland und den Kanaren',
    images: [{src: 'images/example2.jpg', title: 'Monteverde', 'location': 'Gomera | Canary Islands'},
    'images/FoKo-WEuro-22-0028.jpg','images/FoKo-WEuro-22-0048.jpg','images/FoKo-WEuro-22-0109.jpg','images/FoKo-WEuro-22-0261.jpg','images/FoKo-WEuro-22-9940.jpg'
    ]}
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
      onResize();
      gallery.run();
  })
    
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
      document.querySelector('header').classList.add('hide');
      document.querySelector('#gallery .canvasContainer .filmStrip')?.classList.add('hide');
      document.querySelectorAll('.controls').forEach((element) => {element?.classList.add('hide');})
      document.body.classList.add('noCursor');
    }
    gallery.onIdleEnd = (idleTime) => {
      document.querySelector('header')?.classList.remove('hide');
      document.querySelector('#gallery .canvasContainer .filmStrip')?.classList.remove('hide');
      document.querySelectorAll('.controls').forEach((element) => {element?.classList.remove('hide');})
      document.body.classList.remove('noCursor');
    }
    gallery.onNavigation = function (payload) {
      gallery.currentDirection = {'-1': 90, '+1': 270}[payload.target] || gallery.currentDirection;
    }

    function onResize(event = null) {
        var scale = 'scale(1)';
        document.body.style.webkitTransform =  scale;
        document.body.style.msTransform =   scale;
        document.body.style.transform = scale;
        gallery.init(params);
        window.scrollTo(0,0);
    }
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
    document.querySelectorAll('.controls .button').forEach(
      button =>
        button.addEventListener("click", () => move(button.dataset.target))
    );
  });
