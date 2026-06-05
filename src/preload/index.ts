import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  CreateSearchInput,
  CreateSearchResultInput,
  MapSearchResult,
  Search,
  SearchOptions,
  SearchResult,
  UpdateSearchInput
} from '@shared/types'

// Custom APIs for renderer
const api = {
  mapsEngine: {
    init: (): Promise<void> => ipcRenderer.invoke('maps-engine:init'),
    close: (): Promise<void> => ipcRenderer.invoke('maps-engine:close'),
    search: (query: string, options?: SearchOptions): Promise<MapSearchResult[]> =>
      ipcRenderer.invoke('maps-engine:search', query, options)
  },
  search: {
    getAll: (): Promise<Search[]> => ipcRenderer.invoke('search:get-all'),
    create: (data: CreateSearchInput): Promise<Search[]> =>
      ipcRenderer.invoke('search:create', data),
    get: (id: number): Promise<Search | undefined> => ipcRenderer.invoke('search:get', id),
    update: (id: number, data: UpdateSearchInput): Promise<Search[]> =>
      ipcRenderer.invoke('search:update', id, data),
    delete: (id: number): Promise<Search[]> => ipcRenderer.invoke('search:delete', id)
  },
  searchResult: {
    createBulk: (results: CreateSearchResultInput[]): Promise<SearchResult[]> =>
      ipcRenderer.invoke('search-result:create-bulk', results),
    getAll: (params?: { search_id?: number }): Promise<SearchResult[]> =>
      ipcRenderer.invoke('search-result:get-all', params)
  },
  export: {
    excel: (search: Search): Promise<void> => ipcRenderer.invoke('export:excel', search)
  },
  browser: {
    check: (): Promise<boolean> => ipcRenderer.invoke('browser:check'),
    download: (): Promise<string> => ipcRenderer.invoke('browser:download'),
    onDownloadProgress: (callback: (percent: number) => void): void => {
      const listener = (_event: any, percent: number) => callback(percent)
      ipcRenderer.on('browser:download-progress', listener)
      // Cleanup might be needed if this is called multiple times, 
      // but for app startup it's usually fine once.
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
