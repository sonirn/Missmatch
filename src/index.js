// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './styles/global.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import { TournamentProvider } from './contexts/TournamentContext';
import { WalletProvider } from './contexts/WalletContext';

// Create a root for the React application
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App with all necessary context providers
root.render(
  <React.StrictMode>
      <Router>
            <AuthProvider>
                    <TournamentProvider>
                              <GameProvider>
                                          <WalletProvider>
                                                        <App />
                                                                    </WalletProvider>
                                                                              </GameProvider>
                                                                                      </TournamentProvider>
                                                                                            </AuthProvider>
                                                                                                </Router>
                                                                                                  </React.StrictMode>
                                                                                                  );

                                                                                                  // Optional: Firebase analytics and performance monitoring
                                                                                                  // Uncomment the following code to enable them
                                                                                                  
                                                                                                  import { getAnalytics } from "firebase/analytics";
                                                                                                  import { getPerformance } from "firebase/performance";
                                                                                                  import { app } from './config/firebase';
                                                                                                  const analytics = getAnalytics(app);
                                                                                                  const performance = getPerformance(app);
                                                                                                  
