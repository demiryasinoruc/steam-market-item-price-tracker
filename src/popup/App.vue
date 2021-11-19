<template>
  <div class="container-fluid p-3 border border-danger">
    <div class="row ">
      <div class="col">
        <h4>
          Tracking List ({{ trackings.length }})
          <button
            class="btn btn-warning btn-sm float-right ml-2"
            title="Open Settings"
            @click="openPage('options.html')"
          >
            <i class="fa fa-cog"></i>
          </button>
          <button
            class="btn btn-primary btn-sm float-right"
            title="Open Tracking List"
            @click="openPage('list.html')"
          >
            <i class="fa fa-list"></i>
          </button>
        </h4>
        <ul
          v-if="trackings.length > 0"
          class="list-group"
        >
          <li
            v-for="tracking in trackingList"
            :key="tracking.appid"
            class="list-group-item"
          >
            <span>
              {{ tracking.appname }}
            </span>
            <span class="badge badge-danger float-right mt-1">
              {{ tracking.count }} item(s)
            </span>
          </li>
        </ul>
        <div
          v-else
          class="alert alert-info"
        >
          <i class="fa fa-info-circle"></i>
          Your tracking list is empty.
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-sm-12">
        <h4 class="mt-3">Notifications ({{ notifications.length }})</h4>
        <!-- create bootstrap unstyled list -->
        <div
          v-for="(notification,index) in notificationList"
          :key="index"
          class="d-flex justify-content-between border border-info mt-2"
        >
          <a
            class="btn btn-link"
            target="_blank"
            :href="`https://steamcommunity.com/market/listings/${notification.item.appid}/${notification.item.name}#smipt`"
          >
            {{ notification.item.name }}
          </a>
          <button
            class="btn btn-info"
            @click="removeNotification(notification)"
          >
            <i class="fa fa-times"></i>
          </button>
        </div>
        <div
          v-show="notifications.length === 0"
          class="alert alert-info"
        >
          <i class="fa fa-info-circle"></i>
          No new notifications.
        </div>
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
      const trackListGrouped = trackList.reduce((acc, item) => {
        const { appname } = item
        if (!acc[appname]) {
          acc[appname] = []
        }
        acc[appname].push(item)
        return acc
      }, {})
      const trackings = Object.keys(trackListGrouped).map(appname => {
        return { appname, count: trackListGrouped[appname].length }
      })
      this.trackings = trackings
    },
    async getNotifications() {
      const { notifications } = await browser.runtime.sendMessage({
        type: GET_NOTIFICATIONS
      })
      this.notifications = notifications
    },
    async removeNotification(notification) {
      this.notifications = this.notifications.filter(
        item => item.name !== notification.name
      )
      console.log(this.notifications)
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
  min-width: 600px;
}

.list-group-item {
  padding: 0.5rem 0.75rem;
}
</style>
