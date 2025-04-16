// src/components/payment/PaymentForm.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { PAYMENT_CONFIG } from '../../config/payment-config';
import '../../styles/components/PaymentForm.css';

/**
 * PaymentForm Component
 * Handles payment submission for tournaments and boosters
 * 
 * @param {Object} props - Component props
 * @param {string} props.paymentType - 'tournament' or 'booster'
 * @param {string} props.itemType - 'mini', 'grand', 'booster1', 'booster2', or 'booster3'
 * @param {Function} props.onPaymentComplete - Callback function when payment is verified
 * @param {Function} props.onCancel - Callback function when payment is cancelled
 */
const PaymentForm = ({ paymentType, itemType, onPaymentComplete, onCancel }) => {
  const { user } = useAuth();
  const [txHash, setTxHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Get payment amount based on type
  const paymentAmount = paymentType === 'tournament' 
    ? PAYMENT_CONFIG.getEntryFee(itemType) 
    : PAYMENT_CONFIG.getBoosterPrice(itemType);
  
  // Get wallet address from configuration
  const walletAddress = PAYMENT_CONFIG.RECEIVING_ADDRESS;
  
  // Handle transaction hash input
  const handleTxHashChange = (e) => {
    setTxHash(e.target.value);
    // Clear error message when user types
    if (errorMessage) {
      setErrorMessage('');
    }
  };
  
  // Copy wallet address to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress)
      .then(() => {
        // Show temporary success message
        const button = document.querySelector('.copy-button');
        const originalText = button.innerText;
        button.innerText = 'Copied!';
        setTimeout(() => {
          button.innerText = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
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
      
      let result;
      
      if (paymentType === 'tournament') {
        // Import tournament service dynamically to avoid circular dependencies
        const tournamentServiceModule = await import('../../services/tournamentService');
        result = await tournamentServiceModule.registerForTournament(user.uid, itemType, txHash.trim());
      } else if (paymentType === 'booster') {
        // Import booster service dynamically to avoid circular dependencies
        const boosterServiceModule = await import('../../services/boosterService');
        result = await boosterServiceModule.purchaseBooster(user.uid, itemType, txHash.trim());
      }
      
      if (result.success) {
        // Call the onPaymentComplete callback with result
        onPaymentComplete(result);
      } else {
        setErrorMessage(result.message || 'Payment verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setErrorMessage('An error occurred. Please try again later.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Get title based on payment type and item type
  const getTitle = () => {
    if (paymentType === 'tournament') {
      return `${itemType === 'mini' ? 'Mini' : 'Grand'} Tournament Registration`;
    } else if (paymentType === 'booster') {
      const boosterNames = {
        booster1: 'Booster 1 (10 Games)',
        booster2: 'Booster 2 (100 Games)',
        booster3: 'Booster 3 (Unlimited)'
      };
      return `Purchase ${boosterNames[itemType] || itemType}`;
    }
    return 'Payment';
  };
  
  return (
    <div className="payment-form-container">
      <h3 className="payment-form-title">{getTitle()}</h3>
      
      <div className="payment-instructions">
        <p>Please send <strong>{paymentAmount} USDT (BEP20)</strong> to the following address:</p>
        
        <div className="wallet-address-container">
          <div className="wallet-address-label">Tournament Wallet Address (BEP20):</div>
          <div className="wallet-address-value">
            <code>{walletAddress}</code>
            <button 
              className="copy-button"
              onClick={copyToClipboard}
            >
              Copy
            </button>
          </div>
        </div>
        
        <div className="payment-notes">
          <div className="payment-note warning">
            <strong>Important:</strong> Make sure to send only USDT on BEP20 (Binance Smart Chain). Other networks are not supported.
          </div>
          <div className="payment-note">
            After sending the payment, enter the transaction hash (TX ID) below to verify your payment.
          </div>
        </div>
      </div>
      
      <div className="payment-verification-form">
        <div className="form-group">
          <label htmlFor="txHash">Transaction Hash (TX ID):</label>
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
        </div>
        
        <div className="form-actions">
          <button 
            className="cancel-button"
            onClick={onCancel}
            disabled={isVerifying}
          >
            Cancel
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
  );
};

PaymentForm.propTypes = {
  paymentType: PropTypes.oneOf(['tournament', 'booster']).isRequired,
  itemType: PropTypes.string.isRequired,
  onPaymentComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default PaymentForm;
