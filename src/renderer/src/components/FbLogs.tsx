import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'

export function FbLogs(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const autoStart = (location.state as { autoStart?: boolean } | null)?.autoStart ?? false

  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    const cleanup = window.api.fb.onLog((log) => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`])
    })

    const triggerRun = async (): Promise<void> => {
      setIsRunning(true)
      setLogs(['Initializing FB Autobot automation...'])
      try {
        await window.api.fb.start()
      } catch (err: unknown) {
        const error = err as Error
        setLogs((prev) => [...prev, `FATAL ERROR: ${error.message}`])
      } finally {
        setIsRunning(false)
      }
    }

    if (autoStart) {
      triggerRun()
    }

    return cleanup
  }, [autoStart])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-300 p-6">
      <div className="card w-full max-w-2xl bg-base-100 shadow-2xl border border-base-content/5">
        <div className="card-body p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={(): void => {
                  navigate('/fb-config')
                }}
                disabled={isRunning}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ❮
              </button>
              <h1 className="text-xl font-bold tracking-tight">Automation Terminal</h1>
            </div>
            <span className={`badge ${isRunning ? 'badge-primary animate-pulse' : 'badge-ghost'}`}>
              {isRunning ? 'Running' : 'Idle'}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="mockup-code h-80 overflow-y-auto bg-neutral text-neutral-content text-xs p-4 rounded-xl">
              {logs.length === 0 ? (
                <pre data-prefix=">">
                  <code>Terminal ready...</code>
                </pre>
              ) : (
                logs.map((log, index) => (
                  <pre key={index} data-prefix=">">
                    <code>{log}</code>
                  </pre>
                ))
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={isRunning}
                  onClick={(): void => setLogs([])}
                >
                  Clear Terminal
                </button>
                {isRunning && (
                  <button
                    className="btn btn-error btn-sm text-white"
                    onClick={async (): Promise<void> => {
                      setLogs((prev) => [
                        ...prev,
                        `[${new Date().toLocaleTimeString()}] Stopping automation...`
                      ])
                      try {
                        await window.api.fb.stop()
                      } catch (err: unknown) {
                        const error = err as Error
                        setLogs((prev) => [
                          ...prev,
                          `[${new Date().toLocaleTimeString()}] Error stopping: ${error.message}`
                        ])
                      }
                    }}
                  >
                    Stop Automation
                  </button>
                )}
              </div>
              {isRunning && (
                <div className="flex gap-2 items-center text-xs text-base-content/50">
                  <span>Executing Puppeteer Tasks</span>
                  <span className="loading loading-dots loading-xs text-primary"></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
