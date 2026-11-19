import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import StartupGate from './modules/Loading/StartupGate.jsx'
import './translate/i18n.js'
import { installTheme } from './static/theme'

installTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StartupGate><App /></StartupGate>
  </StrictMode>,
)
