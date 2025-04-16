// src/hooks/useBooster.js
import { useState, useEffect, useCallback } from 'react';
import firebase from '../firebase/config';
import paymentService from '../services/paymentService';
import userService from '../services/userService';

/**
 * Custom hook for managing game boosters
 * @returns {Object} Booster state and functions
 */
const useBooster = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Booster data
  const [boosters, setBoosters] = useState({
    booster1: { active: false, gamesRemaining: 0, multiplier: 2 },
    booster2: { active: false, gamesRemaining: 0, multiplier: 2 },
    booster3: { active: false, multiplier: 2 }
  });
  
  const [boosterPrices, setBoosterPrices] = useState({
    booster1: 10,
    booster2: 50,
    booster3: 100
  });
  
  const [canPurchaseBoosters, setCanPurchaseBoosters] = useState(false);
  const [boosterPurchaseHistory, setBoosterPurchaseHistory] = useState([]);
  
  /**
   * Fetch booster data including active boosters and purchase history
   */
  const fetchBoosterData = useCallback(async () => {
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
        // Check if user has paid for Grand Tournament (required for boosters)
        const hasPaidGrand = userData.tournaments?.grand?.paid || false;
        setCanPurchaseBoosters(hasPaidGrand);
        
        // Get active boosters
        const userBoosters = userData.boosters || {};
        
        // Initialize booster state
        const boosterState = {
          booster1: {
            active: userBoosters.booster1?.active || false,
            gamesRemaining: userBoosters.booster1?.gamesRemaining || 0,
            multiplier: userBoosters.booster1?.multiplier || 2,
            purchasedAt: userBoosters.booster1?.purchasedAt?.toDate() || null
          },
          booster2: {
            active: userBoosters.booster2?.active || false,
            gamesRemaining: userBoosters.booster2?.gamesRemaining || 0,
            multiplier: userBoosters.booster2?.multiplier || 2,
            purchasedAt: userBoosters.booster2?.purchasedAt?.toDate() || null
          },
          booster3: {
            active: userBoosters.booster3?.active || false,
            multiplier: userBoosters.booster3?.multiplier || 2,
            purchasedAt: userBoosters.booster3?.purchasedAt?.toDate() || null
          }
        };
        
        setBoosters(boosterState);
      }
      
      // Fetch booster prices from settings
      const settingsDoc = await firebase.firestore().collection('settings').doc('prices').get();
      if (settingsDoc.exists) {
        const priceData = settingsDoc.data();
        if (priceData.boosters) {
          setBoosterPrices(priceData.boosters);
        }
      }
      
      // Fetch booster purchase history
      await fetchBoosterPurchaseHistory();
      
    } catch (error) {
      console.error('Error fetching booster data:', error);
      setError('Failed to load booster data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Fetch booster purchase history
   */
  const fetchBoosterPurchaseHistory = useCallback(async () => {
    try {
      // Check if user is authenticated
      const user = firebase.auth().currentUser;
      if (!user) {
        return;
      }
      
      // Get booster purchases from Firestore
      const purchasesSnapshot = await firebase.firestore()
        .collection('payments')
        .where('userId', '==', user.uid)
        .where('type', '==', 'booster_purchase')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      const purchases = [];
      purchasesSnapshot.forEach(doc => {
        const data = doc.data();
        purchases.push({
          id: doc.id,
          boosterType: data.boosterType,
          amount: data.amount,
          currency: data.currency || 'USDT',
          transactionHash: data.transactionHash,
          status: data.status,
          createdAt: data.createdAt?.toDate() || null
        });
      });
      
      setBoosterPurchaseHistory(purchases);
    } catch (error) {
      console.error('Error fetching booster purchase history:', error);
      // Don't set error state here to avoid disrupting the main fetch
    }
  }, []);
  
  /**
   * Purchase a booster
   * @param {string} boosterType - 'booster1', 'booster2', or 'booster3'
   * @returns {Promise<Object>} Purchase result
   */
  const purchaseBooster = useCallback(async (boosterType) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate booster type
      if (!['booster1', 'booster2', 'booster3'].includes(boosterType)) {
        setError('Invalid booster type');
        return { success: false, message: 'Invalid booster type' };
      }
      
      // Check if user can purchase boosters (paid for Grand Tournament)
      if (!canPurchaseBoosters) {
        setError('You must join the Grand Tournament to purchase boosters');
        return { success: false, message: 'You must join the Grand Tournament to purchase boosters' };
      }
      
      // Process payment for booster
      const result = await paymentService.purchaseBooster(boosterType);
      
      if (result.success) {
        // Update booster data
        await fetchBoosterData();
        
        setSuccess(`Successfully purchased ${getBoosterName(boosterType)}!`);
        return result;
      } else {
        setError(result.message || 'Purchase failed. Please try again.');
        return result;
      }
    } catch (error) {
      console.error(`Error purchasing ${boosterType}:`, error);
      setError(error.message || 'Failed to purchase booster');
      return { success: false, message: error.message || 'Failed to purchase booster' };
    } finally {
      setLoading(false);
    }
  }, [canPurchaseBoosters, fetchBoosterData]);
  
  /**
   * Get a user-friendly name for a booster type
   * @param {string} boosterType - 'booster1', 'booster2', or 'booster3'
   * @returns {string} Booster name
   */
  const getBoosterName = useCallback((boosterType) => {
    switch (boosterType) {
      case 'booster1':
        return 'Score Doubler (10 Games)';
      case 'booster2':
        return 'Score Doubler (100 Games)';
      case 'booster3':
        return 'Score Doubler (Unlimited)';
      default:
        return boosterType;
    }
  }, []);
  
  /**
   * Get a description for a booster type
   * @param {string} boosterType - 'booster1', 'booster2', or 'booster3'
   * @returns {string} Booster description
   */
  const getBoosterDescription = useCallback((boosterType) => {
    switch (boosterType) {
      case 'booster1':
        return 'Doubles your score for the next 10 games. Price: 10 USDT.';
      case 'booster2':
        return 'Doubles your score for the next 100 games. Price: 50 USDT.';
      case 'booster3':
        return 'Doubles your score for all games until the tournament ends. Price: 100 USDT.';
      default:
        return '';
    }
  }, []);
  
  /**
   * Calculate the most effective booster to buy based on games remaining
   * @param {number} gamesPlanned - Number of games planned to play
   * @returns {string} Recommended booster type
   */
  const getRecommendedBooster = useCallback((gamesPlanned) => {
    const { booster1, booster2, booster3 } = boosterPrices;
    
    // If unlimited games or more than booster3_price/booster1_price * 10 games
    if (gamesPlanned === Infinity || gamesPlanned > (booster3 / booster1) * 10) {
      return 'booster3';
    }
    
    // If more than booster2_price/booster1_price * 10 games
    if (gamesPlanned > (booster2 / booster1) * 10) {
      return 'booster2';
    }
    
    // Otherwise, booster1 is most cost-effective
    return 'booster1';
  }, [boosterPrices]);
  
  /**
   * Check if a booster is active
   * @param {string} boosterType - 'booster1', 'booster2', or 'booster3'
   * @returns {boolean} Whether the booster is active
   */
  const isBoosterActive = useCallback((boosterType) => {
    const booster = boosters[boosterType];
    if (!booster) return false;
    
    if (!booster.active) return false;
    
    // For booster1 and booster2, check games remaining
    if ((boosterType === 'booster1' || boosterType === 'booster2') && booster.gamesRemaining <= 0) {
      return false;
    }
    
    return true;
  }, [boosters]);
  
  /**
   * Get the current active booster (if any)
   * @returns {Object|null} Active booster info or null
   */
  const getActiveBooster = useCallback(() => {
    // Check in priority order: booster3, booster2, booster1
    if (isBoosterActive('booster3')) {
      return {
        type: 'booster3',
        name: getBoosterName('booster3'),
        multiplier: boosters.booster3.multiplier,
        gamesRemaining: 'Unlimited'
      };
    }
    
    if (isBoosterActive('booster2')) {
      return {
        type: 'booster2',
        name: getBoosterName('booster2'),
        multiplier: boosters.booster2.multiplier,
        gamesRemaining: boosters.booster2.gamesRemaining
      };
    }
    
    if (isBoosterActive('booster1')) {
      return {
        type: 'booster1',
        name: getBoosterName('booster1'),
        multiplier: boosters.booster1.multiplier,
        gamesRemaining: boosters.booster1.gamesRemaining
      };
    }
    
    return null;
  }, [boosters, isBoosterActive, getBoosterName]);
  
  /**
   * Clear success and error messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  
  // Fetch booster data on mount and when auth state changes
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      if (user) {
        fetchBoosterData();
      } else {
        // Reset state when user logs out
        setBoosters({
          booster1: { active: false, gamesRemaining: 0, multiplier: 2 },
          booster2: { active: false, gamesRemaining: 0, multiplier: 2 },
          booster3: { active: false, multiplier: 2 }
        });
        setCanPurchaseBoosters(false);
        setBoosterPurchaseHistory([]);
      }
    });
    
    return () => unsubscribe();
  }, [fetchBoosterData]);
  
  return {
    loading,
    error,
    success,
    boosters,
    boosterPrices,
    canPurchaseBoosters,
    boosterPurchaseHistory,
    fetchBoosterData,
    fetchBoosterPurchaseHistory,
    purchaseBooster,
    getBoosterName,
    getBoosterDescription,
    getRecommendedBooster,
    isBoosterActive,
    getActiveBooster,
    clearMessages
  };
};

export default useBooster;
