import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'

export function FbLogs(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const autoStart = (location.state as { autoStart?: boolean } | null)?.autoStart ?? false

  const [isRunning, setIsRunning] = useState(false)
  const [latestLog, setLatestLog] = useState('Initializing automation...')

  useEffect(() => {
    if (!autoStart) {
      navigate('/fb-config')
      return
    }

    const cleanup = window.api.fb.onLog((log) => {
      const cleanLog = log.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')
      setLatestLog(cleanLog)
    })

    const triggerRun = async (): Promise<void> => {
      setIsRunning(true)
      try {
        await window.api.fb.start()
        alert('Automation completed successfully!')
      } catch (err: unknown) {
        const error = err as Error
        if (error.message.includes('Stop requested') || error.message.includes('closed')) {
          alert('Automation stopped by user.')
        } else {
          alert(`Automation error: ${error.message}`)
        }
      } finally {
        setIsRunning(false)
        navigate('/fb-config')
      }
    }

    triggerRun()

    return cleanup
  }, [autoStart, navigate])

  const handleCancel = async (): Promise<void> => {
    setLatestLog('Requesting stop...')
    try {
      await window.api.fb.stop()
    } catch (err: unknown) {
      console.error('Error stopping bot:', err)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-base-300 to-base-200 p-8 text-center">
      <div className="flex flex-col items-center max-w-md w-full gap-8">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          <span className="loading loading-spinner w-12 h-12 text-primary z-10"></span>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight text-base-content">
            {isRunning ? 'Autopost Bot is Running' : 'Preparing Bot'}
          </h2>
          <p className="text-sm text-base-content/60 font-medium min-h-[3rem] flex items-center justify-center px-4 py-2 bg-base-100 rounded-2xl shadow-sm border border-base-content/5 animate-pulse transition-all duration-300">
            {latestLog}
          </p>
        </div>

        <button
          onClick={handleCancel}
          className="btn btn-error btn-outline btn-wide rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mt-4"
        >
          Cancel Automation
        </button>
      </div>
    </div>
  )
}
