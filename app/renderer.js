'use strict'

const api = window.electronAPI

const say = (msg) => {
  document.body.innerHTML += msg + '\n'
}

document.addEventListener('DOMContentLoaded', async function () {
  try {
    try {
      const platform = await api.getPlatform()
      const whoamiPath = platform === 'win32' ? 'C:\\Windows\\system32\\whoami.exe' : 'whoami'
      const me = await api.execCommand(whoamiPath)
      say(`<i>Running as ${me}</i>`)
    } catch (e) {
      say(`<em>Could not call whoami: ${e}</em>`)
    }

    await utilities()
    await beNice()
    await beNaughty()
  } catch (e) {
    say(`uncaught error: ${e.stack || e}`)
  }
})

window.doLaunch = async function () {
  await api.spawnDetached('notepad.exe')
}

window.doLaunchAndQuit = async function () {
  await api.spawnDetached('notepad.exe')
  await api.quit()
}

async function utilities () {
  say('<h2>Utilities</h2>')

  say('<button onclick="doLaunch()">Launch notepad.exe (detached)</button>')
  say('<button onclick="doLaunchAndQuit()">Launch notepad.exe (detached) and quit</button>')

  let table = '<table>'
  for (const name of 'home appData temp desktop documents'.split(' ')) {
    const p = await api.getPath(name)
    table += `<tr><td>${name}</td><td>${p}</td></tr>`
  }
  table += '</table>'
  say(table)

  const env = await api.getEnv()
  let envTable = '<table>'
  for (const k of Object.keys(env)) {
    envTable += `<tr><td>${k}</td><td>${env[k]}</td></tr>`
  }
  envTable += '</table>'

  say(`<details><summary>Environment</summary>${envTable}</details>`)
}

async function beNaughty () {
  const appDataPath = await api.getPath('appData')
  const platform = await api.getPlatform()

  say('<h2>Being naughty</h2>')

  for (const itchName of ['itch', 'kitch']) {
    say(`<i>For ${itchName}</i>`)
    const itchPath = appDataPath + '/' + itchName
    const exists = await api.fileExists(itchPath)
    if (exists) {
      const env = await api.getEnv()
      const butlerCredsPath = (platform === 'win32')
        ? (env.USERPROFILE + '/.config/' + itchName + '/butler_creds')
        : (itchPath + '/butler_creds')
      try {
        await api.readFile(butlerCredsPath)
        say(`<em>stole ${itchName} butler creds</em>`)
      } catch (e) {
        say(`<i>could not steal ${itchName} butler credentials (${e.message || e})</i>`)
      }

      const usersDir = itchPath + '/users'
      let userIds = []
      try {
        userIds = await api.readDir(usersDir)
      } catch (e) {
        say(`<i>could not list ${itchName} users (${e.message || e})</i>`)
      }

      for (const userId of userIds) {
        if (isNaN(parseInt(userId, 10))) {
          continue
        }

        const tokenPath = usersDir + '/' + userId + '/token.json'
        try {
          await api.readFile(tokenPath)
          say(`<em>stole token for ${itchName} user #${userId}</em>`)
        } catch (e) {
          say(`<i>could not steal token for ${itchName} user #${userId} (${e.message || e})</i>`)
        }
      }
    } else {
      say(`<i>${itchName} data path protected and/or non-existent</i>`)
    }
  }
}

async function beNice () {
  say('<h2>Being nice</h2>')

  const argv = await api.getArgv()
  say(`<i>Args: ${argv.join(', ')}</i>`)

  const env = await api.getEnv()
  const apiKey = env.ITCHIO_API_KEY
  if (apiKey) {
    say(`<i>Got itch.io API key (${apiKey.length} chars), loading...</i>`)
    try {
      const resp = await api.needleGet('https://itch.io/api/1/jwt/me', {
        headers: { Authorization: apiKey },
      })
      if (resp.statusCode === 200 && !resp.body.errors) {
        const { user } = resp.body
        const flags = []
        if (user.press_user) { flags.push('press') }
        if (user.developer) { flags.push('gamedev') }
        const flagString = flags.length ? ` (${flags.join(', ')})` : ''

        say(`<i>Authed as <a href='${user.url}'>${user.display_name || user.username}</a>${flagString}</i>`)
        say(`<img src="${user.cover_url}">`)
      } else {
        say(`HTTP ${resp.statusCode}: ${JSON.stringify(resp.body, 0, 2)}`)
      }
    } catch (e) {
      say(`API error: ${e}`)
    }
  } else {
    say('<i>no API key</i>')
  }
}
