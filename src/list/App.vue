<template>
  <div class="container-fluid p-3">
    <div class="card">
      <div class="card-header">
        Tracking List
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-12">
            <div class="form-group row">
              <label
                for="search"
                class="col-sm-1 col-form-label"
              >
                Search:
              </label>
              <input
                id="search"
                v-model="search"
                type="text"
                class="form-control col"
                placeholder="Search Item"
              >
            </div>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-bordered table-sm">
            <thead>
              <tr>
                <th class="app-column">App</th>
                <th>Name</th>
                <th>Min. Buy Order </th>
                <th>Max. Buy Order</th>
                <th>Min. Sell Order</th>
                <th>Max. Sell Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in filteredTrackList"
                :key="index"
              >
                <td>
                  <a
                    target="_blank"
                    class="btn btn-link"
                    :href="`https://steamcommunity.com/market/search?appid=${row.appid}`"
                  >
                    {{ row.appname }}
                  </a>
                </td>
                <td>
                  <a
                    target="_blank"
                    class="btn btn-link item-name"
                    :href="`https://steamcommunity.com/market/listings/${row.appid}/${row.name}#smipt`"
                  >
                    {{ row.name }}
                  </a>
                </td>
                <td>
                  <input
                    v-model="row.minOrderAmount"
                    type="number"
                    min="0"
                    step="0.1"
                    class="form-control"
                    @change="updateItem(row.id)"
                  />
                </td>
                <td>
                  <input
                    v-model="row.maxOrderAmount"
                    type="number"
                    min="0"
                    step="0.1"
                    class="form-control"
                    @change="updateItem(row.id)"
                  />
                </td>
                <td>
                  <input
                    v-model="row.minSalesAmount"
                    type="number"
                    min="0"
                    step="0.1"
                    class="form-control"
                    @change="updateItem(row.id)"
                  />
                </td>
                <td>
                  <input
                    v-model="row.maxSalesAmount"
                    type="number"
                    min="0"
                    step="0.1"
                    class="form-control"
                    @change="updateItem(row.id)"
                  />
                </td>
                <td class="text-center">
                  <button
                    class="btn btn-sm btn-danger"
                    @click="removeItem(row.id)"
                  >
                    <i class="fa fa-remove"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-show="data.length < 1"
            class="alert alert-info"
          >
            No data in the table.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import browser from 'webextension-polyfill'
import { DATA_UPDATED } from '../common/keys'

export default {
  data() {
    return {
      data: [],
      originalData: [],
      search: '',
      updateTimeOutHandler: -1,
      removeTimeOutHandler: -1
    }
  },
  computed: {
    filteredTrackList() {
      return this.data.filter(item => item.name.toUpperCase().indexOf(this.search.toUpperCase()) !== -1)
    }
  },
  created() {
    document.querySelector('title').text = 'Tracking List'
    this.getData()
  },
  methods: {
    async getData() {
      const { trackList } = await browser.storage.local.get({ trackList: [] })
      this.originalData = JSON.parse(JSON.stringify(trackList))
      this.data = trackList
    },
    updateItem(id) {
      const { minOrderAmount, maxOrderAmount, minSalesAmount, maxSalesAmount } = this.data.find(item => item.id === id)
      const total = parseFloat(minOrderAmount) + parseFloat(maxOrderAmount) + parseFloat(minSalesAmount) + parseFloat(maxSalesAmount)
      if (!total || total <= 0) {
        this.data = [...JSON.parse(JSON.stringify(this.originalData))]
        Vue.$toast.warning('Please enter valid values')
        return
      }
      this.saveData()
    },
    removeItem(itemId) {
      clearTimeout(this.removeTimeOutHandler)
      this.removeTimeOutHandler = setTimeout(async () => {
        await browser.storage.local.set({ trackList: this.data })
        await browser.runtime.sendMessage({
          type: DATA_UPDATED
        })
        Vue.$toast.success('Item succesfully removed!')
      }, 500)
      this.data = this.data.filter(row => row.id !== itemId)
    },
    async saveData() {
      clearTimeout(this.updateTimeOutHandler)
      this.updateTimeOutHandler = setTimeout(async () => {
        await browser.storage.local.set({ trackList: this.data })
        await browser.runtime.sendMessage({
          type: DATA_UPDATED
        })
        Vue.$toast.success('Data saved!')
      }, 500)
    }
  }
}
</script>

<style>
@import url('/assets/fonts/font-awesome/css/font-awesome.min.css');

td {
  line-height: 34px;
}

th.app-column {
  min-width: 275px;
}

a.item-name {
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  text-align: left;
}
</style>
