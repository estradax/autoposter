import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'

export function registerAutoUpdater(): void {
  // Only enable auto-updates in production
  if (is.dev) {
    return
  }

  // Basic configuration
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates every hour (optional, but good for long-running apps)
  // For now, we'll just check on startup as requested
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('Failed to check for updates:', err.message)
  })

  // Event listeners
  autoUpdater.on('update-available', () => {
    console.log('Update available.')
  })

  autoUpdater.on('update-not-available', () => {
    console.log('Update not available.')
  })

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater: ', err)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
    console.log(log_message)
  })

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded; will install now')
    // As per user request: "quit install and update once downloaded"
    autoUpdater.quitAndInstall()
  })
}
