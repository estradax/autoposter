import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Star,
  Phone,
  Globe,
  Calendar,
  Search,
  Download,
  Trash2,
  Edit3
} from 'lucide-react'

export function SearchDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const searchId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const searchQuery = useQuery({
    queryKey: ['search', searchId],
    queryFn: () => window.api.search.get(searchId),
    enabled: !!searchId
  })

  const resultsQuery = useQuery({
    queryKey: ['searchResults', searchId],
    queryFn: () => window.api.searchResult.getAll({ search_id: searchId }),
    enabled: !!searchId
  })

  const handleEditStart = (): void => {
    if (searchQuery.data) {
      setEditValue(searchQuery.data.title)
      setIsEditing(true)
    }
  }

  const updateMutation = useMutation({
    mutationFn: (newTitle: string) => window.api.search.update(searchId, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search', searchId] })
      queryClient.invalidateQueries({ queryKey: ['searches'] })
      setIsEditing(false)
    },
    onError: () => {
      if (searchQuery.data) setEditValue(searchQuery.data.title)
      setIsEditing(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => window.api.search.delete(searchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches'] })
      navigate('/')
    }
  })

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = (): void => {
    if (updateMutation.isPending) return

    const trimmedValue = editValue.trim()
    if (searchQuery.data && trimmedValue && trimmedValue !== searchQuery.data.title) {
      updateMutation.mutate(trimmedValue)
    } else {
      if (searchQuery.data) setEditValue(searchQuery.data.title)
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      if (searchQuery.data) setEditValue(searchQuery.data.title)
      setIsEditing(false)
    }
  }

  const isLoading = searchQuery.isLoading || resultsQuery.isLoading
  const search = searchQuery.data
  const results = resultsQuery.data || []

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold opacity-50">Search not found</h1>
        <Link to="/" className="btn btn-primary btn-sm">
          <ArrowLeft size={16} /> Go Back
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Link to="/" className="btn btn-ghost btn-sm gap-2 pl-0 hover:bg-transparent">
              <ArrowLeft size={16} /> Back to Search
            </Link>
            <div className="flex items-center gap-3 group">
              {isEditing ? (
                <div className="flex items-center gap-2 w-full max-w-2xl">
                  <input
                    ref={inputRef}
                    type="text"
                    className="input input-bordered input-lg text-4xl font-extrabold text-primary tracking-tight w-full bg-base-100 shadow-sm focus:outline-none h-auto py-2"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    disabled={updateMutation.isPending}
                  />
                  {updateMutation.isPending && (
                    <span className="loading loading-spinner loading-md text-primary"></span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1
                    className="text-4xl font-extrabold text-primary tracking-tight cursor-text hover:bg-base-300/50 px-2 -ml-2 rounded-lg transition-colors"
                    onClick={handleEditStart}
                    title="Click to rename"
                  >
                    {search.title}
                  </h1>
                  <button
                    className="btn btn-ghost btn-circle btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleEditStart}
                  >
                    <Edit3 size={18} className="text-base-content/40" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-base-content/60 mt-1">
              <span className="flex items-center gap-1.5">
                <Search size={14} /> {search.query}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />{' '}
                {search.createdAt ? new Date(search.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-error btn-outline gap-2 shadow-sm hover:shadow-error/20 transition-all active:scale-95"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this search?')) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Trash2 size={18} />
              )}
              Delete
            </button>
            <button
              className="btn btn-primary gap-2 shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
              onClick={() => window.api.export.excel(search)}
              disabled={results.length === 0}
            >
              <Download size={20} />
              Export to Excel
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="card bg-base-100 shadow-xl overflow-hidden border border-base-300">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-sm">
              <thead className="bg-base-300/50">
                <tr>
                  <th className="font-bold">Business Name</th>
                  <th className="font-bold min-w-[200px]">Contact</th>
                  <th className="font-bold">Address</th>
                  <th className="font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="hover:bg-primary/5 transition-colors group">
                    <td>
                      <div className="font-bold text-sm group-hover:text-primary transition-colors">
                        {result.title}
                      </div>
                      <div className="text-xs opacity-50 flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center text-warning font-bold">
                            <Star size={12} fill="currentColor" />
                            <span className="ml-1">{result.rating || 'N/A'}</span>
                          </div>
                          <span className="opacity-70">({result.reviews || 0})</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-col gap-1">
                        {result.phone && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone size={12} className="text-success" />
                            {result.phone}
                          </div>
                        )}
                        {result.website && (
                          <a
                            href={result.website}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs text-info hover:underline"
                          >
                            <Globe size={12} />
                            {result.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                          </a>
                        )}
                        {!result.phone && !result.website && (
                          <span className="text-xs opacity-30 italic">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-48">
                      <div
                        className="text-xs opacity-70 truncate group-hover:whitespace-normal group-hover:break-words transition-all"
                        title={result.address}
                      >
                        {result.address}
                      </div>
                    </td>
                    <td>
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-xs whitespace-nowrap"
                        >
                          Go to GMaps
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-20 opacity-30 italic font-medium">
                      No results found for this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
