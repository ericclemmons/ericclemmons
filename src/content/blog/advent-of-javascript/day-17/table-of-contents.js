const TEMPLATE_SELECTOR = '#table-of-contents-template'

export class TableOfContents extends HTMLElement {
  constructor() {
    super()

    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    // https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
    if (!this.isConnected) return

    if (!this.querySelector(TEMPLATE_SELECTOR)) {
      this.innerHTML += `
        <template id="table-of-contents-template">
          <aside>
            <slot name="header"></slot>
            <slot name="list">
              <slot name="item">Item</slot>
              <slot name="item">Item</slot>
              <slot name="item">Item</slot>
            </slot>
            <slot name="footer"></slot>
          </aside>
        <template>
      `
    }

    this.shadowRoot.appendChild(
      this.querySelector(TEMPLATE_SELECTOR).content.cloneNode(true)
    )

    // const ul = document.createElement('ul')
    // ul.setAttribute('slot', 'list')
    const list = this.querySelector('[slot=list]')
    const itemTemplate = list.querySelector('[slot=item]')
    const linkTemplate = itemTemplate.querySelector('[slot=link]')

    list.innerHTML = ''

    this.headings.forEach(({ id, innerText }) => {
      const item = list.appendChild(itemTemplate.cloneNode(true))
      item.innerHTML = ''

      const link = item.appendChild(linkTemplate.cloneNode(true))
      link.innerHTML = ''

      link.setAttribute('href', `#${id}`)
      link.innerText = innerText
    })

    // this.appendChild(ul)

    const { width } = this.getBoundingClientRect()

    document.body.style.paddingLeft = `${width}px`
  }

  get headings() {
    const selectorWithId = `${this.getAttribute('heading-selector')}[id]`

    return document.querySelectorAll(selectorWithId)
  }

  get headingSelector() {
    return this.getAttribute('heading-selector')
  }
}

window.customElements.define('table-of-contents', TableOfContents)
