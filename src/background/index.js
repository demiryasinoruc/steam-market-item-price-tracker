import browser from 'webextension-polyfill'
import logger from '../common/logger-builder'
import KEYS from '../common/keys'
import { NOTIFICATION_BASE, INSTALLATION_URL } from '../common/constants'
import { createGuid } from '../common/utility'

let trackList = []
let notifications = []

let user = null
let settings = { interval: 8, logLength: 20, logData: false }

let currentIteration = 0
let trackingIteration = 0

// ##### Methods

const getSettings = () => {
  return new Promise(async resolve => {
    settings = await browser.storage.local.get({
      interval: 8,
      logData: false,
      logLength: 20,
      status: true
    })
    ;({ user, trackList } = await browser.storage.local.get({
      user: null,
      trackList: []
    }))
    resolve()
  })
}

const showNotification = async (notificationId, title, message) => {
  await browser.notifications.create(notificationId, {
    ...NOTIFICATION_BASE,
    title,
    message
  })
}

const addNotification = async (notificationId, item, title, message) => {
  const existNotificationIndex = notifications.findIndex(
    n => n.item.name === item.name
  )
  let showDesktopNotification = false
  if (existNotificationIndex !== -1) {
    const notification = notifications[existNotificationIndex]
    if (
      !(
        notification.item.minOrderAmount === item.minOrderAmount &&
        notification.item.maxOrderAmount === item.maxOrderAmount &&
        notification.item.minSalesAmount === item.minSalesAmount &&
        notification.item.maxSalesAmount === item.maxSalesAmount
      )
    ) {
      notifications.splice(existNotificationIndex, 1)
      showDesktopNotification = true
    }
  } else {
    showDesktopNotification = true
  }
  if (showDesktopNotification) {
    notifications.push({
      notificationId,
      item
    })
    showNotification(notificationId, title, message)
    let { notificationLength } = await browser.storage.local.get({
      notificationLength: 0
    })
    notificationLength++
    await browser.storage.local.set({
      notificationLength
    })
    await browser.browserAction.setBadgeText({
      text: notificationLength.toString()
    })
  }
}

const checkBuyOrderDiffs = (buyOrderGraph, item, notificationId) => {
  if (!buyOrderGraph.length) {
    return
  }
  const { minOrderAmount, maxOrderAmount } = item
  const [price, , message] = buyOrderGraph[0]
  // check under min order amount
  if (minOrderAmount && price < minOrderAmount) {
    // buy orders going down
    const title = 'Purchase order price decreased'
    addNotification(notificationId, item, title, message)
  }
  // check under max order amount
  if (maxOrderAmount && price > maxOrderAmount) {
    // buy orders going up
    const title = 'Purchase order price increased'
    addNotification(notificationId, item, title, message)
  }
}

const checkSellOrderDiffs = (sellOrderGraph, item, notificationId) => {
  if (!sellOrderGraph.length) {
    return
  }
  const { minSalesAmount, maxSalesAmount } = item
  const [price, , message] = sellOrderGraph[0]
  // check under min order amount
  if (minSalesAmount && price < minSalesAmount) {
    // sell orders going down
    const title = 'Sell order price decreased'
    addNotification(notificationId, item, title, message)
  }
  // check under max order amount
  if (maxSalesAmount && price > maxSalesAmount) {
    // sell orders going up
    const title = 'Sell order price increased'
    addNotification(notificationId, item, title, message)
  }
}

const checkDiff = (data, item) => {
  const {
    buy_order_graph: buyOrderGraph,
    sell_order_graph: sellOrderGraph
  } = data
  const notificationId = createGuid()
  checkBuyOrderDiffs(buyOrderGraph, item, notificationId)
  checkSellOrderDiffs(sellOrderGraph, item, notificationId)
}

