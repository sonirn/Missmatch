// src/components/payment/TransactionVerification.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { PAYMENT_CONFIG } from '../../config/payment-config';
import PaymentStatus from './PaymentStatus';
import '../../styles/components/TransactionVerification.css';

/**
 * TransactionVerification Component
 * Verifies a transaction for tournament registration or booster purchase
 * 
 * @param {Object} props - Component props
 * @param {string} props.paymentType - 'tournament' or 'booster'
 * @param {string} props.itemType - 'mini', 'grand', 'booster1', 'booster2', or 'booster3'
 * @param {Function} props.onVerificationComplete - Callback function when verification is complete
 */
const TransactionVerification = ({ paymentType, itemType, onVerificationComplete }) => {
  const { user } = useAuth();
  const [txHash, setTxHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  
  // Handle transaction hash input
  const handleTxHashChange = (e) => {
    setTxHash(e.target.value);
    // Clear verification status when user types
    if (verificationStatus) {
      setVerificationStatus(null);
    }
  };
  
  // Verify payment transaction
  const handleVerifyPayment = async () => {
    if (!txHash.trim()) {
      setVerificationStatus({
        status: 'error',
        message: 'Please enter a transaction hash.'
      });
      return;
    }
    
    try {
      setIsVerifying(true);
      setVerificationStatus(null);
      
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
        setVerificationStatus({
          status: 'success',
          message: result.message,
          txHash,
          amount: result.transaction?.value,
          timestamp: new Date()
        });
        // Call the onVerificationComplete callback with result
        onVerificationComplete(result);
      } else {
        setVerificationStatus({
          status: 'error',
          message: result.message || 'Verification failed. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
      setVerificationStatus({
        status: 'error',
        message: 'An error occurred. Please try again later.'
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  return (
    <div className="transaction-verification">
      <h3 className="verification-title">Transaction Verification</h3>
      
      <div className="verification-form">
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
        </div>
        
        <div className="form-actions">
          <button 
            className="verify-button"
            onClick={handleVerifyPayment}
            disabled={isVerifying || !txHash.trim()}
          >
            {isVerifying ? 'Verifying...' : 'Verify Payment'}
          </button>
        </div>
      </div>
      
      {verificationStatus && (
        <PaymentStatus 
          status={verificationStatus.status}
          message={verificationStatus.message}
          txHash={verificationStatus.txHash}
          amount={verificationStatus.amount}
          timestamp={verificationStatus.timestamp}
          onClose={() => setVerificationStatus(null)}
        />
      )}
    </div>
  );
};

TransactionVerification.propTypes = {
  paymentType: PropTypes.oneOf(['tournament', 'booster']).isRequired,
  itemType: PropTypes.string.isRequired,
  onVerificationComplete: PropTypes.func.isRequired
};

export default TransactionVerification;
