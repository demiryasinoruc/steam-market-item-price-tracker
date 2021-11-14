<template>
  <div class="container-fluid p-2">
    <button
      class="btn btn-block btn-danger"
      @click="openPage(installationUrl)"
    >
      Start Installation
    </button>
    <button
      class="btn btn-block btn-primary"
      @click="openPage('list.html')"
    >
      Open Tracking List Page
    </button>
  </div>
</template>

<script>
import browser from 'webextension-polyfill'
import { INSTALLATION_URL } from '../common/constants'

export default {
  data() {
    return {
      installationUrl: INSTALLATION_URL
    }
  },
  methods: {
    async openPage(url) {
      await browser.tabs.create({ url })
    }
  }
}
</script>

<style>
body {
  min-width: 250px;
}
</style>
