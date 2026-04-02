import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  immediate: true,
  onOfflineReady() {
    toast.success('Mindbreaker is ready for offline play.')
  },
  onNeedRefresh() {
    toast(
      (t) => (
        <span>
          App update available.
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id)
              void updateSW(true)
            }}
            className="ml-2 rounded bg-fuchsia-600 px-2 py-1 text-xs font-semibold text-white"
          >
            Refresh
          </button>
        </span>
      ),
      { duration: 8000 },
    )
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
