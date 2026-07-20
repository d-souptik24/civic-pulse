import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';

// Civic Authority design is light-mode by intent — no dark class override
// The Stone + Plum palette reads clearly on white/stone-paper backgrounds

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
