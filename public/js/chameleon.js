import DotGain from './classes/DotGain.js';
import Gallery from './classes/Gallery.js'
let gallery;
let images = [
  {src: 'images/example.png', title: '<h2>Hohe Tatra</h2>', 'location': 'High Tatra | Slovakia', 'date': '2021-07-06'},
  {src: 'images/example2.jpg', title: '<h2>Monteverde</h2><h3></h3>', 'location': 'Gomera | Canary Islands'},
  {src: 'images/example3.jpg', title: '<h2>Wetterleuchten am Zalew Wióry</h2>', 'location': 'Poland', link: '<a href="https://www.flickr.com/photos/timor-kodal/51343261551/in/datetaken-public/" target="_blank">link</a>'}
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
    // gallery.onTransitionStart = (transition) => {gallery.currentDirection += (gallery.getCurrentImageNum() % 2 == 0) ? 1 : -1;}
    // etc.

    /* set event listeners */
    gallery.onImageLoad = onImageLoad;
    addEventListener('resize', onResize);
    screen.orientation.addEventListener("change", onResize);

    gallery.direction = "random";
    onResize();
    gallery.run();

    function onImageLoad(payload, ...args) {
      document.querySelectorAll('.infoOverlay').forEach((element) => {
        element.classList.add('hide');
      })
      setTimeout(() => showImageInfo(payload, args), 2000);
    }
    function onResize(event = null) {
        var scale = 'scale(1)';
        document.body.style.webkitTransform =  scale;
        document.body.style.msTransform =   scale;
        document.body.style.transform = scale;
        if (gallery) {
          gallery.init();
        }
    }
    function showImageInfo(payload, ...args) {
      document.querySelectorAll('.infoOverlay').forEach((element) => {
        element.classList.remove('hide');
      })
      document.querySelectorAll('.infoOverlay .imageInfo').forEach((element) => {
        element.classList.remove('hide');
        let list = {...payload.image};
        delete list?.src;
        if (typeof list === 'string' || list instanceof String || Object.keys(list).length === 0) {
            let span = document.createElement('span');
            span.classList.add('noInfo');
            element.replaceChildren(span.innerHTML = "No Information available");
          } else {
            let ul = document.createElement('ul');
            for (let key in list) {
              let li = document.createElement('li');
              li.classList.add(key);
              let div = document.createElement('div');
              div.classList.add('label');
              let span = document.createElement('span');
              span.innerHTML = key;
              div.appendChild(span);
              li.appendChild(div);
              div = document.createElement('div');
              div.classList.add('value');
              span = document.createElement('span');
              span.innerHTML = payload.image[key];
              div.appendChild(span);
              li.appendChild(div);
              ul.appendChild(li);  
            }
            element.replaceChildren(ul);
          }
        }
      );
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
