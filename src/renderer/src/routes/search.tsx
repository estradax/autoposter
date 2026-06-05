import { useState } from 'react'
import { SearchInput } from '@renderer/components/search-input'
import { SearchOverlay } from '@renderer/components/search-overlay'
import { useQuery, useMutation } from '@tanstack/react-query'
import { SearchCard } from '@renderer/components/search-card'

export function Search(): React.JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const [maxScroll, setMaxScroll] = useState(5)
  const searchesQuery = useQuery({
    queryKey: ['searches'],
    queryFn: () => window.api.search.getAll()
  })

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      await window.api.mapsEngine.init()
      try {
        const results = await window.api.mapsEngine.search(query, { maxScroll })
        const search = await window.api.search.create({ title: query, query })
        await window.api.searchResult.createBulk(
          results.map((result) => ({
            searchId: search[0].id,
            title: result.title,
            address: result.address,
            rating: result.rating ?? null,
            reviews: result.reviews ?? null,
            phone: result.phone ?? null,
            website: result.website ?? null,
            price: result.price ?? null,
            latitude: result.gps_coordinates?.latitude ?? null,
            longitude: result.gps_coordinates?.longitude ?? null,
            placeId: result.place_id ?? null,
            openingHours: result.opening_hours ? JSON.stringify(result.opening_hours) : null,
            plusCode: result.plus_code ?? null,
            type: result.type ?? null,
            url: result.url ?? null
          }))
        )
      } finally {
        await window.api.mapsEngine.close()
      }
    },
    onSuccess: () => {
      setInputValue('')
      searchesQuery.refetch()
    }
  })

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center pt-20 p-4">
      <div className="text-center w-full max-w-3xl px-4">
        <h1 className="text-5xl font-bold mb-8 text-primary">MapsLeads</h1>
        <SearchInput
          value={inputValue}
          onChange={setInputValue}
          onSearch={() => searchMutation.mutate(inputValue)}
        />
        <div className="flex items-center gap-3 mt-4">
          <div className="form-control w-fit">
            <select
              className="select select-sm select-bordered focus:outline-none"
              value={maxScroll}
              onChange={(e) => setMaxScroll(Number(e.target.value))}
            >
              <option value={5}>Small</option>
              <option value={10}>Medium</option>
              <option value={15}>Deep</option>
            </select>
          </div>
          {maxScroll > 5 && (
            <span className="text-xs text-base-content/60 italic animate-pulse">
              {maxScroll === 10
                ? 'Searching deeper takes a bit more time...'
                : 'A thorough search will take some extra time to find more leads.'}
            </span>
          )}
        </div>

        {searchMutation.isError && (
          <div role="alert" className="alert alert-error shadow-lg mt-8 text-left">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold">Search Failed</h3>
              <div className="text-xs">
                {(searchMutation.error as Error)?.message || 'An unexpected error occurred.'}
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => searchMutation.reset()}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      {searchesQuery.data && searchesQuery.data.length > 0 && (
        <div className="w-full max-w-6xl mt-16">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-xl font-semibold opacity-70">History</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchesQuery.data.map((search) => (
              <SearchCard key={search.id} search={search} />
            ))}
          </div>
        </div>
      )}

      <SearchOverlay visible={searchMutation.isPending} />
    </div>
  )
}
