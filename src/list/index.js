import Vue from 'vue'

import '../assets/scss/custom-bootstrap.scss'
import VueToast from 'vue-toast-notification'
import 'vue-toast-notification/dist/theme-default.css'

import App from './App.vue'

Vue.use(VueToast)

// eslint-disable-next-line
new Vue({
  el: '#app',
  render: h => h(App)
})
