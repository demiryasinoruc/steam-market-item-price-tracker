const browser = chrome || browser
let translations = {}
let appStatus = false
let notifications = []

const trackListRowTemplate =
          `
            <li class="list-group-item">
                <span>{{APPNAME}}</span>
                <span class="badge badge-danger float-right mt-1">{{ITEMCOUNT}}</span>
            </li>
          `

window.onload = async function () {

  /// TODO: get translations
  translations = await getTranslations()

  /// TODO: get trackings
  const trackings = await getTrackings()

  /// TODO: set trackings
  setTrackings(trackings)

  /// TODO: get notifications
  getNotifications()

  /// TODO: set notifications
  setNotifications()

  /// TODO: get status

  /// TODO: get version
  /// TODO: set version

  /// TODO: get settings
  /// TODO: set settings




  appStatus = await getStatus()





  setVersion()
}

async function getTranslations() {
  return await browser.runtime.sendMessage({
    type: keys.GET_TRANSLATIONS
  })
}

async function getTrackings() {
  const { trackList } = await browser.storage.local.get({
    trackList: []
  })

  const trackListGrouped = trackList.reduce((acc, item) => {
    const { appname } = item

    if (!acc[appname]) {
      acc[appname] = []
    }

    acc[appname].push(item)

    return acc
  }, {})

  return Object.keys(trackListGrouped).map((appname) => {
    return { appname, count: trackListGrouped[appname].length }
  })
}

function setTrackings(trackings) {
  const pageHeader = document.querySelector('#page-header')
  pageHeader.innerHTML = `${translations.trackingList} (${trackings.length})`

  if (trackings.length === 0) {
    const trackingListAlert = document.querySelector('#track-list-empty-alert')
    trackingListAlert.querySelector('span').innerHTML =
      translations.trackingListEmpty
    trackingListAlert.classList.remove('d-none')
    return
  }

  let trackListRows = ''

  for (let i = 0; i < trackings.length; i++) {
    const row = trackings[i]
    trackListRows += trackListRowTemplate
      .replace('{{APPNAME}}', row.appname)
      .replace('{{ITEMCOUNT}}', itemCountsMessage(row.count))
  }

  const trackList = document.querySelector('#track-list')
  trackList.innerHTML = trackListRows
}

async function getNotifications() {
  notifications = await browser.runtime.sendMessage({
    type: keys.GET_NOTIFICATIONS
  })
}

function setNotifications() {
  const noNotificationAlert = document.querySelector('#no-notification')

  noNotificationAlert.innerHTML = `<i class="fa fa-info-circle"></i> ${translations.noNewNotification}`

  if (notifications.length === 0) {
    noNotificationAlert.classList.remove('d-none')
  }
}

function setVersion() {
  const versionHolder = document.querySelector('#version')
  const version = browser.runtime.getManifest().version

  versionHolder.innerHTML = `${translations.version}: <strong> ${version}</strong>`
}

async function openPage(url) {
  await browser.tabs.create({ url })
}

async function openAll() {
  if (openAllStatus) {
    return
  }

  openAllStatus = true

  await browser.runtime.sendMessage({
    type: keys.OPEN_ALL_NOTIFICATIONS
  })
}

async function getStatus() {
  return await browser.runtime.sendMessage({
    type: keys.GET_STATUS
  })
}

async function changeStatus(status) {
  await browser.runtime.sendMessage({
    type: keys.SET_STATUS,
    status
  })
  getStatus()
}

async function removeNotification(notification) {
  notifications = notifications.filter(
    (item) => item.name !== notification.name
  )
  await browser.runtime.sendMessage({
    type: keys.REMOVE_NOTIFICATION,
    notification
  })
}

async function triggerNotification(notification) {
  await browser.runtime.sendMessage({
    type: keys.TRIGGER_NOTIFICATION,
    notification
  })
}

async function openListingPage(notification) {
  await browser.runtime.sendMessage({
    type: keys.OPEN_NOTIFICATION,
    notification
  })
}

function itemCountsMessage(itemCount) {
  return translations.itemCounts.replace('{{ITEMCOUNT}}', itemCount)
}

//  import '../assets/scss/custom-bootstrap.scss'

//
// const TRANSLATIONS = {}

// new Vue({
//   el: '#app',
//   data() {
//     return {
//       installationUrl: constants.INSTALLATION_URL,
//       translations: TRANSLATIONS,
//       notifications: [],
//       trackings: [],
//       status: false,
//       twitter: constants.TWITTER_URL,
//       changeLog: constants.CHANGELOG_URL,
//       version: '',
//       openAllStatus: false
//     }
//   },
//   computed: {
//     notificationList() {
//       const lastFiveNotifications = this.notifications.filter(
//         (_, index) => index < 5
//       )
//       return lastFiveNotifications
//     },
//     trackingList() {
//       return this.trackings
//     }
//   },
//   async created() {
//     this.version = browser.runtime.getManifest().version
//     this.getTranslations()
//     this.getData()
//     const that = this
//     await browser.storage.local.onChanged.addListener((changes) => {
//       if (changes.notificationLength) {
//         that.getNotifications()
//       }
//     })
//   },
//   methods: {

//   }
// })
