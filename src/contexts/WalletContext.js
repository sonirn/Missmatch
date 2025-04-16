// src/contexts/WalletContext.js
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import firebase from '../firebase/config';
import userService from '../services/userService';
import referralService from '../services/referralService';
import { AuthContext } from './AuthContext';
import { handleError } from '../utils/errorHandler';

// Create the context
export const WalletContext = createContext();

/**
 * WalletContext Provider component
 * Manages wallet balances, transactions, withdrawals, and referrals
 */
export const WalletProvider = ({ children }) => {
  // Access auth context
  const { currentUser } = useContext(AuthContext);
  
  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralBalance, setReferralBalance] = useState(0);
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Referral state
  const [referralStats, setReferralStats] = useState({
    referralCode: null,
    totalReferrals: 0,
    validReferrals: 0,
    pendingReferrals: 0,
    currentBalance: 0,
    referralUrl: null
  });
  const [referralList, setReferralList] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /**
   * Fetch wallet balances and related data
   * @returns {Promise<Object>} Wallet data
   */
  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      if (!currentUser) {
        return { walletBalance: 0, referralBalance: 0 };
      }
      
      // Get user profile from service
      const profile = await userService.getCurrentUserProfile();
      
      if (profile) {
        // Update wallet state
        setWalletBalance(profile.walletBalance || 0);
        setReferralBalance(profile.referralBalance || 0);
        setWithdrawalAddress(profile.withdrawalAddress || '');
        
        // Return the data
        return {
          walletBalance: profile.walletBalance || 0,
          referralBalance: profile.referralBalance || 0,
          withdrawalAddress: profile.withdrawalAddress || ''
        };
      }
      
      return { walletBalance: 0, referralBalance: 0 };
    } catch (error) {
      const errorMessage = handleError(error, 'Wallet Data');
      setError(errorMessage);
      return { walletBalance: 0, referralBalance: 0 };
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Fetch withdrawal history
   * @returns {Promise<Array>} Withdrawal history
   */
  const fetchWithdrawalHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!currentUser) {
        return [];
      }
      
      // Get withdrawal history from Firestore
      const withdrawalsSnapshot = await firebase.firestore()
        .collection('withdrawals')
        .where('userId', '==', currentUser.uid)
        .orderBy('requestedAt', 'desc')
        .limit(10)
        .get();
      
      const withdrawals = [];
      withdrawalsSnapshot.forEach(doc => {
        const data = doc.data();
        withdrawals.push({
          id: doc.id,
          amount: data.amount,
          address: data.address,
          status: data.status,
          currency: data.currency || 'USDT',
          network: data.network || 'BEP20',
          requestedAt: data.requestedAt?.toDate() || null,
          processedAt: data.processedAt?.toDate() || null,
          transactionHash: data.transactionHash || null
        });
      });
      
      setWithdrawalHistory(withdrawals);
      return withdrawals;
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Fetch transaction history
   * @returns {Promise<Array>} Transaction history
   */
  const fetchTransactionHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!currentUser) {
        return [];
      }
      
      // Get transaction history from service
      const history = await userService.getWalletTransactions(20);
      setTransactions(history);
      return history;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Update withdrawal address
   * @param {string} address - BEP20 wallet address
   * @returns {Promise<Object>} Update result
   */
  const updateWithdrawalAddress = useCallback(async (address) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate address format
      if (!address || address.length !== 42 || !address.startsWith('0x')) {
        setError('Please enter a valid BEP20 wallet address');
        return { success: false, message: 'Invalid wallet address' };
      }
      
      // Check if user is authenticated
      if (!currentUser) {
        setError('You must be logged in to update your withdrawal address');
        return { success: false, message: 'Authentication required' };
      }
      
      // Update address using service
      await userService.updateWithdrawalAddress(address);
      
      // Update local state
      setWithdrawalAddress(address);
      setSuccess('Withdrawal address saved successfully');
      
      return { success: true, message: 'Withdrawal address updated successfully' };
    } catch (error) {
      const errorMessage = handleError(error, 'Update Withdrawal Address');
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Request a withdrawal
   * @param {number} amount - Amount to withdraw
   * @param {string} address - BEP20 wallet address
   * @returns {Promise<Object>} Withdrawal result
   */
  const requestWithdrawal = useCallback(async (amount, address) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setError('Please enter a valid withdrawal amount');
        return { success: false, message: 'Invalid amount' };
      }
      
      // Check if amount exceeds balance
      if (numAmount > walletBalance) {
        setError('Withdrawal amount exceeds your available balance');
        return { success: false, message: 'Insufficient balance' };
      }
      
      // Validate address
      if (!address || address.length !== 42 || !address.startsWith('0x')) {
        setError('Please enter a valid BEP20 wallet address');
        return { success: false, message: 'Invalid address' };
      }
      
      // Check if user is authenticated
      if (!currentUser) {
        setError('You must be logged in to request a withdrawal');
        return { success: false, message: 'Authentication required' };
      }
      
      // Process withdrawal using service
      const result = await userService.requestWithdrawal(numAmount, address);
      
      if (result.success) {
        // Update local state
        setWalletBalance(prevBalance => prevBalance - numAmount);
        setSuccess(`Withdrawal request for ${numAmount} USDT submitted successfully`);
        
        // Refresh withdrawal history and transactions
        await fetchWithdrawalHistory();
        await fetchTransactionHistory();
        
        return result;
      } else {
        setError(result.message || 'Failed to process withdrawal');
        return result;
      }
    } catch (error) {
      const errorMessage = handleError(error, 'Withdrawal Request');
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentUser, walletBalance, fetchWithdrawalHistory, fetchTransactionHistory]);

  /**
   * Fetch referral statistics and list
   * @returns {Promise<Object>} Referral data
   */
  const fetchReferralData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!currentUser) {
        return { stats: null, list: [] };
      }
      
      // Get referral stats
      const stats = await referralService.getReferralStats(currentUser.uid);
      setReferralStats(stats);
      
      // Get referral list
      const list = await referralService.getReferralList(currentUser.uid);
      setReferralList(list);
      
      return { stats, list };
    } catch (error) {
      console.error('Error fetching referral data:', error);
      return { stats: null, list: [] };
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Generate a referral link
   * @returns {Promise<string>} Referral link
   */
  const generateReferralLink = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      if (!currentUser) {
        setError('You must be logged in to generate a referral link');
        return null;
      }
      
      // Generate link
      const link = await referralService.getReferralLink(currentUser.uid);
      
      // Update referral stats
      await fetchReferralData();
      
      return link;
    } catch (error) {
      const errorMessage = handleError(error, 'Generate Referral Link');
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchReferralData]);

  /**
   * Clear success and error messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Initialize wallet data when auth state changes
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      if (user) {
        // Fetch all wallet data
        fetchWalletData();
        fetchWithdrawalHistory();
        fetchTransactionHistory();
        fetchReferralData();
      } else {
        // Reset state when user logs out
        setWalletBalance(0);
        setReferralBalance(0);
        setWithdrawalAddress('');
        setWithdrawalAmount('');
        setWithdrawalHistory([]);
        setTransactions([]);
        setReferralStats({
          referralCode: null,
          totalReferrals: 0,
          validReferrals: 0,
          pendingReferrals: 0,
          currentBalance: 0,
          referralUrl: null
        });
        setReferralList([]);
      }
    });
    
    // Clean up subscription
    return () => unsubscribe();
  }, [fetchWalletData, fetchWithdrawalHistory, fetchTransactionHistory, fetchReferralData]);

  // Context value
  const value = {
    walletBalance,
    referralBalance,
    withdrawalAddress,
    withdrawalAmount,
    setWithdrawalAmount,
    withdrawalHistory,
    transactions,
    referralStats,
    referralList,
    loading,
    error,
    success,
    fetchWalletData,
    fetchWithdrawalHistory,
    fetchTransactionHistory,
    updateWithdrawalAddress,
    requestWithdrawal,
    fetchReferralData,
    generateReferralLink,
    clearMessages
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

/**
 * Custom hook to use the wallet context
 * @returns {Object} Wallet context value
 */
export const useWallet = () => {
  const context = React.useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
