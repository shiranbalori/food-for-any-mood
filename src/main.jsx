import './pwa/installPromptCapture.js'
import { initPwaUpdateRegistration } from './pwa/pwaUpdateRegistration'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LanguageProvider } from './i18n/LanguageProvider'
import { AuthProvider } from './context/AuthContext'
import PwaUpdateNotice from './components/PwaUpdateNotice'
import './index.css'
import App from './App.jsx'

initPwaUpdateRegistration()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
        <PwaUpdateNotice />
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)
