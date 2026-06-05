import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

interface MediaFileDetail {
  name: string
  path: string
}

export function FbConfig(): React.JSX.Element {
  const navigate = useNavigate()

  // FB settings state
  const [cookies, setCookies] = useState('')
  const [localStorageText, setLocalStorageText] = useState('')
  const [postContent, setPostContent] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<MediaFileDetail[]>([])

  useEffect(() => {
    // Load config on mount
    window.api.fb.getSettings().then((settings) => {
      if (settings) {
        setCookies(settings.cookies)
        setLocalStorageText(settings.localStorage)
        setPostContent(settings.postContent)
        try {
          const paths: string[] = JSON.parse(settings.mediaFilePaths || '[]')
          const fileDetails = paths.map((p) => ({
            name: p.split(/[\\/]/).pop() || p,
            path: p
          }))
          setSelectedFiles(fileDetails)
        } catch {
          setSelectedFiles([])
        }
      }
    })
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      const details = Array.from(e.target.files)
        .map((f: File) => ({
          name: f.name,
          path: (f as File & { path?: string }).path || ''
        }))
        .filter((f) => f.path !== '')

      setSelectedFiles(details)
    }
  }

  const saveSettings = async (): Promise<void> => {
    try {
      const filePathsString = JSON.stringify(selectedFiles.map((f) => f.path))
      await window.api.fb.saveSettings({
        cookies,
        localStorage: localStorageText,
        postContent,
        mediaFilePaths: filePathsString
      })
      alert('Settings saved successfully!')
    } catch (err: unknown) {
      const error = err as Error
      alert(`Error saving settings: ${error.message}`)
    }
  }

  const startAutopost = async (): Promise<void> => {
    // Automatically save settings first
    const filePathsString = JSON.stringify(selectedFiles.map((f) => f.path))
    await window.api.fb.saveSettings({
      cookies,
      localStorage: localStorageText,
      postContent,
      mediaFilePaths: filePathsString
    })

    // Navigate to terminal and trigger autoStart
    navigate('/fb-logs', { state: { autoStart: true } })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-300 p-6">
      <div className="card w-full max-w-2xl bg-base-100 shadow-2xl border border-base-content/5">
        <div className="card-body p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={(): void => {
                  navigate('/')
                }}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ❮
              </button>
              <h1 className="text-xl font-bold tracking-tight">FB Autopost Settings</h1>
            </div>
            <button
              className="btn btn-sm btn-outline btn-neutral"
              onClick={(): void => {
                navigate('/fb-logs')
              }}
            >
              View Logs
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">cookie.txt Raw Text</span>
              </label>
              <textarea
                className="textarea textarea-bordered font-mono text-xs h-24"
                placeholder="Paste contents of cookie.txt here (Tab separated Netscape format)"
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">localstorage.txt Raw Text</span>
              </label>
              <textarea
                className="textarea textarea-bordered font-mono text-xs h-24"
                placeholder="Paste contents of localstorage.txt here (Tab separated key-value format)"
                value={localStorageText}
                onChange={(e) => setLocalStorageText(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Post Content Text</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-20"
                placeholder="Type the post content you want the bot to publish..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Upload Images/Videos (Multiple)</span>
              </label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="file-input file-input-bordered file-input-primary w-full"
                onChange={handleFileChange}
              />
              {selectedFiles.length > 0 && (
                <div className="mt-2 text-xs text-base-content/60 bg-base-200/50 p-3 rounded-xl border border-base-content/5">
                  <p className="font-semibold mb-1">Selected Files:</p>
                  <ul className="list-disc pl-5 max-h-24 overflow-y-auto">
                    {selectedFiles.map((f, i) => (
                      <li key={i} className="truncate">
                        {f.name} <span className="text-gray-400">({f.path})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button className="btn btn-outline flex-1" onClick={saveSettings}>
                Save Settings
              </button>
              <button className="btn btn-primary flex-1 text-white" onClick={startAutopost}>
                Save & Launch Bot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
