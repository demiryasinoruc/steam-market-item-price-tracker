
importScripts('./common/keys.js')
importScripts('./common/constants.js')
importScripts('./common/utility.js')
importScripts('./data/languages.js')

const browser = chrome || browser
let trackListData = []
let notifications = []
let translations = {}

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
    let language = supportedLanguages.find(i => i.key === settings.language)

    if (!language) {
        language = supportedLanguages.find(i => i.fallback)
    }

    if (!language) {
        console.log(`Can't find language ${settings.language}`)
        return
    }

    const { iso } = language

    translations = await getTranslations(iso)
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
            ...constants.notificationBase,
            title,
            message
        })
        return
    }
    await browser.notifications.update(notificationId, {
        ...constants.notificationBase,
        title,
        message
    })
}

const setBadgeTextNotificationCount = async () => {
    const text = notifications.length === 0 ? '' : notifications.length.toString()
    await browser.action.setBadgeText({ text })
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
        setBadgeTextNotificationCount()
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
    const orderHistogramUrl = `https://steamcommunity.com/market/itemordershistogram?`

    const orderHistogramParams = new URLSearchParams();
    orderHistogramParams.set('country', settings.country);
    orderHistogramParams.set('language', settings.language);
    orderHistogramParams.set('currency', settings.currency);
    orderHistogramParams.set('item_nameid', item.id);
    orderHistogramParams.set('two_factor', '0');

    const steamResponse = await fetch({
        url: `${orderHistogramUrl}${orderHistogramParams.toString()}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'SMIPT'
        }
    })

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

const openItemPageByNotification = async (notification, active = true) => {
    const { name, appid } = notification.item
    const encodedName = encodeMarketHashName(name)
    const url = `https://steamcommunity.com/market/listings/${appid}/${encodedName}`
    const tabs = await browser.tabs.query({
        url
    })
    if (tabs.length > 0) {
        await browser.tabs.update(tabs[0].id, { active: false })
        return
    }
    await browser.tabs.create({
        url: `${url}#smipt`,
        active
    })
}

const getTranslations = async (key) => {
    return await fetch(`_locales/${key}/strings.json`).then(res => res.json())
}

const start = async () => {
    await getTranslations('en')
    await getSettings()
    await setBadgeTextNotificationCount()

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
        // readData(trackingIteration - 1)
    }, 1000)
}

// ##### Handlers

// On Install Handler
const onInstallHandler = async installDetails => {
    const { reason } = installDetails
    if (reason === 'install') {
        await browser.tabs.create({
            url: constants.installationUrl
        })
    }
}

// On Runtime Message Handler
const onRuntimeMessageHandler = async (request, sender, callback) => {
    const { type, info } = request
    if (type === 'SIGN_CONNECT') {
        return true
    }

    switch (type) {
        case keys.INSTALLATION_COMPLETED: {
            return new Promise(async resolve => {
                const {
                    user: { language, wallet }
                } = request
                if (!wallet) {
                    await browser.notifications.create('walletNotFound', {
                        ...constants.notificationBase,
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
        case keys.REMOVE_NOTIFICATION: {
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
                await setBadgeTextNotificationCount()
                resolve()
            })
        }
        case keys.TRIGGER_NOTIFICATION: {
            return new Promise(async resolve => {
                const {
                    notification: { notificationId, title, message }
                } = request

                await browser.notifications.clear(notificationId)

                await browser.notifications.create(notificationId, {
                    ...constants.notificationBase,
                    title,
                    message
                })
                resolve()
            })
        }
        case keys.GET_NOTIFICATIONS: {
            callback(notifications)
            return true
        }
        case keys.GET_STATUS: {
            console.log(settings.status)
            return true
        }
        case keys.SET_STATUS: {
            return new Promise(async resolve => {
                const { status } = request
                settings.status = status
                await browser.storage.local.set({ status })
                resolve()
            })
        }
        case keys.REMOVE_ITEM: {
            return new Promise(async resolve => {
                const { id } = request
                trackListData = trackListData.filter(i => i.id !== id)
                await browser.storage.local.set({ trackList: trackListData })
                const notification = notifications.find(
                    n => n.item.id === id
                )
                if (notification) {
                    notifications = notifications.filter(
                        n => n.notificationId !== notification.notificationId
                    )
                    await browser.notifications.clear(notification.notificationId)
                    await browser.storage.local.set({
                        notificationLength: notifications.length
                    })
                    await setBadgeTextNotificationCount()
                }
                resolve()
            })
        }
        case keys.GET_ITEM: {
            const { id } = request
            console.log({ id, trackListData })
            callback(trackListData.find(i => i.id === id))
            return true;
        }
        case keys.GET_ITEMS: {
            const { names } = request
            const items = trackListData.filter(i => names.includes(i.name))

            callback(items)

            return true;
        }
        case keys.SET_ITEM: {
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
                await setBadgeTextNotificationCount()
            }

            await browser.storage.local.set({ trackList: trackListData })

            return true;
        }
        case keys.DATA_UPDATED: {
            return new Promise(async resolve => {
                getTrackList()
                resolve()
            })
        }
        case keys.SETTINGS_UPDATED: {
            return new Promise(async resolve => {
                await getSettings()
                resolve()
            })
        }
        case keys.GET_TRANSLATIONS: {
            callback(translations)
            return true;
        }
        case keys.OPEN_NOTIFICATION: {
            return new Promise(async resolve => {
                const { notification } = request;
                openItemPageByNotification(notification)
                resolve()
            })
        }
        case keys.OPEN_ALL_NOTIFICATIONS: {
            return new Promise(async resolve => {
                for (let i = 0; i < notifications.length; i++) {
                    const notification = notifications[i];
                    openItemPageByNotification(notification, i === 0)
                    await delay(2000)
                }
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

// On Notification Clicked Listener
// if (browser.notifications.onClicked) {
//     browser.notifications.onClicked.addListener(onNotificationClickedHandler)
// }

start()
