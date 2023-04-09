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
        let itemsVisible = this.list.clientWidth / this.listElements[selectedImageNum].clientWidth || 1;
        let itemWidth = this.listElements[selectedImageNum].clientWidth;
        let paddingOffset = this.listElements[0].offsetLeft;
        let item = {x1: this.listElements[selectedImageNum].offsetLeft, x2: this.listElements[selectedImageNum].offsetLeft+itemWidth};
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