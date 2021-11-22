import browser from 'webextension-polyfill'
import logger from '../common/logger-builder'
import KEYS from '../common/keys'
import { NOTIFICATION_BASE, INSTALLATION_URL } from '../common/constants'
import { createGuid } from '../common/utility'
import TRANSLATIONS from '../_locales/en/strings.json'
import LANGUAGES from '../data/languages.json'

let trackListData = []
let notifications = []
let translations = TRANSLATIONS

let settings = {
  interval: 8,
  logLength: 20,
  logData: false,
  status: true,
  language: 'english',
  country: 'us',
  currency: 1
}

let currentIteration = 0
let trackingIteration = 0

// ##### Methods

const getTrackList = async () => {
  const { trackList } = await browser.storage.local.get({
    trackList: []
  })
  trackListData = trackList
}

const setLanguage = async () => {
  let language = LANGUAGES.find(i => i.key === settings.language)
  if (!language) {
    language = LANGUAGES.find(i => i.fallback)
  }
  const { iso } = language

  translations = await fetch(`_locales/${iso}/strings.json`).then(res =>
    res.json()
  )
}

const getSettings = () => {
  return new Promise(async resolve => {
    settings = await browser.storage.local.get({
      interval: 8,
      logData: false,
      logLength: 20,
      status: true,
      language: 'english',
      country: 'us',
      currency: 1
    })
    await setLanguage()
    await getTrackList()
    resolve()
  })
}

const createUpdateNotification = async (
  notificationId,
  isNewNotificaiton,
  title,
  message
) => {
  if (isNewNotificaiton) {
    await browser.notifications.create(notificationId, {
      ...NOTIFICATION_BASE,
      title,
      message
    })
    return
  }
  await browser.notifications.update(notificationId, {
    ...NOTIFICATION_BASE,
    title,
    message
  })
}

const addNotification = async (notificationId, item, title, message) => {
  let currentNotificationId = notificationId
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
      currentNotificationId = notification.notificationId
      notifications.splice(existNotificationIndex, 1)
      showDesktopNotification = true
    }
  } else {
    showDesktopNotification = true
  }
  if (showDesktopNotification) {
    notifications.push({
      notificationId: currentNotificationId,
      item,
      title,
      message
    })
    const isNewNotification = notificationId === currentNotificationId
    createUpdateNotification(
      currentNotificationId,
      isNewNotification,
      `${item.name} - ${title}`,
      message
    )
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
    const title = translations.buyOrderDecreased
    addNotification(notificationId, item, title, message)
  }
  // check under max order amount
  if (maxOrderAmount && price > maxOrderAmount) {
    // buy orders going up
    const title = translations.buyOrderIncreased
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
    const title = translations.sellOrderDecreased
    addNotification(notificationId, item, title, message)
  }
  // check under max order amount
  if (maxSalesAmount && price > maxSalesAmount) {
    // sell orders going up
    const title = translations.sellOrderIncreased
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
  const item = trackListData[iteration]
  const orderHistogramUrl = `https://steamcommunity.com/market/itemordershistogram?country=${
    settings.country
  }&language=${settings.language}&currency=${settings.currency}&item_nameid=${
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
    if (!settings.status || !trackListData.length) {
      return
    }

    if (currentIteration++ % settings.interval !== 0) {
      return
    }
    if (currentIteration > 100000) {
      // reset current iteration
      currentIteration = 1
    }
    if (trackingIteration++ >= trackListData.length) {
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
          user: { language, wallet }
        } = request
        if (!wallet) {
          await browser.notifications.create('walletNotFound', {
            ...NOTIFICATION_BASE,
            title: translations.walletNotFound,
            message: translations.walletNotFoundMessage
          })

          resolve({ error: 'Wallet not found' })
          return
        }
        const { currency, country } = wallet
        await browser.storage.local.set({ language, currency, country })
        await getSettings()
        await browser.tabs.remove(sender.tab.id)
        resolve()
      })
    }
    case KEYS.REMOVE_NOTIFICATION: {
      return new Promise(async resolve => {
        const {
          notification: { notificationId }
        } = request
        notifications = notifications.filter(
          n => n.notificationId !== notificationId
        )
        await browser.notifications.clear(notificationId)
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
    case KEYS.TRIGGER_NOTIFICATION: {
      return new Promise(async resolve => {
        const {
          notification: { notificationId, title, message }
        } = request

        await browser.notifications.clear(notificationId)

        await browser.notifications.create(notificationId, {
          ...NOTIFICATION_BASE,
          title,
          message
        })
        resolve()
      })
    }
    case KEYS.GET_NOTIFICATIONS: {
      return new Promise(async resolve => {
        resolve({ notifications })
      })
    }
    case KEYS.GET_STATUS: {
      return new Promise(async resolve => {
        resolve({ status: settings.status })
      })
    }
    case KEYS.SET_STATUS: {
      return new Promise(async resolve => {
        const { status } = request
        settings.status = status
        await browser.storage.local.set({ status })
        resolve()
      })
    }
    case KEYS.REMOVE_ITEM: {
      return new Promise(async resolve => {
        const { id } = request
        trackListData = trackListData.filter(i => i.id !== id)
        await browser.storage.local.set({ trackList: trackListData })
        resolve()
      })
    }
    case KEYS.GET_ITEM: {
      return new Promise(async resolve => {
        const { id } = request
        resolve({ item: trackListData.find(i => i.id === id) })
      })
    }
    case KEYS.GET_ITEMS: {
      return new Promise(async resolve => {
        const { names } = request
        const items = trackListData.filter(i => names.includes(i.name))
        resolve({ items })
      })
    }
    case KEYS.SET_ITEM: {
      return new Promise(async resolve => {
        const { item } = request
        let currentItem = trackListData.find(i => i.id === item.id)
        if (!currentItem) {
          currentItem = item
          trackListData.push(currentItem)
        }
        currentItem.minOrderAmount = item.minOrderAmount
        currentItem.maxOrderAmount = item.maxOrderAmount
        currentItem.minSalesAmount = item.minSalesAmount
        currentItem.maxSalesAmount = item.maxSalesAmount
        const currentNotificationIndex = notifications.findIndex(
          n => n.item.id === item.id
        )
        if (currentNotificationIndex !== -1) {
          const { notificationId } = notifications[currentNotificationIndex]
          await browser.notifications.clear(notificationId)
          notifications.splice(currentNotificationIndex, 1)
          await browser.storage.local.set({
            notificationLength: notifications.length
          })
          await browser.browserAction.setBadgeText({
            text: notifications.length.toString()
          })
        }

        await browser.storage.local.set({ trackList: trackListData })
        resolve()
      })
    }
    case KEYS.DATA_UPDATED: {
      return new Promise(async resolve => {
        getTrackList()
        resolve()
      })
    }
    case KEYS.SETTINGS_UPDATED: {
      return new Promise(async resolve => {
        await getSettings()
        resolve()
      })
    }
    case KEYS.GET_TRANSLATIONS: {
      return new Promise(async resolve => {
        resolve({ translations })
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
  const encodedName = encodeURIComponent(name)
  const url = `https://steamcommunity.com/market/listings/${appid}/${encodedName}`
  const tabs = await browser.tabs.query({
    url
  })
  if (tabs.length > 0) {
    await browser.tabs.update(tabs[0].id, { active: true })
    return
  }
  await browser.tabs.create({
    url: `${url}#smipt`
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
