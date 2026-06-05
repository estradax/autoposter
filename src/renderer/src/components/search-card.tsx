import { useState, useRef, useEffect } from 'react'
import { Calendar, Search as SearchIcon, ExternalLink, Download, Trash2 } from 'lucide-react'
import { Search } from '@shared/types'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type SearchCardProps = {
  search: Search
}

export function SearchCard({ search }: SearchCardProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(search.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const date = search.createdAt ? new Date(search.createdAt) : new Date()
  const isNew = new Date().getTime() - date.getTime() <= 3600000
  const formattedDate = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const updateMutation = useMutation({
    mutationFn: (newTitle: string) => window.api.search.update(search.id, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches'] })
      setIsEditing(false)
    },
    onError: () => {
      setEditValue(search.title)
      setIsEditing(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => window.api.search.delete(search.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches'] })
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
    if (trimmedValue && trimmedValue !== search.title) {
      updateMutation.mutate(trimmedValue)
    } else {
      setEditValue(search.title)
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setEditValue(search.title)
      setIsEditing(false)
    }
  }

  return (
    <Link
      to={`/search/${search.id}`}
      className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
    >
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex items-center gap-1 w-full" onClick={(e) => e.preventDefault()}>
                  <input
                    ref={inputRef}
                    type="text"
                    className="input input-ghost input-xs font-bold text-base grow focus:outline-none focus:bg-base-200 border-base-content/20"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    disabled={updateMutation.isPending}
                  />
                  {updateMutation.isPending && (
                    <span className="loading loading-spinner loading-xs text-primary"></span>
                  )}
                </div>
              ) : (
                <h3
                  className="card-title text-base font-bold group-hover:text-primary transition-all truncate border border-transparent hover:border-base-content/20 hover:bg-base-200/50 px-1 -ml-1 hover:ml-0 rounded cursor-text"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setEditValue(search.title)
                    setIsEditing(true)
                  }}
                  title="Click to rename"
                >
                  {search.title}
                </h3>
              )}
              {!isEditing && isNew && (
                <span className="badge badge-secondary badge-sm font-bold">NEW</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-base-content/60">
              <SearchIcon size={12} className="min-w-[12px]" />
              <span className="truncate">{search.query}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="btn btn-ghost btn-xs btn-square text-primary hover:bg-primary/20"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.api.export.excel(search)
              }}
              title="Export to Excel"
            >
              <Download size={14} />
            </button>
            <button
              className="btn btn-ghost btn-xs btn-square text-error hover:bg-error/20"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (window.confirm('Are you sure you want to delete this search?')) {
                  deleteMutation.mutate()
                }
              }}
              title="Delete search"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <span className="loading loading-spinner loading-[10px]"></span>
              ) : (
                <Trash2 size={14} />
              )}
            </button>
            <ExternalLink size={14} className="text-base-content/30 ml-1" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-4 text-[10px] font-medium uppercase tracking-wider text-base-content/40">
          <Calendar size={10} />
          {formattedDate}
        </div>
      </div>
    </Link>
  )
}
