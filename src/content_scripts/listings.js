import browser from 'webextension-polyfill'

import {
  GET_ITEM,
  GET_TRANSLATIONS,
  REMOVE_ITEM,
  SET_ITEM
} from '../common/keys'
import { createElementFromJson, delay } from '../common/utility'

import LISTING_ELEMENTS from '../data/listing.elements.json'

let currentItem = null
let currentItemId = null
let currentItemName = null
let currentAppName = null
let currentAppId = null

let minOrderAmountInput = null
let maxOrderAmountInput = null
let minSalesAmountInput = null
let maxSalesAmountInput = null

let translations = {}

const inputOnBlur = e => {
  const value = parseFloat(e.target.value)
  if (!value) {
    e.target.value = 0
  }
}

const setMessage = (message, selector) => {
  const currentMessage = document.querySelector(
    `#smipt-message-row .${selector}`
  )
  if (currentMessage) {
    currentMessage.remove()
  }
  const messageItem = document.createElement('div')
  messageItem.classList.add(selector)
  document.querySelector('#smipt-message-row').appendChild(messageItem)
  messageItem.textContent = message
  setTimeout(() => {
    messageItem.remove()
  }, 3000)
}

const saveHandler = async () => {
  const minOrderAmount = parseFloat(minOrderAmountInput.value)
  const maxOrderAmount = parseFloat(maxOrderAmountInput.value)
  const minSalesAmount = parseFloat(minSalesAmountInput.value)
  const maxSalesAmount = parseFloat(maxSalesAmountInput.value)

  const item = {
    minOrderAmount,
    maxOrderAmount,
    minSalesAmount,
    maxSalesAmount,
    id: currentItemId,
    name: currentItemName,
    appid: currentAppId,
    appname: currentAppName
  }
  if (minOrderAmount + maxOrderAmount + minSalesAmount + maxSalesAmount === 0) {
    setMessage('You must enter valid amounts', 'smipt-error-message')
    return
  }

  await browser.runtime.sendMessage({
    type: SET_ITEM,
    item
  })

  setMessage('Successfully saved', 'smipt-success-message')
}

const removeHandler = async () => {
  await browser.runtime.sendMessage({
    type: REMOVE_ITEM,
    id: currentItemId
  })
  minOrderAmountInput.value = 0
  maxOrderAmountInput.value = 0
  minSalesAmountInput.value = 0
  maxSalesAmountInput.value = 0

  setMessage('Successfully removed', 'smipt-success-message')
}

const createSection = () => {
  const item = currentItem || {}
  const myListings = document.querySelector('#myListings')
  console.log(translations)
  const panel = createElementFromJson(LISTING_ELEMENTS, translations)

  minOrderAmountInput = panel.querySelector('#smipt-minOrderAmount')
  maxOrderAmountInput = panel.querySelector('#smipt-maxOrderAmount')
  minSalesAmountInput = panel.querySelector('#smipt-minSalesAmount')
  maxSalesAmountInput = panel.querySelector('#smipt-maxSalesAmount')
  const saveButton = panel.querySelector('#smipt-save-button')
  const removeButton = panel.querySelector('#smipt-remove-button')

  minOrderAmountInput.value = item.minOrderAmount || 0
  maxOrderAmountInput.value = item.maxOrderAmount || 0
  minSalesAmountInput.value = item.minSalesAmount || 0
  maxSalesAmountInput.value = item.maxSalesAmount || 0

  minOrderAmountInput.addEventListener('blur', inputOnBlur)
  maxOrderAmountInput.addEventListener('blur', inputOnBlur)
  minSalesAmountInput.addEventListener('blur', inputOnBlur)
  maxSalesAmountInput.addEventListener('blur', inputOnBlur)

  saveButton.addEventListener('click', saveHandler)
  removeButton.addEventListener('click', removeHandler)

  myListings.parentNode.insertBefore(panel, myListings)
}

const init = async () => {
  const START_SERACH_PATTERN = /Market_LoadOrderSpread\( (\d+) \);/m
  const script = Array.from(document.querySelectorAll('script')).find(i =>
    i.textContent.match(START_SERACH_PATTERN)
  )

  if (!script) {
    return
  }
  const matches = script.textContent.match(START_SERACH_PATTERN)
  if (matches.length < 2) {
    return
  }

  ;({ translations } = await browser.runtime.sendMessage({
    type: GET_TRANSLATIONS
  }))

  const urlObject = new URL(window.location.href)
  const { hash, pathname } = urlObject

  currentAppName = document.querySelector('#largeiteminfo_game_name')
    .textContent
  // eslint-disable-next-line prefer-destructuring
  currentItemId = matches[1]
  const urlParts = pathname.split('/').filter(i => i)
  const listingsIndex = urlParts.indexOf('listings')
  currentAppId = urlParts[listingsIndex + 1]
  currentItemName = decodeURIComponent(urlParts[listingsIndex + 2])

  const { item } = await browser.runtime.sendMessage({
    type: GET_ITEM,
    id: currentItemId
  })
  currentItem = item
  createSection()
  await delay(500)
  if (hash === '#smipt') {
    const section = document.querySelector('#smipt-section')
    if (!section) {
      return
    }
    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}

init()
