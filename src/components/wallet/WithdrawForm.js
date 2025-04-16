// src/components/wallet/WithdrawForm.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Modal from '../common/Modal';
import '../../styles/components/WithdrawForm.css';

/**
 * WithdrawForm Component
 * Allows users to withdraw funds to their wallet
 */
const WithdrawForm = ({ maxAmount, onCancel, onWithdrawSuccess }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState('bep20');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Minimum withdrawal amount
  const MIN_WITHDRAWAL = 10;
  
  // Handle amount input change
  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and a single decimal point
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };
  
  // Handle wallet address input change
  const handleWalletAddressChange = (e) => {
    setWalletAddress(e.target.value);
    setError('');
  };
  
  // Handle network selection
  const handleNetworkChange = (e) => {
    setNetwork(e.target.value);
  };
  
  // Set maximum amount
  const handleSetMaxAmount = () => {
    setAmount(maxAmount.toString());
    setError('');
  };
  
  // Validate form
  const validateForm = () => {
    const parsedAmount = parseFloat(amount);
    
    if (!amount || isNaN(parsedAmount)) {
      setError('Please enter a valid amount.');
      return false;
    }
    
    if (parsedAmount < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal amount is ${MIN_WITHDRAWAL} USDT.`);
      return false;
    }
    
    if (parsedAmount > maxAmount) {
      setError(`Insufficient balance. Maximum amount is ${maxAmount} USDT.`);
      return false;
    }
    
    if (!walletAddress) {
      setError('Please enter your wallet address.');
      return false;
    }
    
    // Basic validation for BEP20 address (starts with 0x and has 42 characters)
    if (network === 'bep20' && (!walletAddress.startsWith('0x') || walletAddress.length !== 42)) {
      setError('Please enter a valid BEP20 wallet address.');
      return false;
    }
    
    return true;
  };

  // Show confirmation dialog
  const handleProceed = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };
  
  // Cancel confirmation
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const parsedAmount = parseFloat(amount);
      
      // Update user's balance
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: maxAmount - parsedAmount,
        pendingWithdrawal: (user.pendingWithdrawal || 0) + parsedAmount
      });
      
      // Create withdrawal record
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        amount: parsedAmount,
        walletAddress,
        network,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      // Create transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'withdrawal',
        amount: parsedAmount,
        status: 'pending',
        details: `Withdrawal to ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`,
        timestamp: serverTimestamp()
      });
      
      // Call success callback
      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }
      
      setIsSubmitting(false);
      setShowConfirmation(false);
    } catch (err) {
      console.error('Error processing withdrawal:', err);
      setError('Failed to process withdrawal. Please try again later.');
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };
  
  return (
    <div className="withdraw-form">
      <div className="form-header">
        <h3>Withdraw Funds</h3>
        <button className="close-button" onClick={onCancel}>×</button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={(e) => { e.preventDefault(); handleProceed(); }}>
        <div className="form-group">
          <label htmlFor="amount">Amount (USDT)</label>
          <div className="amount-input-container">
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Enter amount"
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="max-button"
              onClick={handleSetMaxAmount}
              disabled={isSubmitting}
            >
              MAX
            </button>
          </div>
          <div className="input-note">
            Available: {maxAmount} USDT | Min: {MIN_WITHDRAWAL} USDT
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="walletAddress">Wallet Address</label>
          <input
            type="text"
            id="walletAddress"
            value={walletAddress}
            onChange={handleWalletAddressChange}
            placeholder="Enter your wallet address"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="network">Network</label>
          <select
            id="network"
            value={network}
            onChange={handleNetworkChange}
            disabled={isSubmitting}
          >
            <option value="bep20">BEP20 (Binance Smart Chain)</option>
          </select>
          <div className="input-note">
            Only BEP20 network is supported at this time
          </div>
        </div>
        
        <div className="withdrawal-warning">
          <p>
            <strong>Important:</strong> Make sure the address is correct and supports BEP20 tokens.
            Withdrawals to incorrect addresses cannot be recovered.
          </p>
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            Proceed
          </button>
        </div>
      </form>

      {showConfirmation && (
        <Modal title="Confirm Withdrawal" onClose={handleCancelConfirmation}>
          <div className="confirmation-content">
            <p>Please confirm your withdrawal request:</p>
            <div className="confirmation-details">
              <div className="confirmation-item">
                <span className="confirmation-label">Amount:</span>
                <span className="confirmation-value">{amount} USDT</span>
              </div>
              <div className="confirmation-item">
                <span className="confirmation-label">To Address:</span>
                <span className="confirmation-value confirmation-address">
                  {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
                </span>
              </div>
              <div className="confirmation-item">
                <span className="confirmation-label">Network:</span>
                <span className="confirmation-value">BEP20 (Binance Smart Chain)</span>
              </div>
            </div>
            <div className="confirmation-warning">
              <p>This action cannot be undone. Please verify all details before confirming.</p>
            </div>
            <div className="confirmation-actions">
              <button 
                className="cancel-button"
                onClick={handleCancelConfirmation}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="confirm-button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

WithdrawForm.propTypes = {
  maxAmount: PropTypes.number.isRequired,
  onCancel: PropTypes.func.isRequired,
  onWithdrawSuccess: PropTypes.func
};

export default WithdrawForm;
