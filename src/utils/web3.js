// src/utils/web3.js
import { ethers } from 'ethers';

/**
 * Utility functions for interacting with the Binance Smart Chain (BSC)
 * and handling BEP20 transactions for the tournament platform
 */

// Configuration for Binance Smart Chain
const BSC_CONFIG = {
  chainId: '0x38', // 56 in decimal
  chainName: 'Binance Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com']
};

// ABI for BEP20 USDT Token
const USDT_ABI = [
  "function transfer(address to, uint256 value) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 value) external returns (bool)"
];

// BEP20 USDT Token Contract Address on BSC
const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// Module state
let provider;
let signer;
let usdtContract;

/**
 * Initialize Web3 provider and signer
 * @returns {Promise<Object>} Provider and signer objects
 */
export const initWeb3 = async () => {
  if (!window.ethereum) {
    throw new Error('Ethereum provider not found. Please install MetaMask or another Web3 wallet.');
  }

  try {
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    // Initialize provider and signer
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    // Check if connected to Binance Smart Chain
    const network = await provider.getNetwork();
    if (network.chainId !== 56) { // 56 is the chainId for BSC mainnet
      throw new Error('Please connect to Binance Smart Chain.');
    }

    // Initialize USDT contract
    usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);

    return { provider, signer };
  } catch (error) {
    console.error('Error initializing Web3:', error);
    throw error;
  }
};

/**
 * Get connected wallet address
 * @returns {Promise<string>} Wallet address
 */
export const getWalletAddress = async () => {
  if (!signer) {
    await initWeb3();
  }
  return await signer.getAddress();
};

/**
 * Get network information
 * @returns {Promise<Object>} Network information
 */
export const getNetwork = async () => {
  if (!provider) {
    await initWeb3();
  }
  return await provider.getNetwork();
};

/**
 * Check if connected to the correct network (BSC)
 * @returns {Promise<boolean>} Whether connected to BSC
 */
export const isConnectedToBSC = async () => {
  try {
    const network = await getNetwork();
    return network.chainId === 56;
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
};

/**
 * Switch network to Binance Smart Chain
 * @returns {Promise<void>}
 */
export const switchToBSC = async () => {
  if (!window.ethereum) {
    throw new Error('Ethereum provider not found. Please install MetaMask.');
  }

  try {
    // Try to switch to BSC
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }] // 0x38 is the hexadecimal value of 56
      });
    } catch (switchError) {
      // If the chain hasn't been added to MetaMask, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [BSC_CONFIG]
        });
      } else {
        throw switchError;
      }
    }
  } catch (error) {
    console.error('Error switching to BSC:', error);
    throw error;
  }
};

/**
 * Send USDT transaction
 * @param {string} to - Recipient address
 * @param {number} amount - Amount in USDT
 * @returns {Promise<string>} Transaction hash
 */
export const sendUSDT = async (to, amount) => {
  if (!signer || !usdtContract) {
    await initWeb3();
  }

  try {
    // Validate recipient address
    if (!ethers.utils.isAddress(to)) {
      throw new Error('Invalid recipient address');
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Convert amount to correct decimals (USDT has 18 decimals)
    const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);

    // Send transaction
    const tx = await usdtContract.transfer(to, amountInWei);
    const receipt = await tx.wait();
    
    return receipt.transactionHash;
  } catch (error) {
    console.error('Error sending USDT:', error);
    throw error;
  }
};

/**
 * Get USDT balance of an address
 * @param {string} address - Wallet address
 * @returns {Promise<string>} Balance in USDT
 */
export const getUSDTBalance = async (address) => {
  if (!provider || !usdtContract) {
    await initWeb3();
  }

  try {
    // Validate address
    if (!ethers.utils.isAddress(address)) {
      throw new Error('Invalid wallet address');
    }

    const balanceInWei = await usdtContract.balanceOf(address);
    return ethers.utils.formatUnits(balanceInWei, 18);
  } catch (error) {
    console.error('Error fetching USDT balance:', error);
    throw error;
  }
};

/**
 * Sign a message with the user's wallet
 * @param {string} message - Message to sign
 * @returns {Promise<string>} Signature
 */
export const signMessage = async (message) => {
  if (!signer) {
    await initWeb3();
  }

  try {
    return await signer.signMessage(message);
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
};

/**
 * Verify a signature
 * @param {string} message - Message that was signed
 * @param {string} signature - Signature to verify
 * @param {string} address - Address of the signer
 * @returns {boolean} Whether the signature is valid
 */
export const verifySignature = (message, signature, address) => {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
};

/**
 * Verify a transaction receipt
 * @param {string} txHash - Transaction hash
 * @returns {Promise<Object>} Verification result
 */
export const verifyTransaction = async (txHash) => {
  if (!provider) {
    await initWeb3();
  }

  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return { verified: false, message: 'Transaction not found' };
    }
    
    if (receipt.status === 1) {
      return { verified: true, message: 'Transaction verified successfully' };
    } else {
      return { verified: false, message: 'Transaction failed on the blockchain' };
    }
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return { verified: false, message: error.message };
  }
};
