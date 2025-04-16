// src/components/WalletSettings.js
import React, { useState, useEffect } from 'react';
import firebase from '../firebase/config';
import './WalletSettings.css'; // Make sure to include the CSS

const WalletSettings = () => {
  const [loading, setLoading] = useState(false);
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [pendingReferralBalance, setPendingReferralBalance] = useState(0);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const db = firebase.firestore();
  
  // Fetch user wallet data
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true);
        const userId = firebase.auth().currentUser.uid;
        
        // Get user document
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        if (userData) {
          // Set wallet balance
          setWalletBalance(userData.walletBalance || 0);
          
          // Set pending referral balance
          setPendingReferralBalance(userData.referralBalance || 0);
          
          // Set saved withdrawal address if exists
          setWithdrawalAddress(userData.withdrawalAddress || '');
        }
        
        // Get withdrawal history
        const withdrawalsSnapshot = await db.collection('withdrawals')
          .where('userId', '==', userId)
          .orderBy('requestedAt', 'desc')
          .limit(10)
          .get();
          
        const withdrawals = withdrawalsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setWithdrawalHistory(withdrawals);
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        setError('Failed to load wallet data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (firebase.auth().currentUser) {
      fetchWalletData();
    }
  }, [db]);
  
  // Save withdrawal address
  const saveWithdrawalAddress = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Validate address format (basic validation)
      if (!withdrawalAddress || withdrawalAddress.length !== 42 || !withdrawalAddress.startsWith('0x')) {
        setError('Please enter a valid BEP20 wallet address');
        setLoading(false);
        return;
      }
      
      const userId = firebase.auth().currentUser.uid;
      
      await db.collection('users').doc(userId).update({
        withdrawalAddress: withdrawalAddress
      });
      
      setSuccess('Withdrawal address saved successfully');
    } catch (error) {
      console.error('Error saving withdrawal address:', error);
      setError('Failed to save withdrawal address. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Request withdrawal
  const requestWithdrawal = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Validate amount
      const amount = parseFloat(withdrawalAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid withdrawal amount');
        setLoading(false);
        return;
      }
      
      // Check if amount exceeds balance
      if (amount > walletBalance) {
        setError('Withdrawal amount exceeds your available balance');
        setLoading(false);
        return;
      }
      
      // Validate withdrawal address
      if (!withdrawalAddress || withdrawalAddress.length !== 42 || !withdrawalAddress.startsWith('0x')) {
        setError('Please enter a valid BEP20 wallet address');
        setLoading(false);
        return;
      }
      
      const userId = firebase.auth().currentUser.uid;
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
      
      // Create withdrawal request
      const withdrawalRef = await db.collection('withdrawals').add({
        userId,
        amount,
        currency: 'USDT',
        network: 'BEP20',
        address: withdrawalAddress,
        status: 'pending',
        requestedAt: timestamp
      });
      
      // Update user's balance
      await db.collection('users').doc(userId).update({
        walletBalance: firebase.firestore.FieldValue.increment(-amount),
        withdrawalAddress: withdrawalAddress // Save address if changed
      });
      
      // Update local state
      setWalletBalance(prevBalance => prevBalance - amount);
      setWithdrawalAmount('');
      setSuccess(`Withdrawal request for ${amount} USDT submitted successfully`);
      
      // Add to withdrawal history
      setWithdrawalHistory(prevHistory => [{
        id: withdrawalRef.id,
        userId,
        amount,
        currency: 'USDT',
        network: 'BEP20',
        address: withdrawalAddress,
        status: 'pending',
        requestedAt: new Date() // Temporary date until server timestamp is available
      }, ...prevHistory]);
      
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      setError('Failed to process withdrawal request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-settings-container">
      <h2>Wallet Settings</h2>
      
      <div className="balance-section">
        <div className="balance-card">
          <h3>Available Balance</h3>
          <p className="balance-amount">{walletBalance.toFixed(2)} USDT</p>
        </div>
        
        <div className="balance-card">
          <h3>Pending Referral Balance</h3>
          <p className="balance-amount">{pendingReferralBalance.toFixed(2)} USDT</p>
          <p className="balance-note">
            {pendingReferralBalance < 10 
              ? `Minimum 10 USDT required for transfer (will reset after tournament)`
              : `Will be transferred to main balance after tournament ends`}
          </p>
        </div>
      </div>
      
      <div className="withdrawal-section">
        <h3>Withdrawal</h3>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <div className="form-group">
          <label htmlFor="withdrawal-address">BEP20 Wallet Address</label>
          <input
            id="withdrawal-address"
            type="text"
            value={withdrawalAddress}
            onChange={(e) => setWithdrawalAddress(e.target.value)}
            placeholder="Enter your BEP20 wallet address"
            disabled={loading}
          />
          <button 
            onClick={saveWithdrawalAddress}
            disabled={loading || !withdrawalAddress}
            className="secondary-button"
          >
            Save Address
          </button>
        </div>
        
        <div className="form-group">
          <label htmlFor="withdrawal-amount">Withdrawal Amount (USDT)</label>
          <input
            id="withdrawal-amount"
            type="number"
            value={withdrawalAmount}
            onChange={(e) => setWithdrawalAmount(e.target.value)}
            placeholder="Enter amount to withdraw"
            min="0"
            max={walletBalance}
            step="0.01"
            disabled={loading}
          />
          <button 
            onClick={requestWithdrawal}
            disabled={loading || !withdrawalAmount || !withdrawalAddress || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > walletBalance}
            className="primary-button"
          >
            {loading ? 'Processing...' : 'Withdraw'}
          </button>
        </div>
        
        <p className="withdrawal-note">
          Withdrawals are processed within 24-48 hours. Only BEP20 USDT is supported.
        </p>
      </div>
      
      <div className="history-section">
        <h3>Withdrawal History</h3>
        
        {withdrawalHistory.length === 0 ? (
          <p>No withdrawal history found</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Address</th>
                <th>Status</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {withdrawalHistory.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td>{withdrawal.requestedAt?.toDate().toLocaleDateString() || 'Processing'}</td>
                  <td>{withdrawal.amount} USDT</td>
                  <td className="address-cell">{`${withdrawal.address.substring(0, 6)}...${withdrawal.address.substring(withdrawal.address.length - 4)}`}</td>
                  <td className={`status-${withdrawal.status}`}>{withdrawal.status}</td>
                  <td>
                    {withdrawal.transactionHash ? (
                      <a 
                        href={`https://bscscan.com/tx/${withdrawal.transactionHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      'Pending'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WalletSettings;
