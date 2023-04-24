import css from '../../css/sandwich.css' assert { type: 'css' };

export default class Sandwich extends HTMLElement {
    menu = undefined;
    buttons = undefined;
    expanded = false;
    constructor(menu = undefined) {
        super();
        this.menu = menu;
        this.buttons = this.querySelectorAll(this.attributes.button?.value || 'button.sandwich');
        this.buttons.forEach((element) => {
            element.addEventListener('click', (event) => this._onClick(event));
        }); 
        this.menu = this.querySelector(this.attributes.target?.value || 'ul.menu');
        if (!this.menu) {
            this.menu = document.createElement('ul');
            if (this.attributes.menuClass?.value) {
                this.menu.classList.add(this.attributes.menuClass.value.split(" "));
            }
            this.appendChild(this.menu);
        }
        this.createMenuItems();
        this._onToggle(false);
    }
    createMenuItems() {
        if (this.attributes.menuItems.value) {
            console.log(this.attributes.menuItems.value);
            let items = JSON.parse(this.attributes.menuItems.value);
            if (Array.isArray(items)) {
                for (let i in items) {
                    let li = document.createElement('li');
                    if (items[i] instanceof String || typeof items[i] === 'string') {
                        li.innerHTML = items[i];
                    } else {
                        li.innerHTML = items[i].title;
                    }
                    li.style = 'cursor: pointer';
                    li.addEventListener('click', (event) => this._onClickMenuItem(event, items[i]));
                    this.menu.appendChild(li);
                }    
            }
            console.log(this.menu);
        }
    }
    _onClickMenuItem(event, item) {
        console.log("menu item clicked", item);
    }
    _onToggle(expanded = undefined) {
        this.expanded = (expanded !== undefined ? expanded : !this.expanded);
        this.menu.style = 'visibility: ' + (this.expanded === true ? 'visible' : 'hidden');
        if (this.onToggle) {
            this.onToggle(this.expanded);
        }
    }
    _onClick(event) {
        this._onToggle();
    }
}
customElements.define('menu-sandwich',Sandwich);