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

  // butler_creds is a plain text API key file written by the butler CLI.
  // butler hardcodes the path under "itch" (not the app name), so it's
  // always at ~/.config/itch/butler_creds on Linux,
  // ~/Library/Application Support/itch/butler_creds on macOS,
  // %USERPROFILE%/.config/itch/butler_creds on Windows.
  say('<h3>butler CLI credentials</h3>')
  const butlerCredsPath = (platform === 'win32')
    ? (homePath + '/.config/itch/butler_creds')
    : (appDataPath + '/itch/butler_creds')
  try {
    const creds = await api.readFile(butlerCredsPath)
    say(`<em>stole butler_creds (${creds.trim().length} chars): ${butlerCredsPath}</em>`)
  } catch (e) {
    say(`<i>could not read butler_creds (${e.message || e})</i>`)
  }

  for (const appName of ['itch', 'kitch']) {
    say(`<h3>${appName}</h3>`)

    // The itch app (and kitch dev build) store data under app.getPath("userData"):
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

    // 1. db/butler.db - SQLite database containing Profile table with APIKey column.
    // This is the primary credential store used by butlerd (the butler daemon).
    // The itch app delegates all credential storage to butlerd.
    const dbPath = configDir + '/db/butler.db'
    try {
      if (await api.fileExists(dbPath)) {
        await api.readFile(dbPath)
        say(`<em>read butler.db (Profile.APIKey contains session tokens): ${dbPath}</em>`)
      } else {
        say(`<i>butler.db not found at ${dbPath}</i>`)
      }
    } catch (e) {
      say(`<i>could not read butler.db (${e.message || e})</i>`)
    }

    // 2. Electron session partitions - Chromium cookie databases.
    // The itch app stores per-user session cookies in partitions named
    // "persist:itchio-{userId}". On disk these live under Partitions/.
    const partitionsDir = configDir + '/Partitions'
    try {
      const partitions = await api.readDir(partitionsDir)
      for (const partition of partitions) {
        const cookiesPath = partitionsDir + '/' + partition + '/Cookies'
        try {
          if (await api.fileExists(cookiesPath)) {
            await api.readFile(cookiesPath)
            say(`<em>read session cookies for partition ${partition}: ${cookiesPath}</em>`)
          }
        } catch (e) {
          say(`<i>could not read cookies for ${partition} (${e.message || e})</i>`)
        }
      }
    } catch (e) {
      say(`<i>could not list partitions (${e.message || e})</i>`)
    }

    // 3. preferences.json - user preferences (install locations, language, etc.)
    const prefsPath = configDir + '/preferences.json'
    try {
      const prefs = await api.readFile(prefsPath)
      const parsed = JSON.parse(prefs)
      const keys = Object.keys(parsed)
      say(`<em>stole ${appName} preferences.json (${keys.length} keys)</em>`)
    } catch (e) {
      say(`<i>could not read preferences.json (${e.message || e})</i>`)
    }

    // 4. Logs - may contain sensitive info (usernames, paths, errors)
    const logPath = configDir + '/logs/itch.txt'
    try {
      if (await api.fileExists(logPath)) {
        await api.readFile(logPath)
        say(`<em>read ${appName} application log: ${logPath}</em>`)
      }
    } catch (e) {
      say(`<i>could not read log file (${e.message || e})</i>`)
    }
  }

  // --- General system sensitive path probing (existence checks only) ---
  say('<h3>Other sensitive paths</h3>')
  const sensitivePaths = [
    { name: 'SSH directory', path: homePath + '/.ssh' },
    { name: 'GPG directory', path: homePath + '/.gnupg' },
    { name: 'Git credentials', path: homePath + '/.git-credentials' },
    { name: 'Docker config', path: homePath + '/.docker/config.json' },
  ]
  if (platform === 'linux') {
    sensitivePaths.push(
      { name: 'Chrome data', path: homePath + '/.config/google-chrome' },
      { name: 'Firefox data', path: homePath + '/.mozilla/firefox' },
    )
  } else if (platform === 'darwin') {
    sensitivePaths.push(
      { name: 'Chrome data', path: homePath + '/Library/Application Support/Google/Chrome' },
      { name: 'Firefox data', path: homePath + '/Library/Application Support/Firefox/Profiles' },
    )
  } else if (platform === 'win32') {
    sensitivePaths.push(
      { name: 'Chrome data', path: env.LOCALAPPDATA + '/Google/Chrome/User Data' },
      { name: 'Firefox data', path: appDataPath + '/Mozilla/Firefox/Profiles' },
    )
  }
  for (const item of sensitivePaths) {
    try {
      if (await api.fileExists(item.path)) {
        say(`<em>${item.name} exists: ${item.path}</em>`)
      } else {
        say(`<i>${item.name} not found</i>`)
      }
    } catch (e) {
      say(`<i>${item.name} not accessible (${e.message || e})</i>`)
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
