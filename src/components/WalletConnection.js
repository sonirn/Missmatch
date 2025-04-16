// src/components/WalletConnection.js
import React, { useState, useEffect } from 'react';
import { 
  initWeb3, 
  getWalletAddress, 
  getUSDTBalance, 
  isConnectedToBSC, 
  switchToBSC 
} from '../utils/web3';
import { handleAsyncError } from '../utils/errorHandler';
import '../styles/components/blockchain.css';

const WalletConnection = () => {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Format address for display
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Connect wallet
  const connectWallet = handleAsyncError(async () => {
    await initWeb3();
    const walletAddress = await getWalletAddress();
    setAddress(walletAddress);
    setIsConnected(true);
    
    // Check if on BSC
    const onBSC = await isConnectedToBSC();
    setIsCorrectNetwork(onBSC);
    
    if (onBSC) {
      const usdtBalance = await getUSDTBalance(walletAddress);
      setBalance(usdtBalance);
    }
  }, setError, setLoading, 'Wallet Connection');

  // Switch to BSC
  const handleSwitchNetwork = handleAsyncError(async () => {
    await switchToBSC();
    setIsCorrectNetwork(true);
    
    // Update balance after switching
    const walletAddress = await getWalletAddress();
    const usdtBalance = await getUSDTBalance(walletAddress);
    setBalance(usdtBalance);
  }, setError, setLoading, 'Network Switch');

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if already connected
        if (window.ethereum && window.ethereum.selectedAddress) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    checkConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          // User disconnected
          setIsConnected(false);
          setAddress('');
          setBalance('');
        } else {
          // Account changed, reconnect
          connectWallet();
        }
      });
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return (
    <div className="wallet-container">
      {error && <div className="error-message">{error}</div>}
      
      {!isConnected ? (
        <button 
          className="wallet-connect-button"
          onClick={connectWallet}
          disabled={loading}
        >
          <span className="wallet-icon">💳</span>
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : !isCorrectNetwork ? (
        <div>
          <div className="transaction-status">
            <span className="status-icon status-failed">⚠️</span>
            <span className="status-text">Please connect to Binance Smart Chain</span>
          </div>
          <button 
            className="wallet-connect-button"
            onClick={handleSwitchNetwork}
            disabled={loading}
          >
            {loading ? 'Switching...' : 'Switch to BSC'}
          </button>
        </div>
      ) : (
        <div className="wallet-info">
          <div className="wallet-address">
            {formatAddress(address)}
            <span 
              className="copy-icon" 
              onClick={() => {
                navigator.clipboard.writeText(address);
                alert('Address copied to clipboard!');
              }}
              title="Copy full address"
            >
              📋
            </span>
          </div>
          <div className="wallet-balance">
            Balance: {parseFloat(balance).toFixed(2)} USDT
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnection;
