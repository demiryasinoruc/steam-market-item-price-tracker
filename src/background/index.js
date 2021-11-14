import browser from 'webextension-polyfill'
import logger from '../common/logger-builder'
import { INSTALLATION_COMPLETED } from '../common/keys'
import { INSTALLATION_URL } from '../common/constants'

let trackList = []

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

const checkDiff = (data, item) => {
  console.log(data)
  console.log(item)
  console.log('_________________________')
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
    case INSTALLATION_COMPLETED: {
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
    default: {
      return new Promise(async resolve => {
        resolve({ message: 'Default resolver' })
      })
    }
  }
}

// ##### Listeners

// On Install Listener
browser.runtime.onInstalled.addListener(onInstallHandler)

// On Runtime Message Listener
browser.runtime.onMessage.addListener(onRuntimeMessageHandler)

start()