const readData = async iteration => {
  const item = trackList[iteration]
  const orderHistogramUrl = `https://steamcommunity.com/market/itemordershistogram?country=${
    user.country
  }&language=${user.language}&currency=${user.currency}&item_nameid=${
    item.id
  }&two_factor=0&norender=1`
  const steamResponse = await fetch(orderHistogramUrl)
  if (steamResponse.status !== 200) {
    trackingIteration--
    return
  }
  const data = await steamResponse.json()
  if (data.success !== 1) {
    trackingIteration--
    return
  }
  checkDiff(data, item)
}

const start = async () => {
  await getSettings()

  setInterval(() => {
    // return if status is false or user not set or trackList is empty
    if (!settings.status || !user || !trackList.length) {
      return
    }

    if (currentIteration++ % settings.interval !== 0) {
      return
    }
    if (currentIteration > 100000) {
      // reset current iteration
      currentIteration = 1
    }
    if (trackingIteration++ >= trackList.length) {
      trackingIteration = 1
    }
    readData(trackingIteration - 1)
  }, 1000)
}

// ##### Handlers

// On Install Handler
const onInstallHandler = async installDetails => {
  const { reason } = installDetails
  if (reason === 'install') {
    await browser.tabs.create({
      url: INSTALLATION_URL
    })
  }
}

// On Runtime Message Handler
const onRuntimeMessageHandler = (request, sender) => {
  const { type, info } = request
  if (type === 'SIGN_CONNECT') {
    return true
  }
  if (info) {
    logger.info({ sender, type })
  }
  switch (type) {
    case KEYS.INSTALLATION_COMPLETED: {
      return new Promise(async resolve => {
        const {
          user: {
            language,
            wallet: { currency, country }
          }
        } = request
        user = { language, currency, country }
        await browser.storage.local.set({ user })
        browser.tabs.remove(sender.tab.id)
        resolve()
      })
    }
    case KEYS.REMOVE_NOTIFICATION: {
      return new Promise(async resolve => {
        const { notification } = request
        console.log(notification)
        notifications = notifications.filter(
          n => n.notificationId !== notification.notificationId
        )
        await browser.storage.local.set({
          notificationLength: notifications.length
        })
        await browser.browserAction.setBadgeText({
          text:
            notifications.length === 0 ? '' : notifications.length.toString()
        })
        resolve()
      })
    }
    case KEYS.GET_NOTIFICATIONS: {
      return new Promise(async resolve => {
        resolve({ notifications })
      })
    }
    case KEYS.GET_ITEM: {
      return new Promise(async resolve => {
        const { id } = request
        resolve({ item: trackList.find(i => i.id === id) })
      })
    }
    case KEYS.SET_ITEM: {
      return new Promise(async resolve => {
        const { item } = request
        const currentItem = trackList.find(i => i.id === item.id)
        if (currentItem) {
          currentItem.minOrderAmount = item.minOrderAmount
          currentItem.maxOrderAmount = item.maxOrderAmount
          currentItem.minSalesAmount = item.minSalesAmount
          currentItem.maxSalesAmount = item.maxSalesAmount
        }
        await browser.storage.local.set({ trackList })
        resolve()
      })
    }
    default: {
      return new Promise(async resolve => {
        resolve({ message: 'Default resolver' })
      })
    }
  }
}

// On Notification Clicked Handler
const onNotificationClickedHandler = async notificationId => {
  const notification = notifications.find(
    n => n.notificationId === notificationId
  )
  if (!notification) {
    return
  }
  const {
    item: { name, appid }
  } = notification
  await browser.tabs.create({
    url: `https://steamcommunity.com/market/listings/${appid}/${name}#smipt`
  })
}

// ##### Listeners

// On Install Listener
browser.runtime.onInstalled.addListener(onInstallHandler)

// On Runtime Message Listener
browser.runtime.onMessage.addListener(onRuntimeMessageHandler)

// On Notification Clicked Listener
if (browser.notifications.onClicked) {
  browser.notifications.onClicked.addListener(onNotificationClickedHandler)
}

start()
