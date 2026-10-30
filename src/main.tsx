import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { CurrencyProvider } from './context/CurrencyContext.tsx';
import './index.css';

// Suppress third-party browser extension errors (e.g. MetaMask connection/injection failures)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map((arg) => String(arg?.message || arg || '')).join(' ');
  if (
    msg.includes('MetaMask') ||
    msg.includes('nkbihfbeogaeaoehlefnkodbefgpgknn') ||
    msg.includes('Failed to connect to MetaMask')
  ) {
    return;
  }
  originalConsoleError(...args);
};

window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || event.reason || '');
  if (
    msg.includes('MetaMask') ||
    msg.includes('nkbihfbeogaeaoehlefnkodbefgpgknn') ||
    msg.includes('Failed to connect to MetaMask')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event.message || '');
  if (
    msg.includes('MetaMask') ||
    msg.includes('nkbihfbeogaeaoehlefnkodbefgpgknn') ||
    msg.includes('Failed to connect to MetaMask')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
    </AuthProvider>
  </StrictMode>,
);
