import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HotkeysProvider>
      <App />
    </HotkeysProvider>
  </StrictMode>,
)
