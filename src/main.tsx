import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Init dark mode from persisted store BEFORE first render — avoids flash
try {
  const stored = JSON.parse(localStorage.getItem('safeloop-store') || '{}')
  if (stored?.state?.isDark) {
    document.documentElement.classList.add('dark')
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
