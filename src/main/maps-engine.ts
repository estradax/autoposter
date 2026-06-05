import { ipcMain } from 'electron'
import { PuppeteerMapsEngine } from './engine/puppeteer-maps-engine'
import { SearchOptions } from '@shared/types'

export function registerMapsEngineHandler(): void {
  const mapsEngine = new PuppeteerMapsEngine()

  ipcMain.handle('maps-engine:init', async () => {
    return await mapsEngine.init()
  })

  ipcMain.handle('maps-engine:close', async () => {
    return await mapsEngine.close()
  })

  ipcMain.handle('maps-engine:search', async (_, query: string, options?: SearchOptions) => {
    return await mapsEngine.search(query, options)
  })
}
