import { ElectronAPI } from '@electron-toolkit/preload'
import { MapSearchResult, SearchOptions } from '@main/engine/maps-engine'
import {
  Search,
  CreateSearchInput,
  CreateSearchResultInput,
  SearchResult,
  UpdateSearchInput
} from '@shared/types'

type MapsEngineAPI = {
  init: () => Promise<void>
  close: () => Promise<void>
  search: (query: string, options?: SearchOptions) => Promise<MapSearchResult[]>
}

type SearchAPI = {
  getAll: () => Promise<Search[]>
  create: (data: CreateSearchInput) => Promise<Search[]>
  get: (id: number) => Promise<Search | undefined>
  update: (id: number, data: UpdateSearchInput) => Promise<Search[]>
  delete: (id: number) => Promise<Search[]>
}

type SearchResultAPI = {
  createBulk: (results: CreateSearchResultInput[]) => Promise<SearchResult[]>
  getAll: (params?: { search_id?: number }) => Promise<SearchResult[]>
}

type ExportAPI = {
  excel: (search: Search) => Promise<void>
}

type BrowserAPI = {
  check: () => Promise<boolean>
  download: () => Promise<string>
  onDownloadProgress: (callback: (percent: number) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      mapsEngine: MapsEngineAPI
      search: SearchAPI
      searchResult: SearchResultAPI
      export: ExportAPI
      browser: BrowserAPI
    }
  }
}
