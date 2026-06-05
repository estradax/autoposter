import React from 'react'
import { useNavigate } from 'react-router'

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-base-200 to-base-300 p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-content font-black text-xl shadow-md">
            AP
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Autopost Portal</h1>
            <p className="text-xs text-base-content/50">Automation Dashboard</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={(): void => {
              navigate('/fb-config')
            }}
            className="btn btn-outline hover:btn-primary flex items-center gap-2 py-4 h-auto font-semibold transition-all duration-200 rounded-xl justify-center"
          >
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
  )
}
