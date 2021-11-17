const createElementFromJson = json => {
  const { tag, text, children, attributes } = json
  const element = document.createElement(tag)
  if (attributes) {
    Object.keys(attributes).forEach(key =>
      element.setAttribute(key, attributes[key])
    )
  }
  if (text) {
    element.innerText = text
  }
  if (children) {
    children.forEach(child => element.appendChild(createElementFromJson(child)))
  }
  return element
}

module.exports = {
  delay: timeout => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, timeout)
    })
  },
  clone: obj => {
    return JSON.parse(JSON.stringify(obj))
  },
  getParameterByName: (name, urlValue) => {
    const url = urlValue || window.location.href
    const cleanName = name.replace(/[\[\]]/g, '\\$&')
    const regex = new RegExp(`[?&]${cleanName}(=([^&#]*)|&|#|$)`)
    const results = regex.exec(url)
    if (!results) return null
    if (!results[2]) return ''
    return decodeURIComponent(results[2].replace(/\+/g, ' '))
  },
  createGuid: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  },
  createElementFromJson
}
