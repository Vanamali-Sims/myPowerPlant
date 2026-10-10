/**
 * Vite entry: global styles, then mount the React tree on #root.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/app.css'
import './styles/ui.css'
import './styles/app-shell.css'
import './styles/welcome.css'
import './styles/setup.css'
import './styles/voice.css'
import './styles/profile.css'
import './styles/dashboard.css'
import './styles/reminders.css'
import './styles/goals.css'
import './styles/chat.css'
import './styles/whatif.css'
import './styles/motion.css'
import './styles/onboarding.css'
import './styles/recommendations.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
