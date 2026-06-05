import { ipcMain } from 'electron'
import {
  getSearches,
  createSearch,
  getSearchById,
  updateSearch,
  deleteSearch
} from './controller/search'
import { createSearchResultBulk, getSearchResults } from './controller/search-result'
import { ExcelExporter } from './controller/export'
import {
  CreateSearchInput,
  CreateSearchResultInput,
  Search,
  UpdateSearchInput
} from '@shared/types'

export function registerSearchHandler(): void {
  ipcMain.handle('search:get-all', async () => {
    return await getSearches()
  })

  ipcMain.handle('search:create', async (_, data: CreateSearchInput) => {
    return await createSearch(data)
  })

  ipcMain.handle('search:get', async (_, id: number) => {
    return await getSearchById(id)
  })

  ipcMain.handle('search:update', async (_, id: number, data: UpdateSearchInput) => {
    return await updateSearch(id, data)
  })

  ipcMain.handle('search:delete', async (_, id: number) => {
    return await deleteSearch(id)
  })
}

export function registerSearchResultHandler(): void {
  ipcMain.handle('search-result:create-bulk', async (_, results: CreateSearchResultInput[]) => {
    return await createSearchResultBulk(results)
  })

  ipcMain.handle('search-result:get-all', async (_, params?: { search_id?: number }) => {
    return await getSearchResults(params)
  })
}

export function registerExportHandler(): void {
  ipcMain.handle('export:excel', async (_, search: Search) => {
    return await new ExcelExporter().export(search)
  })
}
