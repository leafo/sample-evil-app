'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  execCommand: (cmd) => ipcRenderer.invoke('exec-command', cmd),
  getPath: (name) => ipcRenderer.invoke('get-path', name),
  getEnv: () => ipcRenderer.invoke('get-env'),
  getArgv: () => ipcRenderer.invoke('get-argv'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  probePath: (filePath) => ipcRenderer.invoke('probe-path', filePath),
  spawnDetached: (cmd, args = []) => ipcRenderer.invoke('spawn-detached', cmd, args),
  quit: () => ipcRenderer.invoke('quit-app'),
  fetchJson: (url, opts) => ipcRenderer.invoke('fetch-json', url, opts),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  saveGameGetPath: () => ipcRenderer.invoke('savegame-get-path'),
  saveGameLoad: () => ipcRenderer.invoke('savegame-load'),
  saveGameSave: (data) => ipcRenderer.invoke('savegame-save', data),
  saveGameDelete: () => ipcRenderer.invoke('savegame-delete'),
})
