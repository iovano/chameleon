import css from '../../css/sandwich.css' assert { type: 'css' };

export default class Sandwich extends HTMLElement {
    menu = undefined;
    buttons = undefined;
    target = undefined;
    title = undefined;
    expanded = false;
    items = [];
    queryParam = 'page';
    hideClass = 'hide';
    activeClass = 'active';
    defaultMenuItemNum = undefined;
    selectedMenuItemNum = undefined;
    constructor(menu = undefined, autostart = false) {
        super();
        if (autostart) {
            this.init(menu);
        }
    }
    init(menu) {
        this.menu = menu;
        this.queryParam = this.attributes.queryParam?.value || this.queryParam || 'page';
        this.hideClass = this.attributes.hideClass?.value || this.hideClass || 'hide';
        this.activeClass = this.attributes.activeClass?.value || this.activeClass || 'active';
        this.buttons = this.querySelectorAll(this.attributes.button?.value || 'button.sandwich');
        this.buttons.forEach((element) => {
            element.addEventListener('click', (event) => this._onClick(event));
        }); 
        if (this.attributes.target) {
            this.target = this.querySelector(this.attributes.target?.value || '.content');
        }
        if (!this.target) {
            this.target = document.createElement('div');
            if (this.attributes.targetClass?.value) {
                this.target.classList.add(this.attributes.targetClass.value.split(" "));
            }
            this.appendChild(this.target);
        }
        this.menu = this.querySelector(this.attributes.menu?.value || 'ul.menu');
        if (!this.menu) {
            this.menu = document.createElement('ul');
            if (this.attributes.menuClass?.value) {
                this.menu.classList.add(this.attributes.menuClass.value.split(" "));
            }
            this.appendChild(this.menu);
        } else {
            this.menu.querySelectorAll('li').forEach((element) => {
                element.dataset.link = this.buildPageUrl(element.innerHTML.toLowerCase());
                let idx = this.items.push(element);
                element.addEventListener('click', (event) => this._onClickMenuItem(idx - 1));
                }   
            );
        }
        this.createMenuItems();
        let userSelectedPage = this.getMenuItemNumByUrl(this.getPage());
        this._onToggle(userSelectedPage !== undefined);
        this.selectMenuItemNum(userSelectedPage ?? this.defaultMenuItemNum)
        this.updateQuery();
         
    }
    buildPageUrl(page) {
        return "/pages/"+page+".html";
    }
    getMenuItemNumByUrl(url) {
        for (let i in this.items) {
            if (this.items[i].dataset.link === url) {
                return i;
            }
        }
    }
    createMenuItems() {
        if (this.attributes.items.value) {
            let items = JSON.parse(this.attributes.items.value);
            if (Array.isArray(items)) {
                for (let i in items) {
                    let li = document.createElement('li');
                    if (items[i] instanceof String || typeof items[i] === 'string') {
                        li.innerHTML = items[i];
                    } else {
                        li.innerHTML = items[i].title;
                        for(let ki of Object.keys(items[i])) {
                            li.dataset[ki] = items[i][ki];
                        }
                    }
                    if (!li.dataset['link']) {
                        li.dataset.link = this.buildPageUrl(li.innerHTML.toLowerCase());
                    }
                    this.menu.appendChild(li);
                    let idx = this.items.push(li) - 1;
                    li.addEventListener('click', (event) => this._onClickMenuItem(idx));
                    if (items[i].default === true) {
                        this.defaultMenuItemNum = idx;
                    }
                }    
            }
        }
    }
    _onLoadPage(doc, page, menuItem) {
        if (typeof this.onLoadPage === 'function') {
            this.onLoadPage(doc, page, menuItem);
        }
        doc.style.display = 'none';
        doc.style.display = 'block';
    }
    setPage(page) {
        this.page = page;
        this.updateQuery(page);
    }
    updateQuery(page = undefined) {
        page = page ?? this.getPage();
        const url = new URL(window.location);
        if (!this.expanded || page === undefined) {
            url.searchParams.delete(this.queryParam);
        } else {
            url.searchParams.set(this.queryParam, page);
        }
        history.pushState({}, "", url);
    }
    getPage() {
        const urlSearchParams = new URLSearchParams(window.location.search);
        let params = Object.fromEntries(urlSearchParams.entries());      
        if (params[this.queryParam]) {
            this.page = params[this.queryParam];
        }
        return this.page;
    }
    selectMenuItemNum(itemNum) {
        itemNum = itemNum !== undefined ? itemNum : this.selectMenuItemNum;
        let item = this.items[itemNum];
        let page = item.dataset?.link;
        this.setPage(page);
        if (this.target) {
            fetch(page).then((response) => {return response.text();}).then((html) => {
                // Convert the HTML string into a document object
                let parser = new DOMParser();
                let doc = parser.parseFromString(html, 'text/html');  
                this.target.innerHTML = '';
                if (doc.body) {
                    let docObj = this.target.appendChild(doc.body);
//                    docObj.style.minHeight = docObj.scrollHeight+"px";
                    this._onLoadPage(docObj, page, item);
                } else {
                    this.target.innerHTML = 'Ressource '+page+' could not be loaded';
                }
            })
            .catch((error) => {
                console.error("error loading ressource",item,error);
            });
        }
        this.items[this.selectedMenuItemNum]?.classList.remove(this.activeClass);
        this.selectedMenuItemNum = itemNum;
        this.items[this.selectedMenuItemNum].classList.add(this.activeClass);
    }
    _onClickMenuItem(itemNum) {
        this.selectMenuItemNum(itemNum);
    }
    _onToggle(expanded = undefined) {
        this.expanded = (expanded !== undefined ? expanded : !this.expanded);
        let items = [this.menu, this.target];
        if (this.attributes.permanent) {
            items = this.children;
        }
        for(let i = 0; i < items.length; i++) {
            if (!items[i].classList.contains(this.attributes.permanent.value)) {
                if (this.expanded) {
                    items[i].classList.remove(this.hideClass);
                } else {
                    items[i].classList.add(this.hideClass);
                }
            }
        }
        this.style.pointerEvents = this.expanded ? 'all' : 'none';
        this.updateQuery(this.getPage());
        if (this.onToggle) {
            this.onToggle(this.expanded);
        }
    }
    _onClick(event) {
        this._onToggle();
    }
}
customElements.define('menu-sandwich',Sandwich);