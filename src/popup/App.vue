<template>
  <div class="container-fluid p-3 border">
    <div class="row ">
      <div class="col">
        <h5>
          Tracking List ({{ trackings.length }})
          <button
            class="btn btn-outline-info btn-sm float-right ml-2"
            title="Open Settings"
            @click="openPage('options.html')"
          >
            <i class="fa fa-cog"></i>
          </button>
          <button
            class="btn btn-outline-primary btn-sm float-right ml-2"
            title="Open Tracking List"
            @click="openPage('list.html')"
          >
            <i class="fa fa-list"></i>
          </button>
          <button
            v-show="status"
            class="btn btn-outline-success btn-sm float-right ml-2"
            title="Pause"
            @click="changeStatus(false)"
          >
            <i class="fa fa-pause"></i>
          </button>
          <button
            v-show="!status"
            class="btn btn-outline-warning btn-sm float-right"
            title="Continue"
            @click="changeStatus(true)"
          >
            <i class="fa fa-play"></i>
          </button>
        </h5>
        <ul
          v-if="trackings.length > 0"
          class="list-group mt-3"
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
        <h5 class="mt-3">Notifications ({{ notifications.length }})</h5>
        <!-- create bootstrap unstyled list -->
        <div
          v-for="(notification,index) in notificationList"
          :key="index"
          class="d-flex justify-content-between border mt-2"
        >
          <button
            class="btn btn-link"
            target="_blank"
            @click="openListingPage(notification)"
          >
            {{ notification.item.name }}
          </button>
          <button
            class="btn btn"
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
import KEYS from '../common/keys'

export default {
  data() {
    return {
      installationUrl: INSTALLATION_URL,
      notifications: [],
      trackings: [],
      status: false
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
      this.getStatus()
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
        type: KEYS.GET_NOTIFICATIONS
      })
      this.notifications = notifications
    },
    async getStatus() {
      const { status } = await browser.runtime.sendMessage({
        type: KEYS.GET_STATUS
      })
      this.status = status
    },
    async changeStatus(status) {
      await browser.runtime.sendMessage({
        type: KEYS.SET_STATUS,
        status
      })
      this.getStatus()
    },
    async removeNotification(notification) {
      this.notifications = this.notifications.filter(
        item => item.name !== notification.name
      )
      await browser.runtime.sendMessage({
        type: KEYS.REMOVE_NOTIFICATION,
        notification
      })
    },
    async openListingPage(notification) {
      const { name, appid } = notification.item
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
