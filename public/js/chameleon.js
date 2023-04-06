import DotGain from './classes/DotGain.js';
import Gallery from './classes/Gallery.js'
let gallery;
let images = ['images/example.png','images/example2.jpg','images/example3.jpg'];
  function start(theme) {
    const canvas = document.getElementById("gallery");
    if (gallery) {
      gallery.destroy();
    }    
    if (theme == 'Sstandard') {
      gallery = new Gallery(canvas);
    } else  {
      gallery = new DotGain(canvas);
    }
    gallery.addImages(images);
    gallery.direction = "random";
    gallery.init();
    gallery.run();
  }
  function move(delta) {
    gallery.navigate(delta);
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
        button.addEventListener("click", () => move(button.dataset.add))
    );
  });
