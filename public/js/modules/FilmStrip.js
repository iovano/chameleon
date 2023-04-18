//import css from '../../css/filmstrip.css' assert { type: 'css' }; /* this currently does not work (chrome v101, safari, ...) */

//document.adoptedStyleSheets.push(css);

class FilmStrip extends HTMLElement {
    images = [];
    info = undefined;
    selectedImageNum = undefined;
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
        let itemsVisible = this.list.clientWidth / el.clientWidth || 1;
        let itemWidth = el.clientWidth;
        let paddingOffset = this.listElements[0].offsetLeft;
        let item = {x1: el.offsetLeft, x2: el.offsetLeft+itemWidth};
        
        this.list.scrollTo((selectedImageNum - itemsVisible / 2 + 1) * itemWidth - paddingOffset, 0);
        this.listElements[selectedImageNum].classList.add('selected');
        this.selectedImageNum = selectedImageNum;

    }
    _onClick(event, selectedImage) {
        if (this.onClick) {
            this.onClick(event, selectedImage);
        }
        this.select(selectedImage);
    }
    render(selectedImageNum = undefined) {
        if (selectedImageNum) {
            this.selectedImageNum = selectedImageNum;
        }
        let div = document.createElement('div');
        div.classList.add('filmStripContainer');
        let ul = document.createElement('ul');
        if (this.info?.title) {
            let span = document.createElement('span');
            span.innerHTML = this.info.title;
            if (this.info?.description) {
                span.setAttribute('title', this.info.description);
            }    
            div.appendChild(span);
        }
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
            img.addEventListener("click", (event) => this._onClick(event, i));
            if (this.images[i]?.title) {
                img.setAttribute('title', this.images[i].title);
            }    
            li.appendChild(img);
            this.listElements[i] = li;
            ul.appendChild(li);
        }
        div.appendChild(ul);
        this.replaceChildren(div);
        this.list = ul;
    }
}
customElements.define('film-strip',FilmStrip);

export default FilmStrip;