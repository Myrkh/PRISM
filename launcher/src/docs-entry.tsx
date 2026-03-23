/**
 * src/docs-entry.tsx — PRISM Launcher
 * Entry point for the standalone documentation window.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { DocsWindow } from './components/docs/DocsWindow'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DocsWindow />
  </StrictMode>,
)
