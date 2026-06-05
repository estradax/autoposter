import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import { Search } from '@renderer/routes/search'
import { SearchDetail } from '@renderer/routes/search-detail'

export function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Checking requirements...')

  useEffect(() => {
    const checkBrowser = async (): Promise<void> => {
      const installed = await window.api.browser.check()
      if (installed) {
        setIsReady(true)
      } else {
        setStatus('Downloading Chromium...')
        window.api.browser.onDownloadProgress((p) => setProgress(p))
        try {
          await window.api.browser.download()
          setIsReady(true)
        } catch (error) {
          setStatus('Failed to download Chromium. Please check your internet connection.')
          console.error(error)
        }
      }
    }

    checkBrowser()
  }, [])

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-base-200 to-base-300 gap-6 p-8">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-black tracking-tighter text-primary">MapLeads</h1>
          <p className="text-base-content/60 text-sm font-medium uppercase tracking-widest">
            Initialization
          </p>
        </div>

        <div className="bg-base-100 p-8 rounded-3xl shadow-sm w-full max-w-md border border-base-content/5 transition-all duration-500">
          <div className="flex justify-between items-end mb-3">
            <p className="font-semibold text-lg">{status}</p>
            <p className="text-sm font-bold text-primary">{progress}%</p>
          </div>
          <div className="w-full h-3 bg-base-200 rounded-full shadow-inner overflow-hidden border border-base-content/5">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--p),0.3)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="mt-6 flex gap-2 items-center text-xs text-base-content/40 bg-base-200/50 p-3 rounded-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="Wait, I'll use a lucide icon if available, but for now just simple SVG"
              />
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>This is a one-time setup for the search engine components.</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Search />} />
      <Route path="/search/:id" element={<SearchDetail />} />
    </Routes>
  )
}
