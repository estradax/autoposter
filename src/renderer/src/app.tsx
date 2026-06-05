import { useEffect, useState, useRef } from 'react'

interface LogMessage {
  time: string
  text: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Checking requirements...')
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogMessage[]>([
    {
      time: new Date().toLocaleTimeString(),
      text: 'System initialized. Ready for automation.',
      type: 'info'
    }
  ])
  const logsEndRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const addLog = (text: string, type: LogMessage['type'] = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        text,
        type
      }
    ])
  }

  const runTestAutomation = async () => {
    if (isRunning) return
    setIsRunning(true)
    addLog('Starting test automation sequence...', 'info')
    
    // Simulate some automation logs to demonstrate integration
    setTimeout(() => {
      addLog('Launching Chromium instance...', 'info')
    }, 1000)

    setTimeout(() => {
      addLog('Chromium launched successfully. Process ID: ' + Math.floor(Math.random() * 9000 + 1000), 'success')
    }, 2500)

    setTimeout(() => {
      addLog('Navigating to target URL: https://example.com', 'info')
    }, 4000)

    setTimeout(() => {
      addLog('Page loaded. Running custom content selectors...', 'info')
    }, 5500)

    setTimeout(() => {
      addLog('Automation step completed successfully.', 'success')
      addLog('Closing Chromium instance...', 'info')
      setIsRunning(false)
    }, 7000)
  }

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
    <div className="min-h-screen bg-base-200 flex flex-col p-6">
      {/* Header */}
      <header className="navbar bg-base-100 shadow-md rounded-2xl mb-6 px-6 border border-base-content/5 justify-between">
        <div className="flex gap-2 items-center">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-content font-bold text-lg shadow-lg">
            C
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Chromium Automation</h1>
            <p className="text-xs text-base-content/50">Integration Template</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="badge badge-success gap-1.5 py-3 px-4 font-semibold text-xs border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success-content animate-pulse"></span>
            Chromium Ready
          </div>
          <div className="badge badge-outline gap-1.5 py-3 px-4 font-semibold text-xs border border-base-content/10">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            SQLite Connected
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Control Panel */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="card bg-base-100 shadow-lg border border-base-content/5 flex-1">
            <div className="card-body">
              <h2 className="card-title text-base-content/80 text-lg mb-4">Automation Center</h2>
              
              <div className="flex flex-col gap-4">
                <div className="bg-base-200/50 p-4 rounded-xl border border-base-content/5">
                  <h3 className="font-semibold text-sm mb-1">Local Browser Info</h3>
                  <p className="text-xs text-base-content/60 leading-relaxed">
                    Chromium is fully integrated and managed via Puppeteer. Actions run inside an isolated sandbox with custom automation settings.
                  </p>
                </div>

                <div className="bg-base-200/50 p-4 rounded-xl border border-base-content/5">
                  <h3 className="font-semibold text-sm mb-2">Database Setup</h3>
                  <p className="text-xs text-base-content/60 leading-relaxed">
                    Drizzle ORM is active. Database migrations run automatically on startup. The schema configuration is ready for custom tables.
                  </p>
                </div>
              </div>

              <div className="card-actions mt-auto pt-6 flex flex-col gap-2">
                <button 
                  onClick={runTestAutomation}
                  disabled={isRunning}
                  className={`btn btn-primary w-full ${isRunning ? 'loading btn-disabled' : ''}`}
                >
                  {isRunning ? 'Running Script...' : 'Run Test Automation'}
                </button>
                
                <button 
                  onClick={() => setLogs([])}
                  className="btn btn-outline btn-sm w-full mt-2"
                >
                  Clear Console Logs
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Output Log Console */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="card bg-base-300 shadow-inner border border-base-content/10 flex-1 flex flex-col overflow-hidden">
            <div className="bg-neutral px-6 py-3 border-b border-base-content/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-error inline-block"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-warning inline-block"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-success inline-block"></span>
              </div>
              <span className="text-xs font-mono text-neutral-content/60">terminal-output.log</span>
            </div>

            <div className="p-6 font-mono text-xs flex-1 overflow-y-auto space-y-2.5 bg-neutral text-neutral-content leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-neutral-content/40 italic">No output logs. Click 'Run Test Automation' to start.</div>
              ) : (
                logs.map((log, index) => {
                  let colorClass = 'text-info-content'
                  if (log.type === 'success') colorClass = 'text-success'
                  if (log.type === 'warning') colorClass = 'text-warning'
                  if (log.type === 'error') colorClass = 'text-error animate-pulse'

                  return (
                    <div key={index} className="flex gap-3 hover:bg-neutral-content/5 p-1 rounded transition-colors duration-150">
                      <span className="text-neutral-content/30 select-none">[{log.time}]</span>
                      <span className={colorClass}>{log.text}</span>
                    </div>
                  )
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer footer-center p-4 bg-base-100 text-base-content/50 rounded-xl mt-6 border border-base-content/5 text-xs">
        <aside>
          <p>Chromium Automation Template © {new Date().getFullYear()} — Electron & Drizzle Integration Ready</p>
        </aside>
      </footer>
    </div>
  )
}
