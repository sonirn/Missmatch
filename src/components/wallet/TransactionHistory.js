// src/components/wallet/TransactionHistory.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Loader from '../common/Loader';
import ErrorMessage from '../common/ErrorMessage';
import '../../styles/components/TransactionHistory.css';

/**
 * TransactionHistory Component
 * Displays a history of user's transactions including deposits, withdrawals, and earnings
 */
const TransactionHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactionType, setTransactionType] = useState('all');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  
  // Fetch transaction history when component mounts or filters change
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Combine data from payments, withdrawals, and tournament earnings
        let combinedTransactions = [];
        
        // Helper function to fetch transactions from a collection
        const fetchCollectionTransactions = async (collectionName, options = {}) => {
          const { 
            type, 
            timestampField = 'timestamp',
            detailsKey, 
            amountKey = 'amount', 
            txHashKey, 
            statusKey = 'status' 
          } = options;
          
          const ref = collection(db, collectionName);
          const q = query(
            ref,
            where('userId', '==', user.uid),
            orderBy(timestampField, 'desc'),
            limit(displayLimit)
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: type,
              amount: data[amountKey],
              status: data[statusKey] || 'completed',
              timestamp: data[timestampField]?.toDate(),
              details: options.details ? options.details(data) : data[detailsKey] || 'N/A',
              txHash: data[txHashKey]
            };
          });
        };
        
        // Fetch payments (deposits)
        const payments = await fetchCollectionTransactions('payments', {
          type: 'deposit',
          details: (data) => {
            return data.type === 'tournament'
              ? `${data.tournamentType === 'mini' ? 'Mini' : 'Grand'} Tournament Entry` 
              : `Booster Purchase (${data.boosterType})`;
          },
          txHashKey: 'txHash'
        });
        combinedTransactions = [...combinedTransactions, ...payments];
        
        // Fetch withdrawals
        const withdrawals = await fetchCollectionTransactions('withdrawals', {
          type: 'withdrawal',
          timestampField: 'createdAt',
          details: (data) => `Withdrawal to ${data.walletAddress.substring(0, 6)}...${data.walletAddress.substring(38)}`,
          txHashKey: 'txHash'
        });
        combinedTransactions = [...combinedTransactions, ...withdrawals];
        
        // Fetch tournament earnings
        const earnings = await fetchCollectionTransactions('earnings', {
          type: 'earning',
          details: (data) => {
            return data.source === 'tournament'
              ? `${data.tournamentType === 'mini' ? 'Mini' : 'Grand'} Tournament Prize (Rank ${data.rank})` 
              : 'Referral Earnings';
          }
        });
        combinedTransactions = [...combinedTransactions, ...earnings];
        
        // Sort all transactions by timestamp (newest first)
        combinedTransactions.sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return b.timestamp - a.timestamp;
        });
        
        // Filter by transaction type if needed
        const filteredTransactions = transactionType === 'all' 
          ? combinedTransactions 
          : combinedTransactions.filter(tx => tx.type === transactionType);
        
        // Limit the number of transactions to display
        const limitedTransactions = filteredTransactions.slice(0, displayLimit);
        
        setTransactions(limitedTransactions);
        setHasMore(limitedTransactions.length < filteredTransactions.length);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching transaction history:', err);
        setError('Failed to load transaction history. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [user, transactionType, displayLimit]);
  
  // Handle transaction type filter change
  const handleTypeChange = (type) => {
    setTransactionType(type);
    setDisplayLimit(10); // Reset limit when changing filters
  };
  
  // Load more transactions
  const handleLoadMore = () => {
    setDisplayLimit(prevLimit => prevLimit + 10);
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };
  
  // Get transaction type icon
  const getTransactionTypeIcon = (type) => {
    switch (type) {
      case 'deposit':
        return '↓';
      case 'withdrawal':
        return '↑';
      case 'earning':
        return '★';
      default:
        return '';
    }
  };
  
  // Get amount class (positive or negative)
  const getAmountClass = (type) => {
    switch (type) {
      case 'deposit':
      case 'withdrawal':
        return 'amount-negative';
      case 'earning':
        return 'amount-positive';
      default:
        return '';
    }
  };
  
  // Format amount with sign
  const formatAmount = (amount, type) => {
    if (type === 'deposit' || type === 'withdrawal') {
      return `-${amount.toFixed(2)}`;
    } else {
      return `+${amount.toFixed(2)}`;
    }
  };
  
  // Render loading state when initially fetching data
  if (loading && transactions.length === 0) {
    return <Loader message="Loading transaction history..." />;
  }
  
  // Render error state
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  // Require authentication
  if (!user) {
    return <ErrorMessage message="Please sign in to view your transaction history." />;
  }
  
  return (
    <div className="transaction-history-container">
      <div className="transaction-history-header">
        <h2>Transaction History</h2>
        <div className="transaction-filters">
          <button 
            className={`filter-button ${transactionType === 'all' ? 'active' : ''}`}
            onClick={() => handleTypeChange('all')}
          >
            All
          </button>
          <button 
            className={`filter-button ${transactionType === 'deposit' ? 'active' : ''}`}
            onClick={() => handleTypeChange('deposit')}
          >
            Deposits
          </button>
          <button 
            className={`filter-button ${transactionType === 'withdrawal' ? 'active' : ''}`}
            onClick={() => handleTypeChange('withdrawal')}
          >
            Withdrawals
          </button>
          <button 
            className={`filter-button ${transactionType === 'earning' ? 'active' : ''}`}
            onClick={() => handleTypeChange('earning')}
          >
            Earnings
          </button>
        </div>
      </div>
      
      {transactions.length === 0 ? (
        <div className="no-transactions">
          <p>No transactions found for the selected filter.</p>
          <p>Your transaction history will appear here when you make deposits, withdrawals, or earn rewards.</p>
        </div>
      ) : (
        <>
          <div className="transaction-list">
            {transactions.map((transaction) => (
              <div className="transaction-item" key={transaction.id} data-type={transaction.type}>
                <div className="transaction-icon">
                  <span className={`icon ${transaction.type}`}>
                    {getTransactionTypeIcon(transaction.type)}
                  </span>
                </div>
                <div className="transaction-details">
                  <div className="transaction-primary">
                    <span className="transaction-title">{transaction.details}</span>
                    <span className={`transaction-amount ${getAmountClass(transaction.type)}`}>
                      {formatAmount(transaction.amount, transaction.type)} USDT
                    </span>
                  </div>
                  <div className="transaction-secondary">
                    <span className="transaction-date">{formatDate(transaction.timestamp)}</span>
                    <span className={`transaction-status ${getStatusBadgeClass(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Show loading indicator when fetching more transactions */}
          {loading && <Loader message="Loading more transactions..." />}
          
          {/* Show load more button if there are more transactions */}
          {hasMore && !loading && (
            <div className="load-more-container">
              <button className="load-more-button" onClick={handleLoadMore}>
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TransactionHistory;
