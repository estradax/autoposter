import { app, ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import {
  install,
  Browser,
  detectBrowserPlatform,
  getInstalledBrowsers,
  InstalledBrowser
} from '@puppeteer/browsers'

const BUILD_ID = '147.0.7727.56'
const BROWSER = Browser.CHROME

export class BrowserManager {
  private static get cacheDir(): string {
    return path.join(app.getPath('userData'), 'chromium')
  }

  static async getExecutablePath(): Promise<string | undefined> {
    const dir = this.cacheDir
    try {
      const installed = await getInstalledBrowsers({ cacheDir: dir })
      const browser = installed.find(
        (b: InstalledBrowser) => b.browser === BROWSER && b.buildId === BUILD_ID
      )
      return browser?.executablePath
    } catch (error) {
      console.error('Error checking installed browsers:', error)
      return undefined
    }
  }

  static async isInstalled(): Promise<boolean> {
    const exePath = await this.getExecutablePath()
    return !!exePath && fs.existsSync(exePath)
  }

  static async install(onProgress?: (percent: number) => void): Promise<string> {
    const dir = this.cacheDir
    const platform = detectBrowserPlatform()
    if (!platform) throw new Error('Could not detect browser platform')

    // Explicitly create cache directory
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    let lastPercent = 0
    const installedBrowser = await install({
      browser: BROWSER,
      buildId: BUILD_ID,
      cacheDir: dir,
      platform: platform,
      unpack: true,
      downloadProgressCallback: (downloadedBytes, totalBytes) => {
        if (onProgress) {
          const percent = Math.round((downloadedBytes / totalBytes) * 100)
          if (percent > lastPercent) {
            lastPercent = percent
            onProgress(percent)
          }
        }
      }
    })

    return installedBrowser.executablePath
  }

  static registerHandlers(): void {
    ipcMain.handle('browser:check', async () => {
      return await this.isInstalled()
    })

    ipcMain.handle('browser:download', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      return await this.install((percent) => {
        if (window && !window.isDestroyed()) {
          window.webContents.send('browser:download-progress', percent)
        }
      })
    })
  }
}
