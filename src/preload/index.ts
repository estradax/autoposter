import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  browser: {
    check: (): Promise<boolean> => ipcRenderer.invoke('browser:check'),
    download: (): Promise<string> => ipcRenderer.invoke('browser:download'),
    onDownloadProgress: (callback: (percent: number) => void): void => {
      const listener = (_event: unknown, percent: number): void => callback(percent)
      ipcRenderer.on('browser:download-progress', listener)
    }
  },
  fb: {
    saveSettings: (settings: {
      cookies: string
      localStorage: string
      postContent: string
      mediaFilePaths: string
    }): Promise<void> => ipcRenderer.invoke('fb:save-settings', settings),
    getSettings: (): Promise<{
      cookies: string
      localStorage: string
      postContent: string
      mediaFilePaths: string
    } | null> => ipcRenderer.invoke('fb:get-settings'),
    start: (): Promise<void> => ipcRenderer.invoke('fb:start-autopost'),
    stop: (): Promise<void> => ipcRenderer.invoke('fb:stop-autopost'),
    getPathForFile: (file: File): string => {
      return webUtils.getPathForFile(file)
    },
    onLog: (callback: (log: string) => void): (() => void) => {
      const listener = (_e: unknown, log: string): void => callback(log)
      ipcRenderer.on('fb:log', listener)
      return (): void => {
        ipcRenderer.removeListener('fb:log', listener)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
