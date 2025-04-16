// src/hooks/useTournament.js
import { useState, useEffect, useCallback } from 'react';
import firebase from '../firebase/config';
import userService from '../services/userService';
import paymentService from '../services/paymentService';

/**
 * Custom hook for managing tournament-related functionality
 * @returns {Object} Tournament state and functions
 */
const useTournament = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [tournamentStatus, setTournamentStatus] = useState({
    mini: { paid: false, joinedAt: null },
    grand: { paid: false, joinedAt: null }
  });
  
  const [miniRankings, setMiniRankings] = useState([]);
  const [grandRankings, setGrandRankings] = useState([]);
  
  const [userRank, setUserRank] = useState({
    mini: null,
    grand: null
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
  
  /**
   * Fetch tournament status and user participation
   */
  const fetchTournamentStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const user = firebase.auth().currentUser;
      if (!user) {
        return;
      }
      
      // Get user's tournament status
      const status = await userService.getTournamentStatus();
      setTournamentStatus(status);
      
      // Fetch tournament info from Firestore
      const tournamentDoc = await firebase.firestore().collection('settings').doc('tournament').get();
      if (tournamentDoc.exists) {
        const data = tournamentDoc.data();
        setTournamentInfo({
          mini: {
            ...tournamentInfo.mini,
            startDate: data.miniStartDate?.toDate() || null,
            endDate: data.miniEndDate?.toDate() || null,
            status: data.miniStatus || 'upcoming'
          },
          grand: {
            ...tournamentInfo.grand,
            startDate: data.grandStartDate?.toDate() || null,
            endDate: data.grandEndDate?.toDate() || null,
            status: data.grandStatus || 'upcoming'
          }
        });
      }
    } catch (error) {
      console.error('Error fetching tournament status:', error);
      setError('Failed to load tournament status');
    } finally {
      setLoading(false);
    }
  }, [tournamentInfo]);
  
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
      if (tournamentStatus[tournamentType].paid) {
        setSuccess(`You have already paid for the ${tournamentType === 'mini' ? 'Mini' : 'Grand'} Tournament`);
        return { success: true, message: `Already paid for ${tournamentType} tournament` };
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
      console.error(`Error paying for ${tournamentType} tournament:`, error);
      setError(error.message || 'Failed to process payment');
      return { success: false, message: error.message || 'Failed to process payment' };
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
      
      // Check if user has paid for Grand Tournament (boosters only work there)
      if (!tournamentStatus.grand.paid) {
        setError('You must join the Grand Tournament to purchase boosters');
        return { success: false, message: 'You must join the Grand Tournament to purchase boosters' };
      }
      
      // Process booster purchase
      const result = await paymentService.purchaseBooster(boosterType);
      
      if (result.success) {
        setSuccess(`Successfully purchased ${boosterType}!`);
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
  }, [tournamentStatus]);
  
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
      
      // Get rankings from service
      const rankings = await userService.getTournamentRankings(tournamentType, limit);
      
      // Update state based on tournament type
      if (tournamentType === 'mini') {
        setMiniRankings(rankings);
      } else {
        setGrandRankings(rankings);
      }
      
      // Find current user's rank
      const currentUser = firebase.auth().currentUser;
      if (currentUser) {
        const userRanking = rankings.find(rank => rank.userId === currentUser.uid);
        if (userRanking) {
          setUserRank(prev => ({
            ...prev,
            [tournamentType]: userRanking.rank
          }));
        }
      }
      
      return rankings;
    } catch (error) {
      console.error(`Error fetching ${tournamentType} rankings:`, error);
      setError(`Failed to load ${tournamentType} tournament rankings`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
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
   * Fetch both tournament rankings
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
      console.error('Error fetching all rankings:', error);
      setError('Failed to load tournament rankings');
    } finally {
      setLoading(false);
    }
  }, [fetchTournamentRankings]);
  
  /**
   * Clear success and error messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  
  // Check tournament status on mount and when auth state changes
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      if (user) {
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
    });
    
    return () => unsubscribe();
  }, [fetchTournamentStatus, fetchAllRankings]);
  
  return {
    loading,
    error,
    success,
    tournamentStatus,
    tournamentInfo,
    miniRankings,
    grandRankings,
    userRank,
    fetchTournamentStatus,
    payForTournament,
    purchaseBooster,
    fetchTournamentRankings,
    fetchAllRankings,
    calculatePotentialPrize,
    clearMessages
  };
};

export default useTournament;
