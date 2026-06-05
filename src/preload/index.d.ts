import { ElectronAPI } from '@electron-toolkit/preload'

type BrowserAPI = {
  check: () => Promise<boolean>
  download: () => Promise<string>
  onDownloadProgress: (callback: (percent: number) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      browser: BrowserAPI
    }
  }
}
