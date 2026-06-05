import { ElectronAPI } from '@electron-toolkit/preload'

type BrowserAPI = {
  check: () => Promise<boolean>
  download: () => Promise<string>
  onDownloadProgress: (callback: (percent: number) => void) => void
}

type BotSettings = {
  cookies: string
  localStorage: string
  postContent: string
  mediaFilePaths: string
}

type XBotSettings = {
  cookies: string
  localStorage: string
  postContent: string
  searchQuery: string
  mediaFilePaths: string
}

type XAPI = {
  saveSettings: (settings: XBotSettings) => Promise<void>
  getSettings: () => Promise<XBotSettings | null>
  start: () => Promise<void>
  stop: () => Promise<void>
  onLog: (callback: (log: string) => void) => () => void
}

type FbAPI = {
  saveSettings: (settings: BotSettings) => Promise<void>
  getSettings: () => Promise<BotSettings | null>
  getFileData: (path: string) => Promise<string>
  start: () => Promise<void>
  stop: () => Promise<void>
  getPathForFile: (file: File) => string
  onLog: (callback: (log: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      browser: BrowserAPI
      fb: FbAPI
      x: XAPI
    }
  }
}
