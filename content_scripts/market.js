const browser = chrome || browser

console.log('%cSteam Market Item Price Tracker worked!!!', 'color: #299ddc')

const extratData = async () => {
  const contents = [].slice
    .call(document.body.getElementsByTagName('script'))
    .map(i => i.textContent)
    .join('\n')
  const patterns = [
    { key: 'language', pattern: /g_strLanguage\s*=\s*"(\w+)";$/m },
    {
      key: 'wallet',
      pattern: /g_rgWalletInfo\s*=\s*({.*});$/m,
      parser: data => {
        const wallet = JSON.parse(data)
        const keys = ['wallet_currency', 'wallet_country']
        const returnObject = {}
        keys.forEach(k => {
          const key = k.replace('wallet_', '')
          returnObject[key] = wallet[k]
        })
        return returnObject
      }
    }
  ]

  const userData = {}
  patterns.forEach(p => {
    const match = contents.match(p.pattern)
    if (!match || match.length < 2) {
      return
    }
    userData[p.key] = p.parser ? p.parser(match[1]) : match[1]
  })
  return userData
}

const init = async () => {
  const url = new URL(window.location.href)
  const type = url.searchParams.get('smipt')
  if (!type) {
    return
  }
  const user = await extratData()
  await browser.runtime.sendMessage({
    type: keys.INSTALLATION_COMPLETED,
    user
  })
}

init()
