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

// Global Loading Progress Bar Logic
const loadingStyle = document.createElement('style');
loadingStyle.textContent = `
  #global-loading-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 3.5px;
    background: linear-gradient(90deg, #3B71FE 0%, #00F2FE 50%, #3B71FE 100%);
    background-size: 200% 100%;
    z-index: 9999999;
    width: 0%;
    opacity: 0;
    transition: width 0.4s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.25s ease;
    pointer-events: none;
    box-shadow: 0 1px 8px rgba(59, 113, 254, 0.6);
  }
  #global-loading-bar.active {
    opacity: 1;
    animation: global-bar-pulse 1.5s infinite linear;
  }
  @keyframes global-bar-pulse {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
  }
`;
document.head.appendChild(loadingStyle);

const loadingBar = document.createElement('div');
loadingBar.id = 'global-loading-bar';
document.body.appendChild(loadingBar);

let activeRequests = 0;
let progressInterval = null;

function startLoading() {
  activeRequests++;
  if (activeRequests === 1) {
    loadingBar.className = 'active';
    loadingBar.style.width = '15%';
    let currentWidth = 15;
    
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (currentWidth < 88) {
        currentWidth += Math.random() * 4.5;
        loadingBar.style.width = `${currentWidth}%`;
      }
    }, 120);
  }
}

function stopLoading() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    loadingBar.style.width = '100%';
    setTimeout(() => {
      if (activeRequests === 0) {
        loadingBar.className = '';
        loadingBar.style.width = '0%';
      }
    }, 280);
  }
}

const originalFetch = window.fetch;
window.fetch = async function(...args) {
  startLoading();
  try {
    const response = await originalFetch.apply(this, args);
    return response;
  } finally {
    stopLoading();
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
