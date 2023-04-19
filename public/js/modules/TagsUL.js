class TagsUL extends HTMLElement {
    listItems = undefined
    constructor(listItems = undefined) {
        super();
        this.listItems = listItems;
        this.render();
    }
    render(listItems = undefined) {
        listItems = listItems || this.listItems;
        for (let key in listItems) {
            if (listItems[key]) {
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
                if (!Array.isArray(listItems[key])) {
                    listItems[key] = [listItems[key]];
                }
                listItems[key].forEach(
                    (item) => {
                        if (item instanceof Element) {
                            div.appendChild(item);
                        } else {
                            span = document.createElement('span');
                            span.innerHTML = item;
                            div.appendChild(span);        
                        }
                    }
                );
                li.appendChild(div);
                this.appendChild(li);    
            }
        }
    }
}
customElements.define('tags-ul',TagsUL);

export default TagsUL;