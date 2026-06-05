import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

const PLACEHOLDER_QUERIES = [
  'coffeeshop di bandung',
  'restoran sunda di jakarta',
  'hotel di surabaya',
  'tempat wisata di yogyakarta',
  'toko bangunan di bandung',
  'bar di semarang',
  'cafe di bandung'
]

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  onSearch?: () => void
}

export function SearchInput({ value, onChange, onSearch }: SearchInputProps): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PLACEHOLDER_QUERIES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    onSearch?.()
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label className="input input-bordered flex items-center gap-2 w-full shadow-sm bg-base-100 focus-within:border-primary focus-within:outline-none pr-1 relative">
        <div className="relative grow h-full flex items-center min-h-[3rem]">
          {value === '' && (
            <span
              key={currentIndex}
              className="absolute left-0 text-base-content/40 pointer-events-none animate-fade-in-up"
            >
              Try &apos;{PLACEHOLDER_QUERIES[currentIndex]}&apos;
            </span>
          )}
          <input
            type="text"
            className="grow h-full bg-transparent focus:outline-none z-10"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-ghost btn-circle btn-sm">
          <ArrowRight className="h-5 w-5 opacity-70" />
        </button>
      </label>
    </form>
  )
}
