//import css from '../../css/filmstrip.css' assert { type: 'css' }; /* this currently does not work (chrome v101, safari, ...) */

//document.adoptedStyleSheets.push(css);

class FilmStrip extends HTMLElement {
    images = [];
    info = undefined;
    selectedImageNum = undefined;
    container = undefined;
    list = undefined;
    listElements = [];
    constructor(images = undefined, info = undefined, selectedImageNum = undefined) {
        super();
        this.setImages(images);
        this.setInfo(info);
        this.render(selectedImageNum);
    }
    setImages(images) {
        this.images = images;
    }
    setInfo(info) {
        this.info = info;
    }
    getInfo() {
        return this.info;
    }
    select(selectedImageNum) {
        if (this.selectedImageNum !== undefined) {
            this.listElements[this.selectedImageNum].classList.remove('selected');
        }
        let el = this.listElements[selectedImageNum];
        if (!el) {
            console.error("filmstrip item #"+selectedImageNum+" not found");
            return;
        }
        let itemsVisible = this.list.clientWidth / this.listElements[selectedImageNum].clientWidth || 1;
        let itemWidth = el.clientWidth;
        let paddingOffset = this.listElements[0].offsetLeft;
        let item = {x1: el.offsetLeft, x2: el.offsetLeft+itemWidth};
        
        this.list.scrollTo((selectedImageNum - itemsVisible / 2 + 1) * itemWidth - paddingOffset, 0);
        this.listElements[selectedImageNum].classList.add('selected');
        this.selectedImageNum = selectedImageNum;

    }
    _onSelectImage(event, selectedImage, selectedImageNum) {
        if (this.onSelectImage) {
            this.onSelectImage(event, selectedImage, selectedImageNum);
        }
        this.select(selectedImageNum);
    }
    createFilmStripItems() {
        let ul = document.createElement('ul');
        for(let i = 0;i < this.images.length; i++) {
            let li = document.createElement('li');
            if (this.selectedImageNum === i) {
                li.classList.add('selected');
            } else {
                li.classList.remove('selected');
            }
            let img = document.createElement('img');
            if (this.images[i]?.size && Array.isArray(this.images[i].size)) {
                img.src = this.images[i].size[this.images[i].size.length -1];
            } else {
                img.src = this.images[i]?.src || this.images[i];
            }
            img.addEventListener("click", (event) => this._onSelectImage(event, this.images[i], i));
            if (this.images[i]?.title) {
                img.setAttribute('title', this.images[i].title);
            }    
            li.appendChild(img);
            this.listElements[i] = li;
            ul.appendChild(li);
        }
        return ul;
    }
    render(selectedImageNum = undefined) {
        if (selectedImageNum) {
            this.selectedImageNum = selectedImageNum;
        }
        let div = document.createElement('div');
        div.classList.add('filmStripContainer');
        let ul = this.createFilmStripItems();

        div.appendChild(ul);
        
        /* Current Album Tab */
        let title = document.createElement('div');
        title.classList.add('tab', 'title');
        title.innerHTML = this.info?.title ? this.info.title : 'Album';
        if (this.info?.description) {
            title.setAttribute('title', this.info.description);
        }    
        div.appendChild(title);
        
        this.replaceChildren(div);
        this.list = ul;
        this.container = div;
    }
}
customElements.define('film-strip',FilmStrip);

export default FilmStrip;