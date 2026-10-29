import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { initTheme } from './app/theme'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element in index.html')

// Theme saved on this device, before the first paint (no light flash in dark mode).
initTheme()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
