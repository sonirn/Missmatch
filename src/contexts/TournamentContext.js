// src/contexts/TournamentContext.js
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import firebase from '../firebase/config';
import userService from '../services/userService';
import paymentService from '../services/paymentService';
import { AuthContext } from './AuthContext';
import { handleError } from '../utils/errorHandler';

// Create the context
export const TournamentContext = createContext();

/**
 * TournamentContext Provider component
 * Manages tournament state, rankings, and participation
 */
export const TournamentProvider = ({ children }) => {
  // Access auth context
  const { currentUser, userProfile } = useContext(AuthContext);
  
  // Tournament state
  const [tournamentStatus, setTournamentStatus] = useState({
    mini: { paid: false, joinedAt: null },
    grand: { paid: false, joinedAt: null }
  });
  
  const [tournamentInfo, setTournamentInfo] = useState({
    mini: {
      startDate: null,
      endDate: null,
      status: 'upcoming', // upcoming, active, completed
      prizePool: 10500,
      dinoCoin: 1050,
      entryFee: 1
    },
    grand: {
      startDate: null,
      endDate: null,
      status: 'upcoming', // upcoming, active, completed
      prizePool: 605000,
      dinoCoin: 60500,
      entryFee: 10
    }
  });
  
  const [miniRankings, setMiniRankings] = useState([]);
  const [grandRankings, setGrandRankings] = useState([]);
  const [userRank, setUserRank] = useState({ mini: null, grand: null });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /**
   * Fetch tournament status and information
   * @returns {Promise<Object>} Tournament status
   */
  const fetchTournamentStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      if (!currentUser) {
        return tournamentStatus;
      }
      
      // Get user's tournament participation status
      const status = await userService.getTournamentStatus();
      setTournamentStatus(status);
      
      // Fetch tournament info from Firestore
      const tournamentDoc = await firebase.firestore().collection('settings').doc('tournament').get();
      
      if (tournamentDoc.exists) {
        const data = tournamentDoc.data();
        
        // Update tournament info
        setTournamentInfo({
          mini: {
            startDate: data.miniStartDate?.toDate() || null,
            endDate: data.miniEndDate?.toDate() || null,
            status: data.miniStatus || 'upcoming',
            prizePool: data.miniPrizePool || 10500,
            dinoCoin: data.miniDinoCoin || 1050,
            entryFee: data.miniEntryFee || 1
          },
          grand: {
            startDate: data.grandStartDate?.toDate() || null,
            endDate: data.grandEndDate?.toDate() || null,
            status: data.grandStatus || 'upcoming',
            prizePool: data.grandPrizePool || 605000,
            dinoCoin: data.grandDinoCoin || 60500,
            entryFee: data.grandEntryFee || 10
          }
        });
      }
      
      return status;
    } catch (error) {
      const errorMessage = handleError(error, 'Tournament Status');
      setError(errorMessage);
      return tournamentStatus;
    } finally {
      setLoading(false);
    }
  }, [currentUser, tournamentStatus]);

  /**
   * Pay for tournament entry
   * @param {string} tournamentType - 'mini' or 'grand'
   * @returns {Promise<Object>} Payment result
   */
  const payForTournament = useCallback(async (tournamentType) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate tournament type
      if (tournamentType !== 'mini' && tournamentType !== 'grand') {
        throw new Error('Invalid tournament type');
      }
      
      // Check if already paid
      if (tournamentStatus[tournamentType]?.paid) {
        setSuccess(`You have already joined the ${tournamentType === 'mini' ? 'Mini' : 'Grand'} Tournament`);
        return { success: true, message: `Already joined the ${tournamentType} tournament` };
      }
      
      // Process payment
      const result = await paymentService.payTournamentFee(tournamentType);
      
      if (result.success) {
        // Update tournament status
        await fetchTournamentStatus();
        
        setSuccess(`Successfully joined the ${tournamentType === 'mini' ? 'Mini' : 'Grand'} Tournament!`);
        return result;
      } else {
        setError(result.message || 'Payment failed. Please try again.');
        return result;
      }
    } catch (error) {
      const errorMessage = handleError(error, 'Tournament Payment');
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [tournamentStatus, fetchTournamentStatus]);

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
        throw new Error('Invalid booster type');
      }
      
      // Check if user has paid for Grand Tournament (boosters only work there)
      if (!tournamentStatus.grand?.paid) {
        setError('You must join the Grand Tournament to purchase boosters');
        return { success: false, message: 'You must join the Grand Tournament to purchase boosters' };
      }
      
      // Process booster purchase
      const result = await paymentService.purchaseBooster(boosterType);
      
      if (result.success) {
        setSuccess(`Successfully purchased ${getBoosterName(boosterType)}!`);
        return result;
      } else {
        setError(result.message || 'Purchase failed. Please try again.');
        return result;
      }
    } catch (error) {
      const errorMessage = handleError(error, 'Booster Purchase');
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [tournamentStatus]);

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
   * Fetch tournament rankings
   * @param {string} tournamentType - 'mini' or 'grand'
   * @param {number} limit - Number of rankings to retrieve
   * @returns {Promise<Array>} Tournament rankings
   */
  const fetchTournamentRankings = useCallback(async (tournamentType, limit = 100) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate tournament type
      if (tournamentType !== 'mini' && tournamentType !== 'grand') {
        throw new Error('Invalid tournament type');
      }
      
      // Get rankings from service
      const rankings = await userService.getTournamentRankings(tournamentType, limit);
      
      // Update state based on tournament type
      if (tournamentType === 'mini') {
        setMiniRankings(rankings);
      } else {
        setGrandRankings(rankings);
      }
      
      // Find current user's rank
      if (currentUser) {
        const userRanking = rankings.find(rank => rank.userId === currentUser.uid);
        
        if (userRanking) {
          setUserRank(prev => ({
            ...prev,
            [tournamentType]: userRanking.rank
          }));
        } else {
          setUserRank(prev => ({
            ...prev,
            [tournamentType]: null
          }));
        }
      }
      
      return rankings;
    } catch (error) {
      const errorMessage = handleError(error, 'Tournament Rankings');
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Fetch both tournament rankings
   * @returns {Promise<void>}
   */
  const fetchAllRankings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both rankings in parallel
      await Promise.all([
        fetchTournamentRankings('mini'),
        fetchTournamentRankings('grand')
      ]);
    } catch (error) {
      const errorMessage = handleError(error, 'Tournament Rankings');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchTournamentRankings]);

  /**
   * Calculate potential prize based on current rank
   * @param {string} tournamentType - 'mini' or 'grand'
   * @param {number} rank - Current rank
   * @returns {Object} Potential prize
   */
  const calculatePotentialPrize = useCallback((tournamentType, rank) => {
    if (!rank) return { usdt: 0, dino: 0 };
    
    // Mini tournament prize structure
    if (tournamentType === 'mini') {
      if (rank === 1) return { usdt: 1000, dino: 100 };
      if (rank === 2) return { usdt: 900, dino: 90 };
      if (rank === 3) return { usdt: 800, dino: 80 };
      if (rank === 4) return { usdt: 700, dino: 70 };
      if (rank === 5) return { usdt: 600, dino: 60 };
      if (rank >= 6 && rank <= 10) return { usdt: 400, dino: 40 };
      if (rank >= 11 && rank <= 50) return { usdt: 100, dino: 10 };
      if (rank >= 51 && rank <= 100) return { usdt: 10, dino: 1 };
      return { usdt: 0, dino: 0 };
    }
    
    // Grand tournament prize structure
    if (tournamentType === 'grand') {
      if (rank === 1) return { usdt: 100000, dino: 10000 };
      if (rank === 2) return { usdt: 90000, dino: 9000 };
      if (rank === 3) return { usdt: 80000, dino: 8000 };
      if (rank === 4) return { usdt: 70000, dino: 7000 };
      if (rank === 5) return { usdt: 60000, dino: 6000 };
      if (rank >= 6 && rank <= 10) return { usdt: 30000, dino: 3000 };
      if (rank >= 11 && rank <= 50) return { usdt: 1000, dino: 100 };
      if (rank >= 51 && rank <= 100) return { usdt: 100, dino: 10 };
      if (rank >= 101 && rank <= 10000) return { usdt: 1, dino: 1 };
      return { usdt: 0, dino: 0 };
    }
    
    return { usdt: 0, dino: 0 };
  }, []);

  /**
   * Check if user has active boosters
   * @returns {Promise<Object>} Active boosters
   */
  const getActiveBoosters = useCallback(async () => {
    try {
      if (!currentUser) return {};
      
      return await userService.getActiveBoosters();
    } catch (error) {
      console.error('Error getting active boosters:', error);
      return {};
    }
  }, [currentUser]);

  /**
   * Clear success and error messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Fetch tournament status when user changes
  useEffect(() => {
    if (currentUser) {
      fetchTournamentStatus();
      fetchAllRankings();
    } else {
      // Reset state when user logs out
      setTournamentStatus({
        mini: { paid: false, joinedAt: null },
        grand: { paid: false, joinedAt: null }
      });
      setMiniRankings([]);
      setGrandRankings([]);
      setUserRank({ mini: null, grand: null });
    }
  }, [currentUser, fetchTournamentStatus, fetchAllRankings]);

  // Context value
  const value = {
    tournamentStatus,
    tournamentInfo,
    miniRankings,
    grandRankings,
    userRank,
    loading,
    error,
    success,
    fetchTournamentStatus,
    payForTournament,
    purchaseBooster,
    getBoosterName,
    fetchTournamentRankings,
    fetchAllRankings,
    calculatePotentialPrize,
    getActiveBoosters,
    clearMessages
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
};

/**
 * Custom hook to use the tournament context
 * @returns {Object} Tournament context value
 */
export const useTournament = () => {
  const context = React.useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};

export default TournamentContext;
