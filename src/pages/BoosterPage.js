// src/pages/BoosterPage.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/pages/BoosterPage.css';

/**
 * BoosterPage Component
 * Allows users to purchase and manage boosters for the game
 */
const BoosterPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBooster, setSelectedBooster] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  
  // Booster configurations
  const boosters = [
    {
      id: 'booster1',
      name: 'Booster 1',
      description: 'Double your score for your next 10 games.',
      price: 10,
      games: 10,
      unlimited: false,
      icon: '🚀'
    },
    {
      id: 'booster2',
      name: 'Booster 2',
      description: 'Double your score for your next 100 games.',
      price: 50,
      games: 100,
      unlimited: false,
      icon: '🔥'
    },
    {
      id: 'booster3',
      name: 'Booster 3',
      description: 'Double your score for all games until the tournament ends.',
      price: 100,
      games: 0,
      unlimited: true,
      icon: '⚡'
    }
  ];
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData({
            id: user.uid,
            ...userDoc.data()
          });
        } else {
          setError('User profile not found. Please contact support.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);
  
  // Check if user is eligible for boosters (must be in Grand Tournament)
  const isEligibleForBoosters = userData?.grandTournamentPaid === true;
  
  // Handle booster selection
  const handleSelectBooster = (booster) => {
    if (!isEligibleForBoosters) {
      setError('You must be registered for the Grand Tournament to purchase boosters.');
      return;
    }
    
    setSelectedBooster(booster);
    setShowPaymentModal(true);
    setTxHash('');
    setPurchaseSuccess(false);
    setPurchaseError('');
  };
  
  // Handle transaction hash input
  const handleTxHashChange = (e) => {
    setTxHash(e.target.value);
    if (purchaseError) {
      setPurchaseError('');
    }
  };
  
  // Verify payment and apply booster
  const handleVerifyPayment = async () => {
    if (!txHash.trim()) {
      setPurchaseError('Please enter a transaction hash.');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Verify payment using Firebase function
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../config/firebase');
      
      const verifyPayment = httpsCallable(functions, 'verifyPayment');
      const result = await verifyPayment({
        userId: user.uid,
        boosterType: selectedBooster.id,
        amount: selectedBooster.price,
        txHash: txHash.trim(),
        type: 'booster',
        receivingAddress: "0x67A845bC54Eb830b1d724fa183F429E02c1237D1"
      });
      
      if (!result.data.success) {
        setPurchaseError(result.data.message || 'Failed to verify payment. Please try again.');
        setIsProcessing(false);
        return;
      }
      
      // Update user's active booster
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        activeBooster: {
          type: selectedBooster.id,
          gamesRemaining: selectedBooster.unlimited ? null : selectedBooster.games,
          unlimited: selectedBooster.unlimited,
          purchasedAt: serverTimestamp()
        }
      });
      
      // Record payment
      await addDoc(collection(db, 'payments'), {
        userId: user.uid,
        amount: selectedBooster.price,
        type: 'booster',
        boosterType: selectedBooster.id,
        txHash: txHash,
        status: 'verified',
        timestamp: serverTimestamp()
      });
      
      setPurchaseSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setShowPaymentModal(false);
        
        // Refresh user data to show the new booster
        const fetchUpdatedUserData = async () => {
          const updatedUserDoc = await getDoc(userRef);
          if (updatedUserDoc.exists()) {
            setUserData({
              id: user.uid,
              ...updatedUserDoc.data()
            });
          }
        };
        
        fetchUpdatedUserData();
      }, 3000);
    } catch (err) {
      console.error('Error processing booster purchase:', err);
      setPurchaseError('Failed to process your purchase. Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Get active booster details
  const getActiveBoosterDetails = () => {
    if (!userData?.activeBooster) return null;
    
    const boosterType = userData.activeBooster.type;
    const booster = boosters.find(b => b.id === boosterType);
    
    if (!booster) return null;
    
    return {
      ...booster,
      gamesRemaining: userData.activeBooster.unlimited ? 'Unlimited' : userData.activeBooster.gamesRemaining,
      purchasedAt: userData.activeBooster.purchasedAt?.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) || 'N/A'
    };
  };
  
  // Deactivate booster
  const handleDeactivateBooster = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        activeBooster: null
      });
      
      // Update local state
      setUserData({
        ...userData,
        activeBooster: null
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error deactivating booster:', err);
      setError('Failed to deactivate booster. Please try again.');
      setLoading(false);
    }
  };
  
  const activeBooster = getActiveBoosterDetails();
  
  if (loading) {
    return <Loader message="Loading boosters..." />;
  }
  
  if (!user) {
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please sign in to view and purchase boosters.</p>
        <button 
          className="auth-button"
          onClick={() => navigate('/login')}
        >
          Sign In
        </button>
      </div>
    );
  }
  
  return (
    <div className="booster-page-container">
      {/* SEO Optimization */}
      <Helmet>
        <title>Dino Runner - Score Boosters</title>
        <meta name="description" content="Purchase score boosters to double your score and increase your chances of winning in tournaments." />
      </Helmet>
      
      {/* Page Header */}
      <div className="booster-page-header">
        <h1>Score Boosters</h1>
        <p className="booster-subtitle">
          Double your score and increase your chances of winning!
        </p>
      </div>
      
      {/* Eligibility Warning */}
      {!isEligibleForBoosters && (
        <div className="eligibility-warning">
          <h3>Grand Tournament Required</h3>
          <p>
            Boosters are only available for Grand Tournament participants.
            Please register for the Grand Tournament to purchase boosters.
          </p>
          <button 
            className="register-button"
            onClick={() => navigate('/tournament')}
          >
            Register for Grand Tournament
          </button>
        </div>
      )}
      
      {/* Display error if any */}
      {error && (
        <div className="error-container">
          <ErrorMessage message={error} />
        </div>
      )}
      
      {/* Active Booster Section */}
      <div className="active-booster-section">
        <h2>Your Active Booster</h2>
        
        {activeBooster ? (
          <div className="active-booster-card">
            <div className="booster-icon">{activeBooster.icon}</div>
            <div className="booster-details">
              <h3>{activeBooster.name}</h3>
              <p className="booster-description">{activeBooster.description}</p>
              <div className="booster-status">
                <div className="status-item">
                  <span className="status-label">Games Remaining:</span>
                  <span className="status-value">{activeBooster.gamesRemaining}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Purchased:</span>
                  <span className="status-value">{activeBooster.purchasedAt}</span>
                </div>
              </div>
            </div>
            <button 
              className="deactivate-button"
              onClick={handleDeactivateBooster}
              disabled={loading}
            >
              Deactivate Booster
            </button>
          </div>
        ) : (
          <div className="no-active-booster">
            <p>You don't have any active boosters.</p>
            <p>Purchase a booster below to double your score!</p>
          </div>
        )}
      </div>
      
      {/* Available Boosters Section */}
      <div className="available-boosters-section">
        <h2>Available Boosters</h2>
        
        <div className="boosters-grid">
          {boosters.map((booster) => (
            <div className="booster-card" key={booster.id}>
              <div className="booster-header">
                <div className="booster-icon">{booster.icon}</div>
                <div className="booster-price">{booster.price} USDT</div>
              </div>
              <h3 className="booster-name">{booster.name}</h3>
              <p className="booster-description">{booster.description}</p>
              <button 
                className="purchase-button"
                onClick={() => handleSelectBooster(booster)}
                disabled={!isEligibleForBoosters}
              >
                Purchase
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Booster Information Section */}
      <div className="booster-info-section">
        <h2>How Boosters Work</h2>
        
        <div className="info-cards">
          <div className="info-card">
            <div className="info-icon">🎮</div>
            <h3>Double Your Score</h3>
            <p>Boosters automatically double your score during gameplay, giving you a significant advantage in tournaments.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">🏆</div>
            <h3>Tournament Advantage</h3>
            <p>With doubled scores, you'll climb the tournament leaderboard faster and increase your chances of winning prizes.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">⏱️</div>
            <h3>Limited Duration</h3>
            <p>Boosters are active for a specific number of games or until the tournament ends, depending on the booster type.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">💰</div>
            <h3>Return on Investment</h3>
            <p>A small investment in boosters can lead to significant prize winnings if you reach the top ranks!</p>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && selectedBooster && (
        <Modal 
          title={`Purchase ${selectedBooster.name}`}
          onClose={() => setShowPaymentModal(false)}
        >
          <div className="payment-modal-content">
            <div className="booster-summary">
              <div className="summary-item">
                <span className="summary-label">Booster:</span>
                <span className="summary-value">{selectedBooster.name}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Price:</span>
                <span className="summary-value">{selectedBooster.price} USDT</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Effect:</span>
                <span className="summary-value">{selectedBooster.description}</span>
              </div>
            </div>
            
            <div className="payment-instructions">
              <h4>Payment Instructions</h4>
              <p>
                To purchase this booster, please send <strong>{selectedBooster.price} USDT (BEP20)</strong> to the following address:
              </p>
              
              <div className="wallet-address">
                <div className="address-label">Tournament Wallet Address (BEP20):</div>
                <div className="address-value">
                  <code>0x67A845bC54Eb830b1d724fa183F429E02c1237D1</code>
                  <button 
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText('0x67A845bC54Eb830b1d724fa183F429E02c1237D1');
                      // Show a temporary 'Copied!' message
                      const button = document.querySelector('.copy-button');
                      const originalText = button.innerText;
                      button.innerText = 'Copied!';
                      setTimeout(() => {
                        button.innerText = originalText;
                      }, 2000);
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="payment-note">
                <strong>Important:</strong> Make sure to send only USDT on BEP20 (Binance Smart Chain). Other networks are not supported.
              </div>
            </div>
            
            <div className="verification-form">
              <h4>Verify Your Payment</h4>
              <p>After sending the payment, enter the transaction hash (TX ID) below:</p>
              
              <div className="form-group">
                <label htmlFor="txHash">Transaction Hash:</label>
                <input
                  type="text"
                  id="txHash"
                  value={txHash}
                  onChange={handleTxHashChange}
                  placeholder="0x..."
                  disabled={isProcessing || purchaseSuccess}
                />
              </div>
              
              {purchaseError && (
                <div className="purchase-error">{purchaseError}</div>
              )}
              
              {purchaseSuccess && (
                <div className="purchase-success">
                  <p>🎉 Booster purchased successfully!</p>
                  <p>Your booster is now active. Enjoy your doubled scores!</p>
                </div>
              )}
              
              <div className="modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button 
                  className="verify-button"
                  onClick={handleVerifyPayment}
                  disabled={isProcessing || !txHash.trim() || purchaseSuccess}
                >
                  {isProcessing ? 'Verifying...' : 'Verify Payment'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BoosterPage;
