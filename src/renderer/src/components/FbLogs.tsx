import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'

interface FbGroup {
  url: string
  name: string
}

export function FbLogs(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const autoStart = (location.state as { autoStart?: boolean } | null)?.autoStart ?? false

  const [isRunning, setIsRunning] = useState(false)
  const [latestLog, setLatestLog] = useState('Initializing automation...')

  // Selection states
  const [groups, setGroups] = useState<FbGroup[] | null>(null)
  const [selectedUrls, setSelectedUrls] = useState<Record<string, boolean>>({})
  const [isSelecting, setIsSelecting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!autoStart) {
      navigate('/fb-config')
      return
    }

    const cleanupLog = window.api.fb.onLog((log) => {
      const cleanLog = log.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')
      setLatestLog(cleanLog)
    })

    const cleanupGroups = window.api.fb.onGroupsLoaded((loadedGroups) => {
      setGroups(loadedGroups)
      // Check all by default
      const initialSelection: Record<string, boolean> = {}
      loadedGroups.forEach((g) => {
        initialSelection[g.url] = true
      })
      setSelectedUrls(initialSelection)
      setIsSelecting(true)
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

    return () => {
      cleanupLog()
      cleanupGroups()
    }
  }, [autoStart, navigate])

  const handleCancel = async (): Promise<void> => {
    setLatestLog('Requesting stop...')
    try {
      await window.api.fb.stop()
    } catch (err: unknown) {
      console.error('Error stopping bot:', err)
    }
  }

  const handleToggle = (url: string): void => {
    setSelectedUrls((prev) => ({
      ...prev,
      [url]: !prev[url]
    }))
  }

  const handleSelectAll = (): void => {
    const newSelection: Record<string, boolean> = {}
    groups?.forEach((g) => {
      newSelection[g.url] = true
    })
    setSelectedUrls(newSelection)
  }

  const handleDeselectAll = (): void => {
    const newSelection: Record<string, boolean> = {}
    groups?.forEach((g) => {
      newSelection[g.url] = false
    })
    setSelectedUrls(newSelection)
  }

  const handleStartPosting = async (): Promise<void> => {
    const urls = Object.keys(selectedUrls).filter((url) => selectedUrls[url])
    if (urls.length === 0) {
      alert('Please select at least one group to post to.')
      return
    }
    setIsSelecting(false)
    try {
      await window.api.fb.selectGroups(urls)
    } catch (err) {
      console.error('Error selecting groups:', err)
    }
  }

  if (isSelecting && groups) {
    const filteredGroups = groups.filter(
      (g) =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.url.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const selectedCount = Object.values(selectedUrls).filter(Boolean).length

    return (
      <div className="flex flex-col min-h-screen w-full bg-base-100 p-8 max-h-screen overflow-hidden">
        <div className="flex-1 flex flex-col gap-6 h-full max-h-full w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-content/10 pb-5">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-base-content flex items-center gap-2">
                <span>👥</span> Select Groups to Post
              </h2>
              <p className="text-xs text-base-content/60 font-medium mt-1">
                We found {groups.length} groups. Choose which ones you want to post to.
              </p>
            </div>

            {/* Action buttons in header to save space */}
            <div className="flex gap-3">
              <button onClick={handleCancel} className="btn btn-outline btn-error px-6 rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleStartPosting}
                className="btn btn-primary text-white px-8 rounded-xl shadow-lg shadow-primary/20"
                disabled={selectedCount === 0}
              >
                Start Posting ({selectedCount})
              </button>
            </div>
          </div>

          {/* Search bar and selection helpers */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="form-control w-full md:max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search groups by name..."
                  className="input input-bordered w-full pr-10 focus:input-primary text-sm rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-base-content/30 pointer-events-none">
                  🔍
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-between w-full md:w-auto text-xs">
              <span className="font-semibold text-base-content/70">
                Selected: <span className="text-primary font-bold">{selectedCount}</span> /{' '}
                {groups.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="btn btn-xs btn-outline btn-primary rounded-lg px-3 py-1"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="btn btn-xs btn-outline rounded-lg px-3 py-1"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* Group Checklist - Full width borderless list */}
          <div className="flex-1 overflow-y-auto border-t border-base-content/10 flex flex-col">
            {filteredGroups.length === 0 ? (
              <div className="p-12 text-center text-sm text-base-content/40 font-medium">
                No groups found matching "{searchTerm}"
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isChecked = !!selectedUrls[group.url]
                return (
                  <label
                    key={group.url}
                    className={`flex items-center gap-4 py-4 px-3 cursor-pointer hover:bg-base-200/40 border-b border-base-content/5 transition-all duration-150 ${
                      isChecked ? 'bg-primary/5' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(group.url)}
                      className="checkbox checkbox-primary checkbox-sm rounded-md"
                    />
                    <div className="flex flex-col flex-1 min-w-0 text-left">
                      <span className="text-sm font-bold text-base-content truncate">
                        {group.name}
                      </span>
                      <span className="text-xs text-base-content/45 truncate mt-0.5">
                        {group.url}
                      </span>
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
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
