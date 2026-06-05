import { MapSearchResult, SearchOptions } from '@shared/types'

export type MapsEngine = {
  init(): Promise<void>
  close(): Promise<void>
  search(query: string, options?: SearchOptions): Promise<MapSearchResult[]>
}
