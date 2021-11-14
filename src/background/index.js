import browser from 'webextension-polyfill'
import logger from '../common/logger-builder'

// ##### Methods
const start = async () => {}

// ##### Handlers

// On Install Handler
const onInstallHandler = async installDetails => {
  logger.info(installDetails)
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
