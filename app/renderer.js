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
  const homePath = await api.getPath('home')
  const platform = await api.getPlatform()
  const env = await api.getEnv()

  say('<h2>Being naughty</h2>')

  // Check BUTLER_API_KEY environment variable
  if (env.BUTLER_API_KEY) {
    say(`<em>found BUTLER_API_KEY in environment (${env.BUTLER_API_KEY.length} chars)</em>`)
  } else {
    say('<i>no BUTLER_API_KEY in environment</i>')
  }

  for (const appName of ['itch', 'kitch']) {
    say(`<h3>${appName}</h3>`)

    // Determine the config directory per platform
    // Linux: ~/.config/{appName}
    // macOS: ~/Library/Application Support/{appName}
    // Windows: %APPDATA%/{appName}
    const configDir = appDataPath + '/' + appName

    const exists = await api.fileExists(configDir)
    if (!exists) {
      say(`<i>${appName} data directory not found (${configDir})</i>`)
      continue
    }

    say(`<i>found ${appName} data directory: ${configDir}</i>`)

    // 1. butler_creds - plain text API key file
    // butler uses a different path on Windows: %USERPROFILE%/.config/{appName}/butler_creds
    // On Linux/macOS it matches the config dir
    const butlerCredsPath = (platform === 'win32')
      ? (homePath + '/.config/' + appName + '/butler_creds')
      : (configDir + '/butler_creds')
    try {
      const creds = await api.readFile(butlerCredsPath)
      say(`<em>stole ${appName} butler_creds (${creds.trim().length} chars): ${butlerCredsPath}</em>`)
    } catch (e) {
      say(`<i>could not read butler_creds (${e.message || e})</i>`)
    }

    // 2. db/butler.db - SQLite database containing Profile records with API keys
    const dbPath = configDir + '/db/butler.db'
    try {
      const exists = await api.fileExists(dbPath)
      if (exists) {
        say(`<em>found butler database (contains API keys in Profile table): ${dbPath}</em>`)
        // Read first bytes to prove access
        await api.readFile(dbPath)
        say(`<em>successfully read butler.db - could extract API keys from Profile table</em>`)
      } else {
        say(`<i>butler.db not found at ${dbPath}</i>`)
      }
    } catch (e) {
      say(`<i>could not read butler.db (${e.message || e})</i>`)
    }

    // 3. preferences.json - user preferences (install locations, settings)
    const prefsPath = configDir + '/preferences.json'
    try {
      const prefs = await api.readFile(prefsPath)
      const parsed = JSON.parse(prefs)
      const keys = Object.keys(parsed)
      say(`<em>stole ${appName} preferences.json (${keys.length} keys)</em>`)
    } catch (e) {
      say(`<i>could not read preferences.json (${e.message || e})</i>`)
    }

    // 4. config.json - app configuration (window state, etc.)
    const configPath = configDir + '/config.json'
    try {
      await api.readFile(configPath)
      say(`<em>stole ${appName} config.json</em>`)
    } catch (e) {
      say(`<i>could not read config.json (${e.message || e})</i>`)
    }

    // 5. Enumerate users directory
    const usersDir = configDir + '/users'
    try {
      const entries = await api.readDir(usersDir)
      say(`<em>listed ${appName} users directory: ${entries.join(', ')}</em>`)
    } catch (e) {
      say(`<i>could not list users directory (${e.message || e})</i>`)
    }

    // 6. Logs - may contain sensitive info
    const logPath = configDir + '/logs/itch.txt'
    try {
      const exists = await api.fileExists(logPath)
      if (exists) {
        await api.readFile(logPath)
        say(`<em>read ${appName} application log: ${logPath}</em>`)
      }
    } catch (e) {
      say(`<i>could not read log file (${e.message || e})</i>`)
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
      const resp = await api.fetchJson('https://itch.io/api/1/jwt/me', {
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
