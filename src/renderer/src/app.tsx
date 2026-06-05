import React from 'react'
import { HashRouter, Routes, Route } from 'react-router'
import { BrowserCheckWrapper } from './components/BrowserCheckWrapper'
import { Dashboard } from './components/Dashboard'
import { FbConfig } from './components/FbConfig'
import { FbLogs } from './components/FbLogs'
import { XConfig } from './components/XConfig'
import { XLogs } from './components/XLogs'

export function App(): React.JSX.Element {
  return (
    <BrowserCheckWrapper>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fb-config" element={<FbConfig />} />
          <Route path="/fb-logs" element={<FbLogs />} />
          <Route path="/x-config" element={<XConfig />} />
          <Route path="/x-logs" element={<XLogs />} />
        </Routes>
      </HashRouter>
    </BrowserCheckWrapper>
  )
}
