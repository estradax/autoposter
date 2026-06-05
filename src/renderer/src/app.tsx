import React from 'react'
import { HashRouter, Routes, Route } from 'react-router'
import { BrowserCheckWrapper } from './components/BrowserCheckWrapper'
import { Dashboard } from './components/Dashboard'
import { FbConfig } from './components/FbConfig'
import { FbLogs } from './components/FbLogs'

export function App(): React.JSX.Element {
  return (
    <BrowserCheckWrapper>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fb-config" element={<FbConfig />} />
          <Route path="/fb-logs" element={<FbLogs />} />
        </Routes>
      </HashRouter>
    </BrowserCheckWrapper>
  )
}
