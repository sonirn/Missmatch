// src/game-integration/boosterApplier.js
import { useState, useEffect, useCallback } from 'react';
import userService from '../services/userService';

/**
 * Booster configuration for the dinosaur game tournament
 * Defines properties for each booster type
 */
const BOOSTER_CONFIG = {
  booster1: {
    name: 'Score Doubler (10 Games)',
    description: 'Doubles your score for the next 10 games. Price: 10 USDT.',
    defaultMultiplier: 2,
    defaultGames: 10,
    price: 10
  },
  booster2: {
    name: 'Score Doubler (100 Games)',
    description: 'Doubles your score for the next 100 games. Price: 50 USDT.',
    defaultMultiplier: 2,
    defaultGames: 100,
    price: 50
  },
  booster3: {
    name: 'Score Doubler (Unlimited)',
    description: 'Doubles your score for all games until the tournament ends. Price: 100 USDT.',
    defaultMultiplier: 2,
    defaultGames: Infinity,
    price: 100
  }
};

/**
 * Apply a booster to a score
 * Direct utility function that can be used without the hook
 * 
 * @param {number} score - Original score to boost
 * @param {number} multiplier - Multiplier to apply
 * @returns {number} Boosted score
 */
export const applyBooster = (score, multiplier = 1) => {
  if (!score || isNaN(score) || score <= 0 || !multiplier || multiplier <= 0) {
    return score;
  }
  
  // Apply multiplier and round to integer
  return Math.round(score * multiplier);
};

/**
 * Get booster description based on type
 * 
 * @param {string} boosterType - Type of booster
 * @returns {string} Booster description
 */
export const getBoosterDescription = (boosterType) => {
  return BOOSTER_CONFIG[boosterType]?.description || 'Unknown booster type';
};

/**
 * Calculate the most cost-effective booster based on number of games planned
 * 
 * @param {number} gamesPlanned - Number of games user plans to play
 * @returns {string} Recommended booster type
 */
export const getRecommendedBooster = (gamesPlanned) => {
  // If playing more than 200 games, booster3 is most cost-effective
  if (gamesPlanned > 200) {
    return 'booster3';
  }
  
  // If playing more than 20 games, booster2 is most cost-effective
  if (gamesPlanned > 20) {
    return 'booster2';
  }
  
  // Otherwise, booster1 is most cost-effective
  return 'booster1';
};

/**
 * Custom hook for managing and applying boosters
 * Provides a complete API for booster management in the game
 * 
 * @returns {Object} Booster functions and state
 */
