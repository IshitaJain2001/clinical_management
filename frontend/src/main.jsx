import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './css/index.css'

// Global interceptor to suppress standard browser success alert popups
const originalAlert = window.alert;
window.alert = function (message) {
  const msgLower = String(message).toLowerCase();
  const isSuccess = msgLower.includes('success') || 
                    msgLower.includes('updated') || 
                    msgLower.includes('registered') || 
                    msgLower.includes('generated') || 
                    msgLower.includes('assigned') || 
                    msgLower.includes('returned') || 
                    msgLower.includes('posted') || 
                    msgLower.includes('compiled') ||
                    msgLower.includes('created') ||
                    msgLower.includes('deleted') ||
                    msgLower.includes('saved');
  if (isSuccess) {
    console.log('[ALERT BYPASSED] Suppressed success alert:', message);
    return;
  }
  return originalAlert.apply(this, arguments);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
