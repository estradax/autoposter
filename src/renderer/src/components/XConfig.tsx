import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

interface MediaFileDetail {
  name: string
  path: string
}

function MediaPreview({
  file,
  onRemove
}: {
  file: MediaFileDetail
  onRemove: () => void
}): React.JSX.Element {
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [error, setError] = useState<boolean>(false)
  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(file.path)

  useEffect(() => {
    let active = true
    window.api.fb
      .getFileData(file.path)
      .then((data) => {
        if (active) {
          if (data) {
            setPreviewUrl(data)
          } else {
            setError(true)
          }
        }
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [file.path])

  return (
    <div className="relative group aspect-square rounded-xl overflow-hidden bg-base-200 border border-base-content/10 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] flex items-center justify-center">
      {error ? (
        <div className="flex flex-col items-center justify-center p-2 text-center gap-1 w-full h-full text-error">
          <span className="text-lg">⚠️</span>
          <p className="text-[10px] truncate max-w-full font-medium">{file.name}</p>
        </div>
      ) : previewUrl ? (
        isVideo ? (
          <video src={previewUrl} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <img src={previewUrl} className="w-full h-full object-cover" alt={file.name} />
        )
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <span className="loading loading-spinner loading-xs text-primary"></span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="btn btn-circle btn-xs btn-error text-white font-bold min-h-0 h-6 w-6 border-none shadow-md hover:scale-110"
          >
            ✕
          </button>
        </div>
        <p className="text-[10px] text-white truncate font-medium bg-black/60 px-1.5 py-0.5 rounded">
          {file.name}
        </p>
      </div>
    </div>
  )
}

export function XConfig(): React.JSX.Element {
  const navigate = useNavigate()

  // X settings state
  const [cookies, setCookies] = useState('')
  const [localStorageText, setLocalStorageText] = useState('')
  const [postContent, setPostContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<MediaFileDetail[]>([])

  useEffect(() => {
    // Load config on mount
    window.api.x.getSettings().then((settings) => {
      if (settings) {
        setCookies(settings.cookies)
        setLocalStorageText(settings.localStorage)
        setPostContent(settings.postContent)
        setSearchQuery(settings.searchQuery)
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
        .map((f: File) => {
          let path = ''
          try {
            path = window.api.fb.getPathForFile(f)
          } catch (err) {
            console.error('Failed to get path for file:', err)
          }
          return {
            name: f.name,
            path
          }
        })
        .filter((f) => f.path !== '')

      setSelectedFiles((prev) => {
        const existingPaths = new Set(prev.map((item) => item.path))
        const newItems = details.filter((item) => !existingPaths.has(item.path))
        return [...prev, ...newItems]
      })
    }
  }

  const saveSettings = async (): Promise<void> => {
    try {
      const filePathsString = JSON.stringify(selectedFiles.map((f) => f.path))
      await window.api.x.saveSettings({
        cookies,
        localStorage: localStorageText,
        postContent,
        searchQuery,
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
    await window.api.x.saveSettings({
      cookies,
      localStorage: localStorageText,
      postContent,
      searchQuery,
      mediaFilePaths: filePathsString
    })

    // Navigate to terminal and trigger autoStart
    navigate('/x-logs', { state: { autoStart: true } })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-base-200 to-base-300 p-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="flex items-center gap-3 pb-4 border-b border-base-content/10">
          <button
            onClick={(): void => {
              navigate('/')
            }}
            className="btn btn-sm btn-circle btn-ghost"
          >
            ❮
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">X Autopost Settings</h1>
            <p className="text-xs text-base-content/50 mt-0.5">
              Configure X/Twitter automation credentials, search query, and reply template
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-base-content/85">
              cookie.txt Raw Text
            </label>
            <textarea
              className="textarea textarea-bordered font-mono text-xs h-24 focus:textarea-primary transition-all duration-200"
              placeholder="Paste contents of cookie.txt here (Tab separated Netscape format)"
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-base-content/85">
              localstorage.txt Raw Text
            </label>
            <textarea
              className="textarea textarea-bordered font-mono text-xs h-24 focus:textarea-primary transition-all duration-200"
              placeholder="Paste contents of localstorage.txt here (Tab separated key-value format)"
              value={localStorageText}
              onChange={(e) => setLocalStorageText(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-base-content/85">Search Query</label>
            <input
              type="text"
              className="input input-bordered focus:input-primary transition-all duration-200"
              placeholder="Search term/hashtag to find tweets to reply to (e.g. #marketing or marketing tips)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-base-content/85">
              Reply Template Content
            </label>
            <textarea
              className="textarea textarea-bordered h-20 focus:textarea-primary transition-all duration-200"
              placeholder="Type the reply template (a random suffix number will be added to ensure uniqueness)..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-base-content/85">
              Upload Images/Videos (Multiple)
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-base-content/20 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
                <div className="flex flex-col items-center justify-center pt-4 pb-4 text-center px-4">
                  <svg
                    className="w-8 h-8 mb-2 text-base-content/40"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="text-xs text-base-content/70">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and
                    drop
                  </p>
                  <p className="text-[10px] text-base-content/40 mt-0.5">Images & Videos</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs font-semibold text-base-content/70">
                  Selected Assets ({selectedFiles.length})
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-56 overflow-y-auto p-2 bg-base-200/50 rounded-xl border border-base-content/5">
                  {selectedFiles.map((file, index) => (
                    <MediaPreview
                      key={index}
                      file={file}
                      onRemove={(): void => {
                        setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-6">
            <button
              className="btn btn-outline flex-1 rounded-xl transition-all duration-200"
              onClick={saveSettings}
            >
              Save Settings
            </button>
            <button
              className="btn btn-primary flex-1 text-white rounded-xl transition-all duration-200"
              onClick={startAutopost}
            >
              Save & Launch Bot
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
