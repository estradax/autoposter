export type Search = {
  id: number
  title: string
  query: string
  createdAt: Date | null
  updatedAt: Date | null
}

export type CreateSearchInput = Pick<Search, 'title' | 'query'>
export type UpdateSearchInput = Partial<CreateSearchInput>

export type SearchResult = {
  id: number
  searchId: number | null
  title: string
  address: string
  rating: number | null
  reviews: number | null
  phone: string | null
  website: string | null
  price: string | null
  latitude: number | null
  longitude: number | null
  placeId: string | null
  openingHours: string | null
  plusCode: string | null
  type: string | null
  url: string | null
  createdAt: Date | null
}

export type CreateSearchResultInput = Omit<SearchResult, 'id' | 'createdAt'>

export type MapSearchResult = {
  title: string
  address: string
  rating?: number | undefined
  reviews?: number | undefined
  phone?: string | undefined
  website?: string | undefined
  price?: string | undefined
  gps_coordinates?:
    | {
        latitude: number
        longitude: number
      }
    | undefined
  place_id?: string | undefined
  opening_hours?: string[] | undefined
  plus_code?: string | undefined
  type?: string | undefined
  url?: string | undefined
}

export type SearchOptions = {
  maxScrolls?: number
}
