import './pwa/installPromptCapture.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { LanguageProvider } from './i18n/LanguageProvider'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

registerSW({
  immediate: true,
  onRegistered(registration) {
    console.log('[PWA] service worker registered', registration)
  },
  onRegisterError(error) {
    console.error('[PWA] service worker registration failed', error)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)
