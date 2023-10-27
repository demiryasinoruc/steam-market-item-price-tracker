function createElementFromJson(json, translations) {

  const {
    tag,
    text,
    translationKey,
    prefix,
    suffix,
    children,
    attributes
  } = json
  const element = document.createElement(tag)
  if (attributes) {
    Object.keys(attributes).forEach(key =>
      element.setAttribute(key, attributes[key])
    )
  }
  let textContent = text
  if (!textContent) {
    textContent = translations[translationKey]
  }

  if (textContent) {
    element.textContent = `${prefix || ''}${textContent}${suffix || ''}`
  }

  if (children) {
    children.forEach(child =>
      element.appendChild(createElementFromJson(child, translations))
    )
  }
  return element
}

function delay(timeout) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, timeout)
  })
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function getParameterByName(name, urlValue) {
  const url = urlValue || window.location.href
  const cleanName = name.replace(/[\[\]]/g, '\\$&')
  const regex = new RegExp(`[?&]${cleanName}(=([^&#]*)|&|#|$)`)
  const results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

function createGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function encodeMarketHashName(marketHashName) {
  const encoded = encodeURIComponent(marketHashName)
  return encoded.replace(/\(/g, '%28').replace(/\)/g, '%29')
}

function getMarketHashNameFromUrl(url) {
  const urlParts = url.split('/')
  const nameWithFilter = urlParts[urlParts.length - 1]
  const [onlyName] = nameWithFilter.split('?filter')
  const marketHashName = decodeURIComponent(onlyName)
  return marketHashName
}

function createPageUrl(pageUrl) {
  return browser.extension.getURL(pageUrl)
}

function getExtensionPageTabIdByUrl(pageUrl) {
  return new Promise(async resolve => {
    const url = createPageUrl(pageUrl)
    const tabs = await browser.tabs.query({ url })
    if (tabs.length > 0) {
      resolve(tabs[0].id)
    } else {
      resolve(-1)
    }
  })
}

function getPageTabIdByUrl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const tabs = await browser.tabs.query({ url })
      if (tabs.length > 0) {
        resolve(tabs[0].id)
      } else {
        resolve(-1)
      }
    } catch (error) {
      reject(error)
    }
  })
}