export const useBoosterApplier = () => {
  // Booster state
  const [boosterState, setBoosterState] = useState({
    active: false,
    type: null,
    multiplier: 1,
    gamesRemaining: 0,
    appliedToCurrentGame: false,
    purchasedAt: null
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Initialize boosters for the current user
   * Fetches active boosters from the user service
   * 
   * @returns {Promise<Object>} Active booster state
   */
  const initBoosters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reset booster state
      resetBoosterState();
      
      // Get active boosters from user service
      const activeBoosters = await userService.getActiveBoosters();
      
      // Check if any boosters are active
      if (Object.keys(activeBoosters).length === 0) {
        return { active: false, multiplier: 1 };
      }
      
      // Apply the most powerful booster (priority: booster3, booster2, booster1)
      if (activeBoosters.booster3) {
        applyBooster3(activeBoosters.booster3.multiplier);
        return {
          active: true,
          type: 'booster3',
          multiplier: activeBoosters.booster3.multiplier,
          gamesRemaining: Infinity,
          purchasedAt: activeBoosters.booster3.purchasedAt
        };
      } 
      
      if (activeBoosters.booster2 && activeBoosters.booster2.gamesRemaining > 0) {
        applyBooster2(
          activeBoosters.booster2.multiplier, 
          activeBoosters.booster2.gamesRemaining
        );
        return {
          active: true,
          type: 'booster2',
          multiplier: activeBoosters.booster2.multiplier,
          gamesRemaining: activeBoosters.booster2.gamesRemaining,
          purchasedAt: activeBoosters.booster2.purchasedAt
        };
      } 
      
      if (activeBoosters.booster1 && activeBoosters.booster1.gamesRemaining > 0) {
        applyBooster1(
          activeBoosters.booster1.multiplier, 
          activeBoosters.booster1.gamesRemaining
        );
        return {
          active: true,
          type: 'booster1',
          multiplier: activeBoosters.booster1.multiplier,
          gamesRemaining: activeBoosters.booster1.gamesRemaining,
          purchasedAt: activeBoosters.booster1.purchasedAt
        };
      }
      
      return { active: false, multiplier: 1 };
    } catch (error) {
      console.error('Error initializing boosters:', error);
      setError('Failed to initialize boosters');
      resetBoosterState();
      return { active: false, multiplier: 1 };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reset booster state to default values
   */
  const resetBoosterState = useCallback(() => {
    setBoosterState({
      active: false,
      type: null,
      multiplier: 1,
      gamesRemaining: 0,
      appliedToCurrentGame: false,
      purchasedAt: null
    });
  }, []);

  /**
   * Apply booster1 (10 games)
   * 
   * @param {number} multiplier - Score multiplier
   * @param {number} gamesRemaining - Number of games remaining
   */
  const applyBooster1 = useCallback((multiplier = 2, gamesRemaining = 10) => {
    setBoosterState({
      active: true,
      type: 'booster1',
      multiplier: multiplier,
      gamesRemaining: gamesRemaining,
      appliedToCurrentGame: false,
      purchasedAt: new Date()
    });
    
    console.log(`Booster1 applied with ${multiplier}x multiplier for ${gamesRemaining} games`);
  }, []);

  /**
   * Apply booster2 (100 games)
   * 
   * @param {number} multiplier - Score multiplier
   * @param {number} gamesRemaining - Number of games remaining
   */
  const applyBooster2 = useCallback((multiplier = 2, gamesRemaining = 100) => {
    setBoosterState({
      active: true,
      type: 'booster2',
      multiplier: multiplier,
      gamesRemaining: gamesRemaining,
      appliedToCurrentGame: false,
      purchasedAt: new Date()
    });
    
    console.log(`Booster2 applied with ${multiplier}x multiplier for ${gamesRemaining} games`);
  }, []);

  /**
   * Apply booster3 (unlimited games)
   * 
   * @param {number} multiplier - Score multiplier
   */
  const applyBooster3 = useCallback((multiplier = 2) => {
    setBoosterState({
      active: true,
      type: 'booster3',
      multiplier: multiplier,
      gamesRemaining: Infinity,
      appliedToCurrentGame: false,
      purchasedAt: new Date()
    });
    
    console.log(`Booster3 applied with ${multiplier}x multiplier for unlimited games`);
  }, []);

  /**
   * Apply booster to a score value
   * 
   * @param {number} score - Original score
   * @returns {number} Boosted score
   */
  const boostScore = useCallback((score) => {
    // If no active booster or no games remaining, return original score
    if (!boosterState.active || boosterState.gamesRemaining <= 0) {
      return score;
    }
    
    // Apply booster multiplier
    return applyBooster(score, boosterState.multiplier);
  }, [boosterState]);

  /**
   * Mark booster as used for current game
   * This should be called when a game ends
   * 
   * @returns {Object} Updated booster state
   */
  const markBoosterUsed = useCallback(() => {
    // If no active booster or already applied to current game, do nothing
    if (!boosterState.active || boosterState.appliedToCurrentGame) {
      return boosterState;
    }
    
    setBoosterState(prevState => {
      // Mark as applied to current game
      const newState = {
        ...prevState,
        appliedToCurrentGame: true
      };
      
      // Decrement games remaining if not unlimited
      if (prevState.gamesRemaining !== Infinity) {
        newState.gamesRemaining = prevState.gamesRemaining - 1;
        
        // Deactivate booster if no games remaining
        if (newState.gamesRemaining <= 0) {
          newState.active = false;
          newState.type = null;
        }
      }
      
      return newState;
    });
    
    return boosterState;
  }, [boosterState]);

  /**
   * Reset for new game
   * This should be called when a new game starts
   */
  const resetForNewGame = useCallback(() => {
    // Reset applied flag
    setBoosterState(prevState => ({
      ...prevState,
      appliedToCurrentGame: false
    }));
  }, []);

  /**
   * Get active booster information
   * 
   * @returns {Object|null} Active booster info or null if no active booster
   */
  const getActiveBooster = useCallback(() => {
    if (!boosterState.active) {
      return null;
    }
    
    return {
      type: boosterState.type,
      multiplier: boosterState.multiplier,
      gamesRemaining: boosterState.gamesRemaining === Infinity ? 'Unlimited' : boosterState.gamesRemaining,
      name: getBoosterName(boosterState.type),
      purchasedAt: boosterState.purchasedAt
    };
  }, [boosterState]);

  /**
   * Get booster name from type
   * 
   * @param {string} type - Booster type
   * @returns {string} Booster name
   */
  const getBoosterName = useCallback((type) => {
    return BOOSTER_CONFIG[type]?.name || type;
  }, []);

  /**
   * Check if the current user has any active boosters
   * 
   * @returns {boolean} Whether user has active boosters
   */
  const hasActiveBooster = useCallback(() => {
    return boosterState.active && boosterState.gamesRemaining > 0;
  }, [boosterState]);

  /**
   * Get the current multiplier value
   * 
   * @returns {number} Current multiplier
   */
  const getCurrentMultiplier = useCallback(() => {
    return boosterState.active ? boosterState.multiplier : 1;
  }, [boosterState]);

  /**
   * Sync booster state with database
   * This should be called after a game ends to update the database
   * 
   * @returns {Promise<boolean>} Success status
   */
  const syncBoosterState = useCallback(async () => {
    try {
      // If no booster is active or it's unlimited, no need to sync
      if (!boosterState.active || boosterState.type === 'booster3') {
        return true;
      }
      
      // If games remaining is 0, deactivate the booster
      if (boosterState.gamesRemaining <= 0) {
        // TODO: Implement service call to update booster status in database
        console.log(`Deactivating ${boosterState.type} as games remaining is 0`);
        
        // Reset booster state
        resetBoosterState();
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing booster state:', error);
      setError('Failed to sync booster state with database');
      return false;
    }
  }, [boosterState, resetBoosterState]);

  // Initialize boosters on component mount
  useEffect(() => {
    initBoosters();
    
    // Clean up on unmount
    return () => {
      // Sync booster state with database on unmount
      syncBoosterState().catch(console.error);
    };
  }, [initBoosters, syncBoosterState]);

  return {
    boosterState,
    loading,
    error,
    initBoosters,
    resetBoosterState,
    applyBooster1,
    applyBooster2,
    applyBooster3,
    boostScore,
    markBoosterUsed,
    resetForNewGame,
    getActiveBooster,
    getBoosterName,
    hasActiveBooster,
    getCurrentMultiplier,
    syncBoosterState
  };
};

export default useBoosterApplier;
