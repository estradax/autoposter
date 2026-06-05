import React, { useEffect, useState } from 'react'

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-base-200 to-base-300 gap-6 p-8">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-black tracking-tighter text-primary">Chromium Auto</h1>
          <p className="text-base-content/60 text-sm font-medium uppercase tracking-widest">
            Initialization
          </p>
        </div>

        <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-content/5 p-8 transition-all duration-500">
          <div className="flex justify-between items-end mb-3">
            <p className="font-semibold text-lg">{status}</p>
            <p className="text-sm font-bold text-primary">{progress}%</p>
          </div>
          <div className="w-full h-3 bg-base-200 rounded-full shadow-inner overflow-hidden border border-base-content/5">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="mt-6 flex gap-2 items-center text-xs text-base-content/40 bg-base-200/50 p-3 rounded-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>This is a one-time setup to download the local Chromium bundle.</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-300 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-2xl border border-base-content/5">
        <div className="card-body p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-content font-black text-xl shadow-md">
              AP
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Autopost Portal</h1>
              <p className="text-xs text-base-content/50">Automation Dashboard</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="btn btn-outline hover:btn-primary flex items-center gap-2 py-4 h-auto font-semibold transition-all duration-200 rounded-xl justify-center">
              <svg
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>FB Autopost</span>
            </button>

            <button className="btn btn-outline hover:btn-primary flex items-center gap-2 py-4 h-auto font-semibold transition-all duration-200 rounded-xl justify-center">
              <svg
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X Autopost</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
