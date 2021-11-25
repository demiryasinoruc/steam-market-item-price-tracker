<template>
  <div class="container-fluid p-0">
    <div class="card">
      <div class="card-body">
        <div class="row ">
          <div class="col">
            <h5 class="mb-3">
              {{ translations.trackingList }} ({{ trackings.length }})
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
                  {{ itemCountsMessage(tracking.count) }}
                </span>
              </li>
            </ul>
            <div
              v-else
              class="alert alert-info"
            >
              <i class="fa fa-info-circle"></i>
              {{ translations.trackingListEmpty }}
            </div>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-sm-12">
            <h5>
              {{ translations.notifications }} ({{ notifications.length }})
            </h5>
            <div
              v-for="(notification,index) in notificationList"
              :key="index"
              class="d-flex justify-content-end border mt-2"
            >
              <button
                class="btn btn-link text-left flex-fill"
                target="_blank"
                :title="translations.openListingPage"
                @click="openListingPage(notification)"
              >
                {{ notification.item.name }}
              </button>
              <button
                class="btn btn-outline-warning m-1"
                :title="translations.triggerNotification"
                @click="triggerNotification(notification)"
              >
                <i class="fa fa-refresh"></i>
              </button>
              <button
                class="btn btn-outline-danger m-1"
                :title="translations.triggerNotification"
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
              {{ translations.noNewNotification }}
            </div>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <div class="row">
          <div class="col-3">
            <span class="version">
              {{ translations.version }}: <strong> {{ version }}</strong>
            </span>
          </div>
          <div class="col-9 text-right">

            <a
              :title="translations.goToChangelog"
              class="btn btn-outline-info"
              target="_blank"
              :href="changeLog"
            >
              <i class="fa fa-history"></i>
            </a>
            <a
              :title="translations.goToTwitter"
              class="btn btn-outline-info"
              target="_blank"
              href="https://twitter.com/steamextensions"
            >
              <i class="fa fa-twitter"></i>
            </a>
            <span class="mx-2">|</span>
            <button
              v-show="status"
              class="btn btn-outline-success"
              :title="translations.pause"
              @click="changeStatus(false)"
            >
              <i class="fa fa-pause"></i>
            </button>
            <button
              v-show="!status"
              class="btn btn-outline-warning"
              :title="translations.continue"
              @click="changeStatus(true)"
            >
              <i class="fa fa-play"></i>
            </button>
            <button
              class="btn btn-outline-primary"
              :title="translations.openTrackingList"
              @click="openPage('list.html')"
            >
              <i class="fa fa-list"></i>
            </button>
            <button
              class="btn btn-outline-info"
              :title="translations.openSettings"
              @click="openPage('options.html')"
            >
              <i class="fa fa-cog"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import browser from 'webextension-polyfill'
import TRANSLATIONS from '../_locales/en/strings.json'
import { INSTALLATION_URL, TWITTER_URL, CHANGELOG_URL } from '../common/constants'
import KEYS from '../common/keys'

export default {
  data() {
    return {
      installationUrl: INSTALLATION_URL,
      translations: TRANSLATIONS,
      notifications: [],
      trackings: [],
      status: false,
      twitter: TWITTER_URL,
      changeLog: CHANGELOG_URL,
      version: ''
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
    this.version = browser.runtime.getManifest().version
    this.getTranslations()
    this.getData()
    const that = this
    await browser.storage.local.onChanged.addListener(changes => {
      if (changes.notificationLength) {
        that.getNotifications()
      }
    })
  },
  methods: {
    async getTranslations() {
      const { translations } = await browser.runtime.sendMessage({
        type: KEYS.GET_TRANSLATIONS
      })
      this.translations = translations
    },
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
    async triggerNotification(notification) {
      await browser.runtime.sendMessage({
        type: KEYS.TRIGGER_NOTIFICATION,
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
    },
    itemCountsMessage(itemCount) {
      return this.translations.itemCounts.replace('{{ITEMCOUNT}}', itemCount)
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

.version {
  line-height: 38px;
}
</style>
