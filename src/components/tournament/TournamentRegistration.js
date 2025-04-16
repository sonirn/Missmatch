// src/components/tournament/TournamentRegistration.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../common/Modal';
import '../../styles/components/TournamentRegistration.css';

// Import payment config
import { PAYMENT_CONFIG } from '../../config/payment-config';

// Import Firebase services at the end to avoid conflicts
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * TournamentRegistration Component
 * Handles the registration process for tournaments, including payment verification
 */
const TournamentRegistration = ({ tournamentId, tournamentType, entryFee }) => {
  const { user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [referralResult, setReferralResult] = useState(null);
  
  // Use the configured wallet address instead of hardcoding it
  const walletAddress = PAYMENT_CONFIG.RECEIVING_ADDRESS;
  
  // Check if user is already registered for this tournament
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!user) return;
      
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (tournamentType === 'mini' && userData.miniTournamentPaid) {
            setIsRegistered(true);
          } else if (tournamentType === 'grand' && userData.grandTournamentPaid) {
            setIsRegistered(true);
          }
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
      }
    };
    
    checkRegistrationStatus();
  }, [user, tournamentType]);
  
  // Open registration modal
  const handleRegister = () => {
    setShowModal(true);
    setPaymentStep(1);
    setTxHash('');
    setErrorMessage('');
    setSuccessMessage('');
  };
  
  // Close modal and reset state
  const handleCloseModal = () => {
    setShowModal(false);
    setPaymentStep(1);
    setTxHash('');
    setErrorMessage('');
    setSuccessMessage('');
  };
  
  // Move to payment verification step
  const handleContinueToVerification = () => {
    setPaymentStep(2);
  };
  
  // Handle transaction hash input
  const handleTxHashChange = (e) => {
    setTxHash(e.target.value);
    // Clear any previous error message when user types
    if (errorMessage) {
      setErrorMessage('');
    }
  };
  
  // Handle referral code input
  const handleReferralCodeChange = (e) => {
    setReferralCode(e.target.value);
    if (referralResult) {
      setReferralResult(null);
    }
  };
  
  // Apply referral code
  const handleApplyReferralCode = async () => {
    if (!referralCode.trim()) {
      setReferralResult({ success: false, message: 'Please enter a referral code.' });
      return;
    }
    
    try {
      setIsApplyingReferral(true);
      
      // Import service dynamically to avoid circular dependencies
      const { applyReferralCode } = await import('../../services/referralService');
      
      const result = await applyReferralCode(user.uid, referralCode.trim());
      setReferralResult(result);
    } catch (error) {
      console.error('Error applying referral code:', error);
      setReferralResult({ success: false, message: 'An error occurred. Please try again.' });
    } finally {
      setIsApplyingReferral(false);
    }
  };
  
  // Verify payment transaction
  const handleVerifyPayment = async () => {
    if (!txHash.trim()) {
      setErrorMessage('Please enter a transaction hash.');
      return;
    }
    
    try {
      setIsVerifying(true);
      setErrorMessage('');
      
      // Import service dynamically to avoid circular dependencies
      const { registerForTournament } = await import('../../services/tournamentService');
      
      const result = await registerForTournament(user.uid, tournamentType, txHash.trim());
      
      if (result.success) {
        setSuccessMessage(result.message || 'Registration successful!');
        setIsRegistered(true);
        
        // Close modal after a short delay to show success message
        setTimeout(() => {
          setShowModal(false);
        }, 3000);
      } else {
        setErrorMessage(result.message || 'Failed to verify payment. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setErrorMessage('An error occurred. Please try again later.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Render registration button or registered status
  if (isRegistered) {
    return (
      <div className="tournament-registration registered">
        <div className="registration-status">
          <span className="status-icon">✓</span>
          <span className="status-text">You are registered</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="tournament-registration">
      <button 
        className="register-button"
        onClick={handleRegister}
        disabled={isRegistering}
      >
        {isRegistering ? 'Registering...' : `Register (${entryFee} USDT)`}
      </button>
      
      {/* Referral Code Section */}
      <div className="referral-section">
        <h4 className="referral-title">Have a referral code?</h4>
        <div className="referral-form">
          <input
            type="text"
            value={referralCode}
            onChange={handleReferralCodeChange}
            placeholder="Enter referral code"
            className="referral-input"
            disabled={isApplyingReferral}
          />
          <button
            className="referral-button"
            onClick={handleApplyReferralCode}
            disabled={isApplyingReferral || !referralCode.trim()}
          >
            {isApplyingReferral ? 'Applying...' : 'Apply'}
          </button>
        </div>
        {referralResult && (
          <div className={`referral-message ${referralResult.success ? 'success' : 'error'}`}>
            {referralResult.message}
          </div>
        )}
      </div>
      
      {showModal && (
        <Modal 
          title={`Register for ${tournamentType === 'mini' ? 'Mini' : 'Grand'} Tournament`}
          onClose={handleCloseModal}
        >
          <div className="registration-modal-content">
            {paymentStep === 1 ? (
              <div className="payment-instructions">
                <div className="step-indicator">
                  <div className="step active">1. Payment</div>
                  <div className="step-divider"></div>
                  <div className="step">2. Verification</div>
                </div>
                
                <div className="payment-details">
                  <h4>Payment Details</h4>
                  <p>To register for the tournament, please send <strong>{entryFee} USDT (BEP20)</strong> to the following address:</p>
                  
                  <div className="wallet-address">
                    <div className="address-label">Tournament Wallet Address (BEP20):</div>
                    <div className="address-value">
                      <code>{walletAddress}</code>
                      <button 
                        className="copy-button"
                        onClick={() => {
                          navigator.clipboard.writeText(walletAddress);
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
                  
                  <div className="payment-notes">
                    <div className="note warning">
                      <strong>Important:</strong> Make sure to send only USDT on BEP20 (Binance Smart Chain). Other networks are not supported.
                    </div>
                    <div className="note">
                      After sending the payment, you will need the transaction hash (TX ID) to verify your payment.
                    </div>
                  </div>
                  
                  <div className="action-buttons">
                    <button 
                      className="cancel-button"
                      onClick={handleCloseModal}
                    >
                      Cancel
                    </button>
                    <button 
                      className="continue-button"
                      onClick={handleContinueToVerification}
                    >
                      I've Made the Payment
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="payment-verification">
                <div className="step-indicator">
                  <div className="step completed">1. Payment</div>
                  <div className="step-divider completed"></div>
                  <div className="step active">2. Verification</div>
                </div>
                
                <div className="verification-form">
                  <h4>Verify Your Payment</h4>
                  <p>Enter the transaction hash (TX ID) from your payment:</p>
                  
                  <div className="form-group">
                    <label htmlFor="txHash">Transaction Hash:</label>
                    <input
                      type="text"
                      id="txHash"
                      value={txHash}
                      onChange={handleTxHashChange}
                      placeholder="0x..."
                      disabled={isVerifying}
                    />
                    {errorMessage && (
                      <div className="error-message">{errorMessage}</div>
                    )}
                    {successMessage && (
                      <div className="success-message">{successMessage}</div>
                    )}
                  </div>
                  
                  <div className="verification-notes">
                    <div className="note">
                      <strong>Note:</strong> Verification may take a few moments as we confirm your transaction on the blockchain.
                    </div>
                  </div>
                  
                  <div className="action-buttons">
                    <button 
                      className="back-button"
                      onClick={() => setPaymentStep(1)}
                      disabled={isVerifying}
                    >
                      Back
                    </button>
                    <button 
                      className="verify-button"
                      onClick={handleVerifyPayment}
                      disabled={isVerifying || !txHash.trim()}
                    >
                      {isVerifying ? 'Verifying...' : 'Verify Payment'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

TournamentRegistration.propTypes = {
  tournamentId: PropTypes.string.isRequired,
  tournamentType: PropTypes.oneOf(['mini', 'grand']).isRequired,
  entryFee: PropTypes.number.isRequired
};

export default TournamentRegistration;
