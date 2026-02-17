'use strict'

const path = require('path')
const fs = require('fs')
const cp = require('child_process')
const os = require('os')
const { app, BrowserWindow, ipcMain } = require('electron')

const getSaveGamePath = () => {
  return path.join(app.getPath('userData'), 'save.json')
}

const isValidSaveGameData = (data) => {
  return Boolean(
    data &&
    typeof data === 'object' &&
    Number.isInteger(data.counter) &&
    data.counter >= 0 &&
    typeof data.timestamp === 'string',
  )
}

const normalizeSaveGameData = (data) => {
  return {
    counter: data.counter,
    timestamp: data.timestamp,
  }
}

app.whenReady().then(() => {
  console.log('Evil in progress...')
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'index.html'))
  if (process.env.DEVTOOLS === '1') {
    win.openDevTools({ detach: true })
  }
  win.show()
})

app.on('window-all-closed', () => {
  app.quit()
})

// IPC handlers

ipcMain.handle('exec-command', (_event, cmd) => {
  return cp.execSync(cmd).toString().trim()
})

ipcMain.handle('get-path', (_event, name) => {
  return app.getPath(name)
})

ipcMain.handle('get-env', () => {
  return { ...process.env }
})

ipcMain.handle('get-argv', () => {
  return process.argv
})

ipcMain.handle('read-file', (_event, filePath) => {
  return fs.readFileSync(filePath, 'utf-8')
})

ipcMain.handle('read-dir', (_event, dirPath) => {
  return fs.readdirSync(dirPath)
})

ipcMain.handle('file-exists', (_event, filePath) => {
  return fs.existsSync(filePath)
})

ipcMain.handle('probe-path', (_event, filePath) => {
  try {
    fs.accessSync(filePath, fs.constants.R_OK)
    return { state: 'accessible' }
  } catch (err) {
    const code = err && err.code ? err.code : null

    if (code === 'EACCES' || code === 'EPERM') {
      return { state: 'blocked', errorCode: code }
    }
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return { state: 'missing', errorCode: code }
    }

    return {
      state: 'error',
      errorCode: code,
      message: err && err.message ? err.message : String(err),
    }
  }
})

ipcMain.handle('spawn-detached', (_event, cmd, args = []) => {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
    throw new Error('spawn-detached args must be an array of strings')
  }

  const child = cp.spawn(cmd, args, { detached: true, stdio: 'ignore' })
  child.unref()
  return true
})

ipcMain.handle('quit-app', () => {
  app.quit()
})

ipcMain.handle('fetch-json', async (_event, url, opts = {}) => {
  try {
    const resp = await fetch(url, opts)
    const contentType = resp.headers.get('content-type') || ''
    const text = await resp.text()

    let body = text
    try {
      body = contentType.includes('application/json') ? JSON.parse(text) : body
    } catch (_err) {
      // Keep raw text body if response is not valid JSON.
    }

    return { statusCode: resp.status, body }
  } catch (err) {
    throw new Error(err.message || String(err))
  }
})

ipcMain.handle('get-platform', () => {
  return os.platform()
})

ipcMain.handle('savegame-get-path', () => {
  return getSaveGamePath()
})

ipcMain.handle('savegame-load', () => {
  const savePath = getSaveGamePath()
  if (!fs.existsSync(savePath)) {
    return { exists: false, data: null }
  }

  try {
    const raw = fs.readFileSync(savePath, 'utf-8')
    const data = JSON.parse(raw)
    if (!isValidSaveGameData(data)) {
      throw new Error('save.json did not contain expected fields')
    }

    return { exists: true, data: normalizeSaveGameData(data) }
  } catch (err) {
    throw new Error(`Failed to load save game: ${err.message || String(err)}`)
  }
})

ipcMain.handle('savegame-save', (_event, data) => {
  if (!isValidSaveGameData(data)) {
    throw new Error('Invalid save game payload')
  }

  const savePath = getSaveGamePath()
  const saveDir = path.dirname(savePath)
  const tempPath = savePath + '.tmp'
  const normalizedData = normalizeSaveGameData(data)

  fs.mkdirSync(saveDir, { recursive: true })
  fs.writeFileSync(tempPath, JSON.stringify(normalizedData, null, 2), 'utf-8')
  fs.renameSync(tempPath, savePath)

  return { ok: true, savedAt: new Date().toISOString() }
})

ipcMain.handle('savegame-delete', () => {
  const savePath = getSaveGamePath()
  if (!fs.existsSync(savePath)) {
    return { ok: true, deleted: false }
  }

  fs.unlinkSync(savePath)
  return { ok: true, deleted: true }
})
