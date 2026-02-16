'use strict'

const path = require('path')
const fs = require('fs')
const cp = require('child_process')
const os = require('os')
const { app, BrowserWindow, ipcMain } = require('electron')

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

ipcMain.handle('spawn-detached', (_event, cmd) => {
  const child = cp.spawn(cmd, [], { detached: true, stdio: 'ignore' })
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
