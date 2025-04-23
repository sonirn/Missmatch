import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';
import App from './App';
import './style.css';

// Initialize Firebase with your configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics in production only
let analytics;
if (process.env.NODE_ENV === 'production') {
  analytics = getAnalytics(app);
  logEvent(analytics, 'app_initialized');
}

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // Log to Firebase Analytics in production
  if (process.env.NODE_ENV === 'production' && analytics) {
    logEvent(analytics, 'app_error', {
      error_message: event.error?.message || 'Unknown error',
      error_stack: event.error?.stack || 'No stack trace',
      url: window.location.href
    });
  }
});

// Game integration functions
// Function to load the game
function loadGame(containerId) {
  const gameContainer = document.getElementById(containerId);
  if (!gameContainer) return;
  
  // Clear any existing content
  gameContainer.innerHTML = '';
  
  // Create game canvas or load iframe depending on your implementation
  const gameCanvas = document.createElement('canvas');
  gameCanvas.id = 'game-canvas';
  gameCanvas.width = 800;
  gameCanvas.height = 300;
  gameContainer.appendChild(gameCanvas);
  
  // Initialize game (this would call your game's init function)
  if (window.DinoGame && typeof window.DinoGame.init === 'function') {
    window.DinoGame.init(gameCanvas.id, {
      // Tournament-specific settings
      tournamentMode: true,
      boosterEnabled: true,
      scoreMultiplier: 1,
      onGameOver: handleGameOver
    });
  }
}

// Handle game over and score submission
function handleGameOver(score, metadata) {
  console.log('Game over - Score:', score);
  
  // Submit score to Firebase
  submitScore(score, metadata);
  
  // Log event to analytics in production
  if (process.env.NODE_ENV === 'production' && analytics) {
    logEvent(analytics, 'game_completed', {
      score: score,
      duration: metadata?.duration || 0,
      booster_used: metadata?.boosterUsed || false,
      booster_type: metadata?.boosterType || 'none'
    });
  }
}

// Function to submit score to Firebase
function submitScore(score, metadata = {}) {
  // This would typically be handled by a Firebase function
  // Here we're demonstrating the API call structure
  const scoreData = {
    score: score,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  // Example fetch call - replace with your actual implementation
  fetch('/api/scores/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(scoreData)
  })
  .then(response => response.json())
  .then(data => {
    console.log('Score submitted successfully:', data);
  })
  .catch(error => {
    console.error('Error submitting score:', error);
  });
}

// Cryptocurrency wallet connection preparation
window.connectWallet = async (provider) => {
  if (window.ethereum && provider === 'metamask') {
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return { success: true, account: accounts[0], provider: 'metamask' };
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      return { success: false, error: error.message };
    }
  } else if (provider === 'walletconnect') {
    // WalletConnect implementation would go here
    console.log('WalletConnect not implemented yet');
    return { success: false, error: 'WalletConnect not implemented yet' };
  } else {
    return { success: false, error: 'No wallet provider available' };
  }
};

// Game configuration
window.gameConfig = {
  // Tournament-specific settings
  tournamentMode: true,
  baseSpeed: 6,
  acceleration: 0.001,
  gravity: 0.6,
  jumpVelocity: 12,
  obstacleTypes: ['cactus', 'pterodactyl'],
  groundLevel: 130
};

// Expose game functions globally for component access
window.GameFunctions = {
  loadGame,
  submitScore,
  handleGameOver
};

// Render the React application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Remove loading screen once app is rendered
window.addEventListener('DOMContentLoaded', () => {
  const loadingScreen = document.querySelector('.loading-screen');
  if (loadingScreen) {
    // Fade out loading screen
    loadingScreen.style.transition = 'opacity 0.5s ease-out';
    loadingScreen.style.opacity = '0';
    
    // Remove from DOM after transition
    setTimeout(() => {
      if (loadingScreen.parentNode) {
        loadingScreen.parentNode.removeChild(loadingScreen);
      }
    }, 500);
  }
});

// Register service worker for PWA capabilities
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
