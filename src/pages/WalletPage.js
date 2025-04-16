// src/pages/WalletPage.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import Balance from '../components/wallet/Balance';
import TransactionHistory from '../components/wallet/TransactionHistory';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/pages/WalletPage.css';

/**
 * WalletPage Component
 * Comprehensive wallet management page with balance, transactions, and withdrawals
 * Allows users to view their balance, transaction history, and withdraw funds
 */
const WalletPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('balance');
  
  // Fetch user wallet data when component mounts or user changes
  useEffect(() => {
    const fetchWalletData = async () => {
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
        console.error('Error fetching wallet data:', err);
        setError('Failed to load wallet data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchWalletData();
  }, [user]);
  
  // Handle tab change between balance and transaction history
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // Format currency with 2 decimal places and handle null/undefined values
  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };
  
  // Show loader while fetching data
  if (loading) {
    return <Loader message="Loading wallet information..." />;
  }
  
  // Show error message if something went wrong
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  // Require authentication to access wallet
  if (!user) {
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please sign in to access your wallet.</p>
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
    <div className="wallet-page-container">
      {/* SEO Optimization */}
      <Helmet>
        <title>Dino Runner - Wallet</title>
        <meta name="description" content="Manage your Dino Runner wallet. View balance, transaction history, and withdraw funds." />
      </Helmet>
      
      {/* Page Header */}
      <div className="wallet-page-header">
        <h1>Your Wallet</h1>
        <p className="wallet-subtitle">
          Manage your balance, view transactions, and withdraw funds
        </p>
      </div>
      
      {/* Wallet Summary */}
      <div className="wallet-summary">
        <div className="summary-card main-balance">
          <div className="summary-title">Main Balance</div>
          <div className="summary-amount">{formatCurrency(userData?.balance)} USDT</div>
          <div className="summary-description">Available for withdrawal</div>
        </div>
        <div className="summary-card pending-withdrawals">
          <div className="summary-title">Pending Withdrawals</div>
          <div className="summary-amount">{formatCurrency(userData?.pendingWithdrawal)} USDT</div>
          <div className="summary-description">Being processed</div>
        </div>
        <div className="summary-card total-withdrawn">
          <div className="summary-title">Total Withdrawn</div>
          <div className="summary-amount">{formatCurrency(userData?.totalWithdrawn)} USDT</div>
          <div className="summary-description">All-time withdrawals</div>
        </div>
        <div className="summary-card referral-balance">
          <div className="summary-title">Referral Balance</div>
          <div className="summary-amount">{formatCurrency(userData?.referralBalance)} USDT</div>
          <div className="summary-description">Pending referral earnings</div>
        </div>
      </div>
      
      {/* Wallet Navigation */}
      <div className="wallet-navigation">
        <button 
          className={`nav-button ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => handleTabChange('balance')}
        >
          Balance & Withdrawals
        </button>
        <button 
          className={`nav-button ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => handleTabChange('transactions')}
        >
          Transaction History
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'balance' && (
          <div className="balance-tab">
            <Balance />
          </div>
        )}
        
        {activeTab === 'transactions' && (
          <div className="transactions-tab">
            <TransactionHistory />
          </div>
        )}
      </div>
      
      {/* Wallet Info Section */}
      <div className="wallet-info-section">
        <h2>Wallet Information</h2>
        <div className="info-cards">
          <div className="info-card">
            <div className="info-icon">💰</div>
            <h3>Earning USDT</h3>
            <p>Earn USDT by winning tournaments, referring friends, or receiving other rewards on the platform.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">💸</div>
            <h3>Withdrawals</h3>
            <p>Withdraw your USDT to any BEP20-compatible wallet. Minimum withdrawal amount is 10 USDT.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">⏱️</div>
            <h3>Processing Time</h3>
            <p>Withdrawals are typically processed within 24-48 hours after request submission.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">🔐</div>
            <h3>Security</h3>
            <p>Always verify your withdrawal address carefully. Funds sent to incorrect addresses cannot be recovered.</p>
          </div>
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="wallet-faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-items">
          <div className="faq-item">
            <h3>How do I earn USDT?</h3>
            <p>You can earn USDT by winning tournaments, referring friends who register for tournaments, or through other promotional events on the platform.</p>
          </div>
          <div className="faq-item">
            <h3>What is the minimum withdrawal amount?</h3>
            <p>The minimum withdrawal amount is 10 USDT.</p>
          </div>
          <div className="faq-item">
            <h3>How long do withdrawals take to process?</h3>
            <p>Withdrawals are typically processed within 24-48 hours after request submission.</p>
          </div>
          <div className="faq-item">
            <h3>Which network is used for withdrawals?</h3>
            <p>All withdrawals are processed on the BEP20 (Binance Smart Chain) network. Make sure your wallet supports this network before withdrawing.</p>
          </div>
          <div className="faq-item">
            <h3>Are there any withdrawal fees?</h3>
            <p>There are no platform fees for withdrawals. However, blockchain network fees may apply.</p>
          </div>
          <div className="faq-item">
            <h3>How can I check my transaction history?</h3>
            <p>Your transaction history, including deposits, withdrawals, and earnings, can be viewed in the "Transaction History" tab.</p>
          </div>
        </div>
      </div>
      
      {/* Support Section */}
      <div className="wallet-support-section">
        <h2>Need Help?</h2>
        <p>If you have any questions or issues with your wallet, please contact our support team.</p>
        <button 
          className="support-button"
          onClick={() => window.location.href = 'mailto:support@dinorunner.com'}
        >
          Contact Support
        </button>
      </div>
    </div>
  );
};

export default WalletPage;
