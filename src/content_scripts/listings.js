import browser from 'webextension-polyfill'

import { GET_ITEM, REMOVE_ITEM, SET_ITEM } from '../common/keys'
import { createElementFromJson } from '../common/utility'

import LISTING_ELEMENTS from '../data/listing.elements.json'

let currentItem = null
let currentItemId = null
let currentItemName = null
let currentAppName = null
let currentAppId = null

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
  const minOrderAmount = parseFloat(
    document.querySelector('#smipt-minOrderAmount').value
  )
  const maxOrderAmount = parseFloat(
    document.querySelector('#smipt-maxOrderAmount').value
  )
  const minSalesAmount = parseFloat(
    document.querySelector('#smipt-minSalesAmount').value
  )
  const maxSalesAmount = parseFloat(
    document.querySelector('#smipt-maxSalesAmount').value
  )

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
  document.querySelector('#smipt-minOrderAmount').value = 0
  document.querySelector('#smipt-maxOrderAmount').value = 0
  document.querySelector('#smipt-minSalesAmount').value = 0
  document.querySelector('#smipt-maxSalesAmount').value = 0

  setMessage('Successfully removed', 'smipt-success-message')
}

const createSection = () => {
  const item = currentItem || {}
  const myListings = document.querySelector('#myListings')

  const panel = createElementFromJson(LISTING_ELEMENTS)

  const minOrderAmountInput = panel.querySelector('#smipt-minOrderAmount')
  const maxOrderAmountInput = panel.querySelector('#smipt-maxOrderAmount')
  const minSalesAmountInput = panel.querySelector('#smipt-minSalesAmount')
  const maxSalesAmountInput = panel.querySelector('#smipt-maxSalesAmount')
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

const start = async () => {
  const START_SERACH_PATTERN = /Market_LoadOrderSpread\( (\d+) \);/m
  const script = Array.from(document.querySelectorAll('script')).find(i =>
    i.textContent.match(START_SERACH_PATTERN)
  )

  if (!script) {
    console.error('No script found')
    return
  }
  const matches = script.textContent.match(START_SERACH_PATTERN)
  if (matches.length < 2) {
    console.error('No matches found')
    return
  }

  currentAppName = document.querySelector('#largeiteminfo_game_name')
    .textContent
  // eslint-disable-next-line prefer-destructuring
  currentItemId = matches[1]
  const urlParts = new URL(window.location.href).pathname
    .split('/')
    .filter(i => i)
  const listingsIndex = urlParts.indexOf('listings')
  currentAppId = urlParts[listingsIndex + 1]
  currentItemName = decodeURIComponent(urlParts[listingsIndex + 2])

  const { item } = await browser.runtime.sendMessage({
    type: GET_ITEM,
    id: currentItemId
  })
  currentItem = item
  createSection()
}

start()