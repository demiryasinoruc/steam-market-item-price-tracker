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
    if (trackingIteration++ > trackList.length) {
      trackingIteration = 0
    }
  }, 1000)
  logger.info({ settings, currentIteration, user })
}

// ##### Handlers

// On Install Handler
const onInstallHandler = async installDetails => {
  const { reason, previousVersion } = installDetails
  if (reason === 'install') {
    await browser.tabs.create({
      url: INSTALLATION_URL
    })
  }
  logger.info({ reason, previousVersion })
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
