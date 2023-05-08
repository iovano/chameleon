import css from '../../css/search.css' assert { type: 'css' };

export default class Search extends HTMLElement {
    searchterm;
    input;
    constructor () {
        super();
        this.input = this.querySelector('input');
        if (!this.input) {
            this.input = document.createElement('input');
            this.appendChild(this.input);
        }
        this.input.addEventListener('focus', (event) => this._onFocus(event));
        this.input.addEventListener('blur', (event) => this._onBlur(event));
        this.input.addEventListener('keyup', (event) => this._onKeyUp(event));
        this.input.addEventListener('change', (event) => this._onChange(event));

    }
    _onChange(event) {
        if (typeof this.onChange === 'function') {
            this.onChange(event);
        }
    }
    _onSubmit(event) {
        if (typeof this.onSubmit === 'function') {
            this.onSubmit(event, this.input.value);
        }
    }
    _onKeyUp(event) {
        if (event.key === 'Enter') {
            this._onSubmit(event);
        }
        if (typeof this.onKeyUp === 'function') {
            this.onKeyUp(event);
        }
    } 
    _onFocus(event) {
        if (typeof this.onFocus === 'function') {
            this.onFocus(event);
        }
    }
    _onBlur(event) {
        if (typeof this.onBlur === 'function') {
            this.onBlur(event);
        }
    }

}
customElements.define('div-search',Search);