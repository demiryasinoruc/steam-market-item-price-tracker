import browser from 'webextension-polyfill'
import { GET_ITEMS, GET_TRANSLATIONS } from '../common/keys'
import getMarketHashNameFromUrl from '../common/utility'

console.log('%cSteam Market Item Price Tracker worked!!!', 'color: #299ddc')

let minBuyOrder = ''
let maxBuyOrder = ''
let minSellOrder = ''
let maxSellOrder = ''

const MutationObserver =
  window.MutationObserver || window.WebKitMutationObserver

const onIconClickHandler = e => {
  e.preventDefault()
  e.stopPropagation()
  e.target
    .closest('.market_listing_row.market_recent_listing_row')
    .classList.toggle('smipt-hide')
}

const queriedItemsHandler = response => {
  const icon = document.createElement('span')
  icon.classList.add('smipt-trigger')
  const { items } = response
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const rowSelector = `[data-hash-name="${item.name}"]:not(.smipt-applied)`
    const row = document.querySelector(rowSelector)
    const currentIcon = icon.cloneNode()
    row.classList.add('smipt-hide')
    row.classList.add('smipt-applied')
    row
      .querySelector('.market_listing_item_name_block')
      .appendChild(currentIcon)
    currentIcon.addEventListener('click', onIconClickHandler)
    const itemContainer = document.createElement('div')
    itemContainer.classList.add('smipt-item-container')

    // first row
    const firstRow = document.createElement('div')
    firstRow.classList.add('smipt-row')

    // second row
    const secondRow = firstRow.cloneNode()

    // first column
    const firstColumn = document.createElement('div')
    firstColumn.classList.add('smipt-column')
    firstColumn.textContent = `${minBuyOrder}:`
    const firstColumnSpan = document.createElement('span')
    firstColumnSpan.classList.add('smipt-badge')
    firstColumnSpan.textContent = `${item.minOrderAmount}`

    // second column
    const secondColumn = firstColumn.cloneNode()
    secondColumn.textContent = `${minSellOrder}:`
    const secondColumnSpan = document.createElement('span')
    secondColumnSpan.classList.add('smipt-badge')
    secondColumnSpan.textContent = `${item.minSalesAmount}`

    firstRow.appendChild(firstColumn)
    firstRow.appendChild(secondColumn)

    // third column
    const thirdColumn = firstColumn.cloneNode()
    thirdColumn.textContent = `${maxBuyOrder}:`
    const thirdColumnSpan = document.createElement('span')
    thirdColumnSpan.classList.add('smipt-badge')
    thirdColumnSpan.textContent = `${item.maxOrderAmount}`

    // fourth column
    const fourthColumn = firstColumn.cloneNode()
    fourthColumn.textContent = `${maxSellOrder}:`
    const fourthColumnSpan = document.createElement('span')
    fourthColumnSpan.classList.add('smipt-badge')
    fourthColumnSpan.textContent = `${item.maxSalesAmount}`

    firstColumn.appendChild(firstColumnSpan)
    secondColumn.appendChild(secondColumnSpan)
    thirdColumn.appendChild(thirdColumnSpan)
    fourthColumn.appendChild(fourthColumnSpan)

    secondRow.appendChild(thirdColumn)
    secondRow.appendChild(fourthColumn)
    itemContainer.appendChild(firstRow)
    itemContainer.appendChild(secondRow)
    row.appendChild(itemContainer)
  }
}

const handleRows = async () => {
  const links = document.querySelectorAll('.market_listing_row_link')
  const names = []
  for (let index = 0; index < links.length; index++) {
    const link = links[index]
    const {
      href: { value: url }
    } = link.attributes
    const marketHashName = getMarketHashNameFromUrl(url)
    names.push(marketHashName)
  }
  const response = await browser.runtime.sendMessage({
    type: GET_ITEMS,
    names
  })
  queriedItemsHandler(response)
}

const init = async () => {
  const { translations } = await browser.runtime.sendMessage({
    type: GET_TRANSLATIONS
  })
  ;({ minBuyOrder, maxBuyOrder, minSellOrder, maxSellOrder } = translations)

  handleRows()
  const observer = new MutationObserver(handleRows)
  const rootElement = document.querySelector('#searchResultsRows')
  if (!rootElement) {
    return
  }
  observer.observe(rootElement, {
    childList: true
  })
}

init()
