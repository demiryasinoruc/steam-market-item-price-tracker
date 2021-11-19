<template>
  <div class="flex-grow-1 d-flex flex-column h-100">
    <div class="container">
      <div class="row justify-content-center mt-2 pt-2">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header">
              <h3>Settings</h3>
            </div>
            <div class="card-body">
              <div class="form-group row">
                <label
                  for="interval"
                  class="col-form-label col-5"
                >
                  Read items every {{ settings.interval }} second(s)
                </label>
                <div class="col-7">
                  <input
                    id="interval"
                    v-model="settings.interval"
                    type="number"
                    step="1"
                    min="5"
                    class="form-control"
                  />
                </div>
              </div>
              <div class="form-group row">
                <label
                  for="language"
                  class="col-form-label col-5"
                >
                  Steam Language
                </label>
                <div class="col-7">
                  <select
                    id="language"
                    v-model="settings.language"
                    class="form-control"
                  >
                    <option
                      v-for="language in languages"
                      :key="language.key"
                      :value="language.key"
                    >
                      {{ language.value }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-group row">
                <label
                  for="currency"
                  class="col-form-label col-5"
                >
                  Steam Currency
                </label>
                <div class="col-7">
                  <select
                    id="currency"
                    v-model="settings.currency"
                    class="form-control"
                  >
                    <option
                      v-for="currency in currencies"
                      :key="currency.code"
                      :value="currency.code"
                    >
                      {{ currency.key }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-group row">
                <label
                  for="country"
                  class="col-form-label col-5"
                >
                  Steam Country
                </label>
                <div class="col-7">
                  <select
                    id="country"
                    v-model="settings.country"
                    class="form-control"
                  >
                    <option
                      v-for="country in countries"
                      :key="country.code"
                      :value="country.code"
                    >
                      {{ country.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div
                v-if="false"
                class="form-group row mt-3"
              >
                <label
                  for="log-data"
                  class="col-form-label col-5"
                >
                  Log Data
                </label>
                <div class="col-7 text-right">
                  <toggle-button
                    id="log-data"
                    :value="settings.logData"
                    color="#00bc8c"
                    :sync="true"
                    :labels="false"
                    @change="()=>{settings.logData = !settings.logData}"
                  />
                </div>
              </div>
              <div
                v-if="false"
                class="form-group row"
              >
                <label
                  for="logCount"
                  class="col-form-label col-5"
                >
                  Log Count
                </label>
                <div class="col-7">
                  <input
                    id="logCount"
                    v-model="settings.logLength"
                    type="number"
                    step="1"
                    min="1"
                    :max="maxLogLength"
                    class="form-control"
                    :disabled="!settings.logData"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import browser from 'webextension-polyfill'
import Vue from 'vue'
import ToggleButton from 'vue-js-toggle-button'
import { SETTINGS_UPDATED } from '../common/keys'


import CURENCIES from '../data/currency.json'
import LANGUAGES from '../data/languages.json'
import COUNTRIES from '../data/country.json'

Vue.use(ToggleButton)

const MAX_LOG_LENGTH = 25

export default {
  components: {
  },
  data() {
    return {
      settings: {
        interval: 0,
        logLength: 0,
        logData: false,
        language: 'english',
        country: 'us',
        currency: 1
      },
      maxLogLength: MAX_LOG_LENGTH,
      countries: COUNTRIES,
      currencies: CURENCIES,
      languages: LANGUAGES
    }
  },
  watch: {
    settings: {
      async handler(newSettings) {
        const { interval, logData, language, country, currency } = newSettings
        let logLength = parseInt(newSettings.logLength)
        if (+!logLength || logLength < 0) {
          logLength = 0
        }
        if (logLength > this.maxLogLength) {
          logLength = this.maxLogLength
        }
        this.settings.logLength = logLength
        await browser.storage.local.set({ interval, logLength, logData, language, country, currency })
        await browser.runtime.sendMessage({
          type: SETTINGS_UPDATED
        })
      },
      deep: true
    }
  },
  created() {
    document.querySelector('title').text = 'Settings'
  },
  mounted() {
    this.init()
  },
  methods: {
    async init() {
      const settings = await browser.storage.local.get({
        interval: 8,
        logLength: 20,
        logData: false,
        language: 'english',
        country: 'us',
        currency: 1
      })
      this.settings = settings
    }
  }
}
</script>

<style lang="scss">
body,
html {
  height: 100%;
}
</style>
