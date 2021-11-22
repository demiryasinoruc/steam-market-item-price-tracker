import browser from 'webextension-polyfill'

import getMarketHashNameFromUrl from '../common/steam'
import { GET_ITEMS, GET_TRANSLATIONS } from '../common/keys'
import { createElementFromJson, delay } from '../common/utility'
import INVENTORY_ELEMENTS from '../data/inventory.elements.json'

console.log('%cSteam Market Item Price Tracker worked!!!', 'color: #299ddc')

let translations = {}

const TargetMutationObserver = (
  target,
  cb,
  options = { childList: true, subtree: true }
) => {
  if (!target) {
    return
  }
  new MutationObserver(() => {
    cb(target)
  }).observe(target, options)
}

window.addEventListener('message', async e => {
  switch (e.data.type) {
    case 'response-inventory-data': {
      const { marketHashNames } = e.data
      const names = [...new Set(marketHashNames.map(x => x.market_hash_name))]
      const response = await browser.runtime.sendMessage({
        type: GET_ITEMS,
        names
      })
      const { items } = response
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const foundedItems = marketHashNames.filter(row => {
          return row.market_hash_name === item.name
        })
        for (let j = 0; j < foundedItems.length; j++) {
          const currentItem = foundedItems[j]
          const id = `[id="${currentItem.id}"]`
          const itemHolder = document.querySelector(id)
          itemHolder.style.borderTop = '4px solid #299ddc'
          itemHolder.style.boxSizing = 'border-box'
        }
      }
      break
    }
  }
})

const script = document.createElement('script')
script.innerText = `
window.addEventListener("message", async (e) => {
    switch (e.data.type) {
      case "get-inventory-data": {
        const idList = e.data.ids;
        const marketHashNames = [];
        for (let i = 0; i < idList.length; i++) {
          const id = idList[i];
          const item = g_ActiveInventory.m_rgAssets[id];
          if (item && item.description.marketable === 1) {
            marketHashNames.push({
              market_hash_name: item.description.market_hash_name,
              id: item.appid + '_' + item.contextid + '_' + id,
            });
          }
        }
        window.postMessage(
          {
            type: "response-inventory-data",
            marketHashNames: marketHashNames
          },
          "*"
        );
        break;
      }
    }
  });
`

const retrieveInventoryItemDescription = function(ids) {
  window.postMessage(
    {
      type: 'get-inventory-data',
      ids
    },
    '*'
  )
}

const addPriceTrackerContent = async parent => {
  const gameInfo = parent.querySelector('.item_desc_game_info')
  let itemContainer = document.querySelector('.smipt-item-container')
  // remove item container if it exists
  if (itemContainer) {
    itemContainer.remove()
  }

  itemContainer = document.createElement('div')
  itemContainer.classList.add('smipt-item-container')
  itemContainer.style.marginBottom = '25px'
  itemContainer.innerHTML = ''

  const hashNames = []
  const itemInfos = document.querySelectorAll('#iteminfo0,#iteminfo1')
  await delay(250)
  const activeInfo = Array.from(itemInfos).find(i => i.style.display !== 'none')
  if (!activeInfo) {
    return
  }
  const marketUrlElement = activeInfo.querySelector(
    '.item_market_actions > div > div a'
  )
  const marketUrl = marketUrlElement.attributes.href.value
  const marketHashName = getMarketHashNameFromUrl(marketUrl)

  hashNames.push(marketHashName)

  const { items } = await browser.runtime.sendMessage({
    type: GET_ITEMS,
    names: hashNames
  })

  if (!items.length) {
    return
  }
  const [item] = items
  const {
    minOrderAmount,
    maxOrderAmount,
    minSalesAmount,
    maxSalesAmount
  } = item
  const rows = createElementFromJson(INVENTORY_ELEMENTS, translations)
  const minBuyOrderBadge = rows.querySelector('#smipt-minBuyOrder')
  const maxBuyOrderBadge = rows.querySelector('#smipt-maxBuyOrder')
  const minSaleOrderBadge = rows.querySelector('#smipt-minSellOrder')
  const maxSaleOrderBadge = rows.querySelector('#smipt-maxSellOrder')

  minBuyOrderBadge.textContent = minOrderAmount
  maxBuyOrderBadge.textContent = maxOrderAmount
  minSaleOrderBadge.textContent = minSalesAmount
  maxSaleOrderBadge.textContent = maxSalesAmount

  const gameInfoSibling = gameInfo.nextElementSibling
  itemContainer.appendChild(rows)
  gameInfo.parentElement.insertBefore(itemContainer, gameInfoSibling)
  hashNames.length = 0
}

const handleTrackData = target => {
  // check if t is nodelist
  let elements = [target]
  if (target.length) {
    elements = target
  }

  for (let e = 0; e < elements.length; e++) {
    const element = elements[e]
    const inventoryPages = element.querySelectorAll('.inventory_page')
    const idList = []
    for (let i = 0; i < inventoryPages.length; i++) {
      const inventory = inventoryPages[i]
      const items = inventory.querySelectorAll('.itemHolder > .item')
      for (let j = 0; j < items.length; j++) {
        idList.push(items[j].id.split('_')[2])
      }
    }
    retrieveInventoryItemDescription(idList)
  }
}

const init = async () => {
  document.head.appendChild(script)
  ;({ translations } = await browser.runtime.sendMessage({
    type: GET_TRANSLATIONS
  }))
  const action0 = document.querySelector('#iteminfo0_item_actions')
  const action1 = document.querySelector('#iteminfo1_item_actions')

  // Page uses two divs that interchange with another on item change
  let firstItemTriggered = false
  TargetMutationObserver(action0, t => {
    firstItemTriggered = true
    addPriceTrackerContent(t.parentElement.parentElement)
  })

  TargetMutationObserver(action1, t => {
    firstItemTriggered = true
    addPriceTrackerContent(t.parentElement.parentElement)
  })
  // Ensure we catch the first item div on page load
  if (firstItemTriggered) {
    addPriceTrackerContent(action1.parentElement.parentElement)
  }
  const inventories = document.querySelectorAll('.inventory_ctn')
  for (let i = 0; i < inventories.length; i++) {
    const inventory = inventories[i]
    TargetMutationObserver(inventory, handleTrackData, {
      childList: true,
      subtree: false
    })
  }
  await delay(1000)
  handleTrackData(inventories)
}

init()
