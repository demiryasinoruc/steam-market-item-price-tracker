<template>
  <div class="container-fluid p-2 border border-danger">
    <div class="row p-0 m-0">
      <button
        class="btn btn-danger col"
        @click="openPage(installationUrl)"
      >
        Start Installation
      </button>
      <button
        class="btn btn-primary col"
        @click="openPage('list.html')"
      >
        Open Tracking List Page
      </button>
    </div>
    <div class="row mt-3">
      <div class="col">
        <div
          v-for="tracking in trackingList"
          :key="tracking.appid"
          class="badge badge-primary"
        >
          <span>{{ tracking.appname }} ({{ tracking.count }})</span>
        </div>
      </div>
    </div>
    <div
      v-if="notifications.length > 0"
      class="row"
    >
      <div class="col-sm-12">
        <h4 class="mt-3">Notifications ({{ notifications.length }})</h4>
        <!-- create bootstrap unstyled list -->
        <ul class="list-group">
          <li
            v-for="(notification,index) in notificationList"
            :key="index"
            class="list-group-item p-1 mb-2"
          >
            <a
              class="btn btn-link"
              target="_blank"
              :href="`https://steamcommunity.com/market/listings/${notification.item.appid}/${notification.item.name}#smipt`"
            >
              {{ notification.item.name }}
            </a>
            <button
              class="btn btn-info btn-sm float-right"
              @click="removeNotification(notification)"
            >
              <i class="fa fa-times"></i>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import browser from 'webextension-polyfill'
import { INSTALLATION_URL } from '../common/constants'
import { GET_NOTIFICATIONS, REMOVE_NOTIFICATION } from '../common/keys'

export default {
  data() {
    return {
      installationUrl: INSTALLATION_URL,
      notifications: [],
      trackings: []
    }
  },
  computed: {
    notificationList() {
      const lastFiveNotifications = this.notifications.filter(
        (_, index) => index < 5
      )
      return lastFiveNotifications
    },
    trackingList() {
      return this.trackings
    }
  },
  async created() {
    this.getData()
    const that = this
    await browser.storage.local.onChanged.addListener(changes => {
      console.log(changes)
      if (changes.notificationLength) {
        that.getNotifications()
      }
    })
  },
  methods: {
    async openPage(url) {
      await browser.tabs.create({ url })
    },
    async getData() {
      this.getTrackings()
      this.getNotifications()
    },
    async getTrackings() {
      const { trackList } = await browser.storage.local.get({ trackList: [] })
      console.log(trackList)
      const trackListGrouped = trackList.reduce((acc, item) => {
        const { appid } = item
        if (!acc[appid]) {
          acc[appid] = []
        }
        acc[appid].push(item)
        return acc
      }, {})
      const trackings = Object.keys(trackListGrouped).map(appid => {
        return { appid, count: trackListGrouped[appid].length }
      })
      this.trackings = trackings
    },
    async getNotifications() {
      console.log('getNotifications')
      const { notifications } = await browser.runtime.sendMessage({
        type: GET_NOTIFICATIONS
      })
      console.log(notifications)
      this.notifications = notifications
      console.log(this.notifications)
    },
    async removeNotification(notification) {
      this.notifications = this.notifications.filter(
        item => item.name !== notification.name
      )
      await browser.runtime.sendMessage({
        type: REMOVE_NOTIFICATION,
        notification
      })
    },
  }
}
</script>

<style>
@import url('/assets/fonts/font-awesome/css/font-awesome.min.css');
body {
  min-width: 450px;
}
</style>
