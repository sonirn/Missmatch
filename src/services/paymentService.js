// src/services/paymentService.js
import { ethers } from 'ethers';
import firebase from '../firebase/config';
import { PAYMENT_CONFIG } from '../config/payment-config';

// ABI for BEP20 USDT Token
const USDT_ABI = [
  // Standard ERC20/BEP20 functions we need
  "function transfer(address to, uint256 value) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

// BEP20 USDT Token Contract Address on BSC
const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955'; // BSC USDT

class PaymentService {
  constructor() {
    this.db = firebase.firestore();
    this.receivingAddress = PAYMENT_CONFIG.RECEIVING_ADDRESS;
    this.entryFees = PAYMENT_CONFIG.ENTRY_FEES;
    this.boosterPrices = PAYMENT_CONFIG.BOOSTER_PRICES;
  }

  // Initialize Web3 connection with user's wallet
  async initWeb3() {
    if (window.ethereum) {
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        this.userAddress = await this.signer.getAddress();
        
        // Check if we're on BSC
        const network = await this.provider.getNetwork();
        if (network.chainId !== 56) { // BSC Mainnet
          throw new Error('Please connect to Binance Smart Chain network');
        }
        
        // Initialize USDT contract
        this.usdtContract = new ethers.Contract(
          USDT_CONTRACT_ADDRESS,
          USDT_ABI,
          this.signer
        );
        
        return true;
      } catch (error) {
        console.error('Error initializing Web3:', error);
        throw error;
      }
    } else {
      throw new Error('Please install MetaMask or another Web3 wallet');
    }
  }

  // Pay tournament entry fee
  async payTournamentFee(tournamentType) {
    try {
      await this.initWeb3();
      
      // Get fee amount based on tournament type
      const feeAmount = this.entryFees[tournamentType];
      if (!feeAmount) {
        throw new Error('Invalid tournament type');
      }
      
      // Convert USDT amount to wei (USDT has 18 decimals on BSC)
      const amountInWei = ethers.utils.parseUnits(feeAmount.toString(), 18);
      
      // Execute the transaction
      const tx = await this.usdtContract.transfer(
        this.receivingAddress,
        amountInWei
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Store payment information in Firestore
      await this.recordPayment(tournamentType, feeAmount, receipt.transactionHash);
      
      // Update user's tournament participation status
      await this.updateTournamentStatus(tournamentType);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        message: `Successfully paid ${feeAmount} USDT for ${tournamentType} tournament entry`
      };
    } catch (error) {
      console.error('Payment error:', error);
      return {
        success: false,
        message: error.message || 'Payment failed. Please try again.'
      };
    }
  }

  // Purchase a booster
  async purchaseBooster(boosterType) {
    try {
      await this.initWeb3();
      
      // Get booster price
      const price = this.boosterPrices[boosterType];
      if (!price) {
        throw new Error('Invalid booster type');
      }
      
      // Convert USDT amount to wei (USDT has 18 decimals on BSC)
      const amountInWei = ethers.utils.parseUnits(price.toString(), 18);
      
      // Execute the transaction
      const tx = await this.usdtContract.transfer(
        this.receivingAddress,
        amountInWei
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Store payment information in Firestore
      await this.recordBoosterPurchase(boosterType, price, receipt.transactionHash);
      
      // Apply booster to user account
      await this.applyBooster(boosterType);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        message: `Successfully purchased ${boosterType} for ${price} USDT`
      };
    } catch (error) {
      console.error('Booster purchase error:', error);
      return {
        success: false,
        message: error.message || 'Booster purchase failed. Please try again.'
      };
    }
  }

  // Record payment in Firestore
  async recordPayment(tournamentType, amount, transactionHash) {
    try {
      const userId = firebase.auth().currentUser.uid;
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
      
      await this.db.collection('payments').add({
        userId,
        type: 'tournament_entry',
        tournamentType,
        amount,
        currency: 'USDT',
        network: 'BEP20',
        transactionHash,
        status: 'completed',
        createdAt: timestamp
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  // Record booster purchase in Firestore
  async recordBoosterPurchase(boosterType, amount, transactionHash) {
    try {
      const userId = firebase.auth().currentUser.uid;
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
      
      await this.db.collection('payments').add({
        userId,
        type: 'booster_purchase',
        boosterType,
        amount,
        currency: 'USDT',
        network: 'BEP20',
        transactionHash,
        status: 'completed',
        createdAt: timestamp
      });
    } catch (error) {
      console.error('Error recording booster purchase:', error);
      throw error;
    }
  }

  // Update user's tournament participation status
  async updateTournamentStatus(tournamentType) {
    try {
      const userId = firebase.auth().currentUser.uid;
      
      await this.db.collection('users').doc(userId).set({
        tournaments: {
          [tournamentType]: {
            paid: true,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
          }
        }
      }, { merge: true });
      
      // If this user was referred, mark their referral as valid
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData && userData.referredBy) {
        await this.validateReferral(userData.referredBy, userId);
      }
    } catch (error) {
      console.error('Error updating tournament status:', error);
      throw error;
    }
  }

  // Apply booster to user account
  async applyBooster(boosterType) {
    try {
      const userId = firebase.auth().currentUser.uid;
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
      
      // Define booster effects based on type
      let boosterEffect = {};
      
      switch (boosterType) {
        case 'booster1':
          boosterEffect = {
            type: 'score_multiplier',
            multiplier: 2,
            gamesRemaining: 10,
            expiresAt: null
          };
          break;
        case 'booster2':
          boosterEffect = {
            type: 'score_multiplier',
            multiplier: 2,
            gamesRemaining: 100,
            expiresAt: null
          };
          break;
        case 'booster3':
          boosterEffect = {
            type: 'score_multiplier',
            multiplier: 2,
            gamesRemaining: null, // Unlimited games
            expiresAt: null // Valid until tournament ends
          };
          break;
        default:
          throw new Error('Invalid booster type');
      }
      
      // Add booster to user's account
      await this.db.collection('users').doc(userId).set({
        boosters: {
          [boosterType]: {
            ...boosterEffect,
            purchasedAt: timestamp,
            active: true
          }
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error applying booster:', error);
      throw error;
    }
  }

  // Validate a referral after payment
  async validateReferral(referrerId, referredUserId) {
    try {
      // Mark this referral as valid
      await this.db.collection('referrals').doc(`${referrerId}_${referredUserId}`).set({
        referrerId,
        referredUserId,
        status: 'valid',
        validatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      // Update referrer's pending balance
      await this.db.collection('users').doc(referrerId).set({
        referralBalance: firebase.firestore.FieldValue.increment(1) // Add 1 USDT
      }, { merge: true });
    } catch (error) {
      console.error('Error validating referral:', error);
      throw error;
    }
  }
  
  // Verify if a transaction was successful by checking the blockchain
  async verifyTransaction(transactionHash) {
    try {
      await this.initWeb3();
      
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
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
  }
}

export default new PaymentService();
