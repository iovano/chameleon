import css from '../../css/filmstrip.css' assert { type: 'css' }; /* this currently does not work (chrome v101, safari, ...) */

//document.adoptedStyleSheets.push(css);

export default class FilmStrip extends HTMLElement {
    images = [];
    tabs = [];
    info = undefined;
    selectedImageNum = undefined;
    container = undefined;
    list = undefined;
    tabContainer = undefined;
    listElements = [];
    constructor(images = undefined, info = undefined, selectedImageNum = undefined, tabs = []) {
        super();
        this.addEventListener("wheel", this._onScroll, { passive: false });
        this.setImages(images);
        this.setInfo(info);
        this.setTabs(tabs);
        this.selectedImageNum = selectedImageNum;
        this.render();
    }
    setTabs(tabs) {
        this.tabs = tabs;
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
        if (el) {
            let itemsVisible = this.list.clientWidth / this.listElements[selectedImageNum].clientWidth || 1;
            let itemWidth = el.clientWidth;
            let paddingOffset = this.listElements[0].offsetLeft;
            let item = {x1: el.offsetLeft, x2: el.offsetLeft+itemWidth};
            
            this.list.scrollTo((selectedImageNum - itemsVisible / 2 + 1) * itemWidth - paddingOffset, 0);
            this.listElements[selectedImageNum].classList.add('selected');
            this.selectedImageNum = selectedImageNum;
        } else {
            this.list.scrollTo(0, 0);
        }
        this.updateTabs();
    }
    _onScroll(event) {
        event.preventDefault();
        this.list.scrollTo(this.list.scrollLeft + event.deltaY, 0);
    }
    _onSelectImage(event, selectedImage, selectedImageNum) {
        if (this.onSelectImage) {
            this.onSelectImage(event, selectedImage, selectedImageNum);
        }
        this.select(selectedImageNum);
    }
    _onSelectTab(event, selectedTab, selectedTabNum) {
        console.log("tab selected", selectedTab, selectedTabNum);
        if (this.onSelectTab) {
            this.onSelectTab(event, selectedTab, selectedTabNum);
        }
    }    
    createFilmStripItems(items) {
        let ul = document.createElement('ul');
        for(let i = 0;i < items.length; i++) {
            let li = document.createElement('li');
            if (this.selectedImageNum === i) {
                li.classList.add('selected');
            } else {
                li.classList.remove('selected');
            }
            let media = items[i]?.media;
            let img;
            if (media === 'video') {
                img = document.createElement('video');
            } else {
                img = document.createElement('img');
            }
            let sizes = items[i]?.size?.[media];
            if (sizes && Array.isArray(sizes)) {
                img.src = sizes[sizes.length -1];
            } else {
                img.src = sizes.src || items[i];
            }
            img.addEventListener("click", (event) => this._onSelectImage(event, items[i], i));
            if (items[i]?.title) {
                img.setAttribute('title', items[i].title);
            }    
            li.appendChild(img);
            li.image = img;
            this.listElements[i] = li;
            ul.appendChild(li);
        }
        return ul;
    }
    updateTabs() {
        let tabs = this.tabs;
        if (this.tabContainer) {
            this.tabContainer.innerHTML = '';
        }
        if (tabs.length < 1) {
            tabs = [{title: this.info?.description, caption: this.info?.title}];
        }
        for (let i = 0;i < tabs.length;i++) {
            let tab = tabs[i];
            let el = document.createElement('div');
            el.classList.add('tab', i);
            if (tab.class) {
                el.classList.add(tab.class);
            }
            el.innerHTML = tab.caption || tab.name || tab.title || i;
            el.setAttribute('title', tab.title || tab.caption || tab.name || i);
            el.addEventListener('click', (event) => {this._onSelectTab(event, tab, i)});
            this.tabContainer.appendChild(el);
        }                
    }
    render() {
        let div = document.createElement('div');
        div.classList.add('filmStripContainer');
        let ul = this.createFilmStripItems(this.images);

        div.appendChild(ul);
        
        /* Current Album Tab */
        this.tabContainer = document.createElement('div');
        this.tabContainer.classList.add('tabContainer');

        this.updateTabs();
    
        div.appendChild(this.tabContainer);
        
        this.replaceChildren(div);
        this.list = ul;
        this.container = div;
    }
}
customElements.define('film-strip',FilmStrip);