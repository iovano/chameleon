import css from '../../css/filmstrip.css' assert { type: 'css' };

document.adoptedStyleSheets.push(css);

class FilmStrip {
    images = [];
    container = null;
    selectedImageNum = undefined;
    list = undefined;
    listElements = [];
    constructor(container, images, selectedImageNum = undefined) {
        this.container = container;
        this.images = images;
        this.show(selectedImageNum);
    }
    select(selectedImageNum) {
        if (this.selectedImageNum !== undefined) {
            this.listElements[this.selectedImageNum].classList.remove('selected');
        }
        let scroll = {x1: this.list.scrollLeft, x2: parseInt(this.list.scrollLeft)+parseInt(this.list.clientWidth)};
        let item = {x1: this.listElements[selectedImageNum].offsetLeft, x2: this.listElements[selectedImageNum].offsetLeft+this.listElements[selectedImageNum].clientWidth};
        if (item.x2 > scroll.x2) {
            this.list.scrollTo(scroll.x1 + item.x2 - scroll.x2, 0);
        }
        if (item.x1 < scroll.x1) {
            this.list.scrollTo(selectedImageNum * this.listElements[selectedImageNum].clientWidth, 0);
        }
        console.log(item.x1);
        this.listElements[selectedImageNum].classList.add('selected');
        this.selectedImageNum = selectedImageNum;

    }
    _onClick(event, selectedImage) {
        if (this.onClick) {
            this.onClick(event, selectedImage);
        }
        this.select(selectedImage);
    }
    show(selectedImageNum = undefined) {
        if (selectedImageNum) {
            this.selectedImageNum = selectedImageNum;
        }
        let ul = document.createElement('ul');
        for(let i = 0;i < this.images.length; i++) {
            let li = document.createElement('li');
            if (this.selectedImageNum === i) {
                li.classList.add('selected');
            } else {
                li.classList.remove('selected');
            }
            let img = document.createElement('img');
            img.src = this.images[i]?.src || this.images[i];
            img.addEventListener("click", (event) => this._onClick(event, i))
            img.width = 40;
            img.height = 40;
            li.appendChild(img);
            this.listElements[i] = li;
            ul.appendChild(li);
        }
        this.container.replaceChildren(ul);
        this.list = ul;
    }
}
export default FilmStrip;