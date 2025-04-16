// src/hooks/useWallet.js
import { useState, useEffect, useCallback } from 'react';
import firebase from '../firebase/config';
import userService from '../services/userService';
import referralService from '../services/referralService';

/**
 * Custom hook for managing wallet functionality including balance,
 * withdrawals, transactions, and referrals
 * @returns {Object} Wallet state and functions
 */
const useWallet = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Wallet data
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralBalance, setReferralBalance] = useState(0);
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Referral data
  const [referralStats, setReferralStats] = useState({
    referralCode: null,
    totalReferrals: 0,
    validReferrals: 0,
    pendingReferrals: 0,
    currentBalance: 0,
    referralUrl: null
  });
  const [referralList, setReferralList] = useState([]);

  /**
   * Fetch wallet balances and withdrawal address
   */
  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const user = firebase.auth().currentUser;
      if (!user) {
        return;
      }
      
      // Get user document from Firestore
      const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      
      if (userData) {
        setWalletBalance(userData.walletBalance || 0);
        setReferralBalance(userData.referralBalance || 0);
        setWithdrawalAddress(userData.withdrawalAddress || '');
      }
      
      // Fetch withdrawal history
      await fetchWithdrawalHistory();
      
      // Fetch transaction history
      await fetchTransactionHistory();
      
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setError('Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Fetch withdrawal history
   */
  const fetchWithdrawalHistory = useCallback(async () => {
    try {
      // Check if user is authenticated
      const user = firebase.auth().currentUser;
      if (!user) {
        return;
      }
      
      // Get withdrawal history from Firestore
      const withdrawalsSnapshot = await firebase.firestore()
        .collection('withdrawals')
        .where('userId', '==', user.uid)
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
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      // Don't set error state here to avoid disrupting the main fetch
    }
  }, []);
  
  /**
   * Fetch transaction history
   */
  const fetchTransactionHistory = useCallback(async () => {
    try {
      // Get transaction history from service
      const history = await userService.getWalletTransactions(20);
      setTransactions(history);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      // Don't set error state here to avoid disrupting the main fetch
    }
  }, []);
  
  /**
   * Update withdrawal address
   * @param {string} address - BEP20 wallet address
   * @returns {Promise<boolean>} Success status
   */
  const updateWithdrawalAddress = useCallback(async (address) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate address
      if (!address || address.length !== 42 || !address.startsWith('0x')) {
        setError('Please enter a valid BEP20 wallet address');
        return false;
      }
      
      // Update address in user service
      await userService.updateWithdrawalAddress(address);
      
      // Update local state
      setWithdrawalAddress(address);
      setSuccess('Withdrawal address saved successfully');
      return true;
    } catch (error) {
      console.error('Error updating withdrawal address:', error);
      setError(error.message || 'Failed to save withdrawal address');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
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
      const withdrawalAmount = parseFloat(amount);
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        setError('Please enter a valid withdrawal amount');
        return { success: false, message: 'Invalid amount' };
      }
      
      // Check if amount exceeds balance
      if (withdrawalAmount > walletBalance) {
        setError('Withdrawal amount exceeds your available balance');
        return { success: false, message: 'Insufficient balance' };
      }
      
      // Validate address
      if (!address || address.length !== 42 || !address.startsWith('0x')) {
        setError('Please enter a valid BEP20 wallet address');
        return { success: false, message: 'Invalid address' };
      }
      
      // Process withdrawal request
      const result = await userService.requestWithdrawal(withdrawalAmount, address);
      
      if (result.success) {
        // Update local state
        setWalletBalance(prevBalance => prevBalance - withdrawalAmount);
        setSuccess(`Withdrawal request for ${withdrawalAmount} USDT submitted successfully`);
        
        // Refresh withdrawal history
        await fetchWithdrawalHistory();
        await fetchTransactionHistory();
      }
      
      return result;
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      setError(error.message || 'Failed to process withdrawal request');
      return { success: false, message: error.message || 'Failed to process withdrawal' };
    } finally {
      setLoading(false);
    }
  }, [walletBalance, fetchWithdrawalHistory, fetchTransactionHistory]);
  
  /**
   * Fetch referral statistics and list
   */
  const fetchReferralData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const user = firebase.auth().currentUser;
      if (!user) {
        return;
      }
      
      // Get referral stats
      const stats = await referralService.getReferralStats(user.uid);
      setReferralStats(stats);
      
      // Get referral list
      const list = await referralService.getReferralList(user.uid);
      setReferralList(list);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      // Don't set error state here to avoid disrupting the main fetch
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Generate a referral link
   * @returns {Promise<string>} Referral link
   */
  const generateReferralLink = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const user = firebase.auth().currentUser;
      if (!user) {
        setError('Please sign in to generate a referral link');
        return null;
      }
      
      // Generate link
      const link = await referralService.getReferralLink(user.uid);
      
      // Update stats
      await fetchReferralData();
      
      return link;
    } catch (error) {
      console.error('Error generating referral link:', error);
      setError('Failed to generate referral link');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchReferralData]);
  
  /**
   * Clear success and error messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  
  // Fetch wallet data on mount and when auth state changes
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      if (user) {
        fetchWalletData();
        fetchReferralData();
      } else {
        // Reset state when user logs out
        setWalletBalance(0);
        setReferralBalance(0);
        setWithdrawalAddress('');
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
    
    return () => unsubscribe();
  }, [fetchWalletData, fetchReferralData]);
  
  return {
    loading,
    error,
    success,
    walletBalance,
    referralBalance,
    withdrawalAddress,
    withdrawalAmount,
    setWithdrawalAmount,
    withdrawalHistory,
    transactions,
    referralStats,
    referralList,
    fetchWalletData,
    fetchWithdrawalHistory,
    fetchTransactionHistory,
    updateWithdrawalAddress,
    requestWithdrawal,
    fetchReferralData,
    generateReferralLink,
    clearMessages
  };
};

export default useWallet;
