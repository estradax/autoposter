import { useState, useEffect } from 'react'

const LOADING_MESSAGES = [
  'Finding the best leads for you...',
  'Sit back and relax while we do the work...',
  'Scraping maps data with excellence...',
  'Almost there, just a few more seconds...',
  'Gathering business details for you...',
  'Organizing results into a neat list...',
  'Did you know? Good data leads to better growth.'
]

type SearchOverlayProps = {
  visible: boolean
}

export function SearchOverlay({ visible }: SearchOverlayProps): React.JSX.Element | null {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (!visible) return

    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
        setIsTransitioning(false)
      }, 500)
    }, 4000)

    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-200/80 backdrop-blur-md transition-opacity duration-300">
      <div className="flex flex-col items-center gap-6 max-w-md px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary scale-150"></span>
          <div className="h-20 flex items-center justify-center">
            <p
              key={currentIndex}
              className={`text-xl font-medium text-base-content/80 ${
                isTransitioning ? 'animate-fade-out-up' : 'animate-fade-in-up'
              }`}
            >
              {LOADING_MESSAGES[currentIndex]}
            </p>
          </div>
        </div>

        <progress className="progress progress-primary w-64"></progress>
      </div>
    </div>
  )
}
