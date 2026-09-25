// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// ✅ Gestionnaire global d'erreurs pour les extensions navigateur
window.addEventListener('error', (event) => {
  if (
    event.error?.name === 'NotFoundError' ||
    event.message?.includes('removeChild')
  ) {
    console.warn('⚠️ Erreur d\'extension navigateur interceptée');
    event.preventDefault();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.name === 'NotFoundError' ||
    event.reason?.message?.includes('removeChild')
  ) {
    console.warn('⚠️ Erreur d\'extension navigateur interceptée');
    event.preventDefault();
    return true;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#DAA520',
                  color: '#fff',
                  borderRadius: '12px',
                },
              }}
            />
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);