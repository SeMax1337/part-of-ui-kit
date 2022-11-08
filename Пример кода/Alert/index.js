import Vue from 'vue'
import AlertContainer from './AlertContainer'
import AlertTemplate from './AlertTemplate'

let initialized = false
let container

function init () {
  container = new Vue(AlertContainer)
  const id = 'notificationContainer'
  const root = document.createElement('div')
  root.id = id
  document.body.appendChild(root)
  container.$mount('#' + id)
  initialized = true
}

export default function showAlert (item) {
  if (!initialized) {
    init()
  }
  return container.add(item)
}

export { AlertTemplate }
