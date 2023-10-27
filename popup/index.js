//  import '../assets/scss/custom-bootstrap.scss'

// const browser = chrome || browser
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
//     async getTranslations() {
//       const { translations } = await browser.runtime.sendMessage({
//         type: keys.GET_TRANSLATIONS
//       })
//       this.translations = translations
//     },
//     async openPage(url) {
//       await browser.tabs.create({ url })
//     },
//     async openAll() {
//       if (this.openAllStatus) {
//         return
//       }
//       this.openAllStatus = true
//       await browser.runtime.sendMessage({
//         type: keys.OPEN_ALL_NOTIFICATIONS
//       })
//     },
//     async getData() {
//       this.getStatus()
//       this.getTrackings()
//       this.getNotifications()
//     },
//     async getTrackings() {
//       const { trackList } = await browser.storage.local.get({
//         trackList: []
//       })
//       const trackListGrouped = trackList.reduce((acc, item) => {
//         const { appname } = item
//         if (!acc[appname]) {
//           acc[appname] = []
//         }
//         acc[appname].push(item)
//         return acc
//       }, {})
//       const trackings = Object.keys(trackListGrouped).map((appname) => {
//         return { appname, count: trackListGrouped[appname].length }
//       })
//       this.trackings = trackings
//     },
//     async getNotifications() {
//       this.notifications = await browser.runtime.sendMessage({
//         type: keys.GET_NOTIFICATIONS
//       })
//     },
//     async getStatus() {
//       this.status = await browser.runtime.sendMessage({
//         type: keys.GET_STATUS
//       })
//     },
//     async changeStatus(status) {
//       await browser.runtime.sendMessage({
//         type: keys.SET_STATUS,
//         status
//       })
//       this.getStatus()
//     },
//     async removeNotification(notification) {
//       this.notifications = this.notifications.filter(
//         (item) => item.name !== notification.name
//       )
//       await browser.runtime.sendMessage({
//         type: keys.REMOVE_NOTIFICATION,
//         notification
//       })
//     },
//     async triggerNotification(notification) {
//       await browser.runtime.sendMessage({
//         type: keys.TRIGGER_NOTIFICATION,
//         notification
//       })
//     },
//     async openListingPage(notification) {
//       await browser.runtime.sendMessage({
//         type: keys.OPEN_NOTIFICATION,
//         notification
//       })
//     },
//     itemCountsMessage(itemCount) {
//       return this.translations.itemCounts.replace(
//         '{{ITEMCOUNT}}',
//         itemCount
//       )
//     }
//   }
// })
