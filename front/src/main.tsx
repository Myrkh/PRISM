import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { loadAppPreferences } from '@/core/models/appPreferences'

const bootPreferences = loadAppPreferences()
if (bootPreferences.theme === 'dark') {
  document.documentElement.classList.add('dark')
}

const rootElement = document.getElementById('root')
if (rootElement === null) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
