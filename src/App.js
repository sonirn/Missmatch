// src/App.js
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Layout Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Loader from './components/common/Loader';

// Pages
import Home from './pages/Home';
import GamePage from './pages/GamePage';
import TournamentPage from './pages/TournamentPage';
import ScoreHistoryPage from './pages/ScoreHistoryPage';
import ProfilePage from './pages/ProfilePage';
import BoosterPage from './pages/BoosterPage';
import ReferralPage from './pages/ReferralPage';
import WalletPage from './pages/WalletPage';
import NotFoundPage from './pages/NotFoundPage';

// Auth Components
import AuthGuard from './components/auth/AuthGuard';

const App = () => {
  const { user, loading, initialized } = useAuth();
    const [appReady, setAppReady] = useState(false);

      // Wait for auth to initialize before rendering routes
        useEffect(() => {
            if (initialized) {
                  setAppReady(true);
                      }
                        }, [initialized]);

                          // Show loading screen while auth initializes
                            if (!appReady) {
                                return (
                                      <div className="app-loading">
                                              <Loader />
                                                      <p>Loading Dino Tournament...</p>
                                                            </div>
                                                                );
                                                                  }

                                                                    return (
                                                                        <div className="app">
                                                                              <Navbar />
                                                                                    <main className="main-content">
                                                                                            <Routes>
                                                                                                      {/* Public Routes */}
                                                                                                                <Route path="/" element={<Home />} />
                                                                                                                          
                                                                                                                                    {/* Protected Routes - Only accessible when logged in */}
                                                                                                                                              <Route element={<AuthGuard />}>
                                                                                                                                                          <Route path="/game" element={<GamePage />} />
                                                                                                                                                                      <Route path="/tournaments" element={<TournamentPage />} />
                                                                                                                                                                                  <Route path="/history" element={<ScoreHistoryPage />} />
                                                                                                                                                                                              <Route path="/profile" element={<ProfilePage />} />
                                                                                                                                                                                                          <Route path="/boosters" element={<BoosterPage />} />
                                                                                                                                                                                                                      <Route path="/referrals" element={<ReferralPage />} />
                                                                                                                                                                                                                                  <Route path="/wallet" element={<WalletPage />} />
                                                                                                                                                                                                                                            </Route>
                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                {/* 404 Route */}
                                                                                                                                                                                                                                                                          <Route path="/404" element={<NotFoundPage />} />
                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                              {/* Redirect all unknown routes to 404 */}
                                                                                                                                                                                                                                                                                                        <Route path="*" element={<Navigate to="/404" replace />} />
                                                                                                                                                                                                                                                                                                                </Routes>
                                                                                                                                                                                                                                                                                                                      </main>
                                                                                                                                                                                                                                                                                                                            <Footer />
                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                  );
                                                                                                                                                                                                                                                                                                                                  };

                                                                                                                                                                                                                                                                                                                                  export default App;
                                                                                                                                                                                                                                                                                                                                  