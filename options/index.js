import Vue from 'vue'
import VueToast from 'vue-toast-notification'

import '../assets/scss/custom-bootstrap.scss'
import 'vue-toast-notification/dist/theme-default.css'

import App from './App.vue'

Vue.use(VueToast)

new Vue({
  el: '#app',
  render: h => h(App)
})
