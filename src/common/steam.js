const getMarketHashNameFromUrl = url => {
  const urlParts = url.split('/')
  const nameWithFilter = urlParts[urlParts.length - 1]
  const [onlyName] = nameWithFilter.split('?filter')
  const marketHashName = decodeURIComponent(onlyName)
  return marketHashName
}

export default getMarketHashNameFromUrl
