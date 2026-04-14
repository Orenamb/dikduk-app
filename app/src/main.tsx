import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Clear previously registered workers/caches to avoid stale API snapshots on mobile.
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        void registration.unregister();
      });
    }).catch(() => {});

    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => {
          void caches.delete(key);
        });
      }).catch(() => {});
    }
  });
}

