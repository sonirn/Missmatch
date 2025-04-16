// src/components/wallet/Balance.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Loader from '../common/Loader';
import ErrorMessage from '../common/ErrorMessage';
import WithdrawForm from './WithdrawForm';
import '../../styles/components/Balance.css';

/**
 * Balance Component
 * Displays user's wallet balance and provides access to withdrawal functionality
 */
const Balance = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  
  // Fetch user's balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setBalance({
            main: userData.balance || 0,
            referral: userData.referralBalance || 0,
            pendingWithdrawal: userData.pendingWithdrawal || 0,
            totalWithdrawn: userData.totalWithdrawn || 0
          });
        } else {
          setError('User profile not found.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching balance:', err);
        setError('Failed to load balance. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchBalance();
  }, [user]);
  
  // Toggle withdraw form
  const toggleWithdrawForm = () => {
    setShowWithdrawForm(!showWithdrawForm);
  };
  
  // Format number with commas
  const formatNumber = (num) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  if (loading) {
    return <Loader message="Loading balance..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  if (!user) {
    return <ErrorMessage message="Please sign in to view your balance." />;
  }
  
  return (
    <div className="balance-container">
      <div className="balance-header">
        <h2>Your Wallet</h2>
        {!showWithdrawForm && (
          <button 
            className="withdraw-button"
            onClick={toggleWithdrawForm}
            disabled={balance.main <= 0}
          >
            Withdraw Funds
          </button>
        )}
      </div>
      
      <div className="balance-cards">
        <div className="balance-card main">
          <div className="balance-title">Main Balance</div>
          <div className="balance-amount">{formatNumber(balance.main)} USDT</div>
          <div className="balance-description">
            Available for withdrawal
          </div>
        </div>
        
        <div className="balance-card referral">
          <div className="balance-title">Referral Balance</div>
          <div className="balance-amount">{formatNumber(balance.referral)} USDT</div>
          <div className="balance-description">
            Transferred to main balance after tournaments
          </div>
        </div>
      </div>
      
      <div className="balance-summary">
        <div className="summary-item">
          <span className="summary-label">Pending Withdrawal:</span>
          <span className="summary-value">{formatNumber(balance.pendingWithdrawal)} USDT</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Withdrawn:</span>
          <span className="summary-value">{formatNumber(balance.totalWithdrawn)} USDT</span>
        </div>
      </div>
      
      {showWithdrawForm && (
        <div className="withdraw-form-container">
          <WithdrawForm 
            maxAmount={balance.main} 
            onCancel={toggleWithdrawForm}
            onWithdrawSuccess={() => {
              // Refresh balance after successful withdrawal
              window.location.reload();
            }}
          />
        </div>
      )}
      
      <div className="balance-notes">
        <h3>Important Notes:</h3>
        <ul>
          <li>Withdrawals are processed within 24-48 hours.</li>
          <li>Minimum withdrawal amount is 10 USDT.</li>
          <li>Withdrawals are sent as BEP20 USDT tokens.</li>
          <li>Make sure your wallet supports BEP20 tokens before withdrawing.</li>
          <li>Tournament prizes are distributed automatically after tournaments end.</li>
        </ul>
      </div>
    </div>
  );
};

Balance.propTypes = {
  // No props required for this component
};

export default Balance;
