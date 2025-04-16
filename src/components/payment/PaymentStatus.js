// src/components/payment/PaymentStatus.js
import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/components/PaymentStatus.css';

/**
 * PaymentStatus Component
 * Displays the status of a payment transaction
 * 
 * @param {Object} props - Component props
 * @param {string} props.status - 'success', 'error', or 'pending'
 * @param {string} props.message - Status message to display
 * @param {string} props.txHash - Transaction hash
 * @param {number|string} props.amount - Payment amount
 * @param {Date|number|string} props.timestamp - Transaction timestamp
 * @param {Function} props.onClose - Callback function when status is closed
 * @param {Function} props.onRetry - Callback function to retry payment (optional)
 */
const PaymentStatus = ({ 
  status, 
  message, 
  txHash, 
  amount, 
  timestamp, 
  onClose, 
  onRetry 
}) => {
  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp instanceof Date 
      ? timestamp 
      : new Date(timestamp);
      
    return date.toLocaleString();
  };
  
  // Get status icon based on payment status
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'pending':
        return '⟳';
      default:
        return '?';
    }
  };
  
  // Render transaction details if available
  const renderTransactionDetails = () => {
    if (!txHash) return null;
    
    return (
      <div className="transaction-details">
        <h4>Transaction Details</h4>
        <div className="detail-row">
          <span className="detail-label">Transaction Hash:</span>
          <span className="detail-value tx-hash">
            {txHash}
            <a 
              href={`https://bscscan.com/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="view-link"
            >
              View
            </a>
          </span>
        </div>
        {amount && (
          <div className="detail-row">
            <span className="detail-label">Amount:</span>
            <span className="detail-value">{amount} USDT</span>
          </div>
        )}
        {timestamp && (
          <div className="detail-row">
            <span className="detail-label">Timestamp:</span>
            <span className="detail-value">{formatTimestamp(timestamp)}</span>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className={`payment-status ${status}`}>
      <div className="status-header">
        <div className={`status-icon ${status}`}>
          {getStatusIcon()}
        </div>
        <h3 className="status-title">
          {status === 'success' && 'Payment Successful'}
          {status === 'error' && 'Payment Failed'}
          {status === 'pending' && 'Payment Pending'}
        </h3>
      </div>
      
      <div className="status-message">
        {message}
      </div>
      
      {renderTransactionDetails()}
      
      <div className="status-actions">
        {status === 'error' && onRetry && (
          <button 
            className="retry-button"
            onClick={onRetry}
          >
            Try Again
          </button>
        )}
        
        <button 
          className="close-button"
          onClick={onClose}
        >
          {status === 'success' ? 'Continue' : 'Close'}
        </button>
      </div>
    </div>
  );
};

PaymentStatus.propTypes = {
  status: PropTypes.oneOf(['success', 'error', 'pending']).isRequired,
  message: PropTypes.string.isRequired,
  txHash: PropTypes.string,
  amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  timestamp: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.number, PropTypes.string]),
  onClose: PropTypes.func.isRequired,
  onRetry: PropTypes.func
};

export default PaymentStatus;
