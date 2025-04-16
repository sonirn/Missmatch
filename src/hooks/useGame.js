// src/hooks/useGame.js
import { useState, useEffect, useCallback } from 'react';
import firebase from '../firebase/config';
import userService from '../services/userService';

/**
 * Custom hook for managing game state, score tracking, and booster application
 * @returns {Object} Game state and functions
 */
const useGame = () => {
  // Game state management
  const [gameState, setGameState] = useState('idle'); // idle, loading, ready, playing, gameOver
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  const [tournamentStatus, setTournamentStatus] = useState({
    mini: { paid: false },
    grand: { paid: false }
  });
  const [activeBoosters, setActiveBoosters] = useState({});
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  
  /**
   * Check if user can play based on tournament payment status
   */
  const checkCanPlay = useCallback(async () => {
    try {
      setLoadingMessage('Checking tournament status...');
      
      // Make sure user is authenticated
      const user = firebase.auth().currentUser;
      if (!user) {
        setCanPlay(false);
        setError('Please sign in to play');
        return;
      }
      
      // Get tournament status
      const status = await userService.getTournamentStatus();
      setTournamentStatus(status);
      
      // User can play if they've paid for either tournament
      const canPlayGame = status.mini.paid || status.grand.paid;
      setCanPlay(canPlayGame);
      
      if (!canPlayGame) {
        setError('You need to pay for at least one tournament to play');
      } else {
        setError(null);
      }
      
      // Update high score
      setHighScore(status.highScore || 0);
      
      // Get active boosters if user paid for grand tournament
      if (status.grand.paid) {
        const boosters = await userService.getActiveBoosters();
        setActiveBoosters(boosters);
      }
    } catch (error) {
      console.error('Error checking play eligibility:', error);
      setError('Could not verify tournament status');
      setCanPlay(false);
    } finally {
      setLoadingMessage('');
    }
  }, []);
  
  /**
   * Initialize game
   */
  const initGame = useCallback(async () => {
    try {
      setGameState('loading');
      setLoadingMessage('Initializing game...');
      
      await checkCanPlay();
      
      // If user can play, set game as ready
      if (canPlay) {
        setGameState('ready');
      } else {
        setGameState('idle');
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      setError('Failed to initialize game');
      setGameState('idle');
    } finally {
      setLoadingMessage('');
    }
  }, [canPlay, checkCanPlay]);
  
  /**
   * Start a new game
   */
  const startGame = useCallback(() => {
    if (!canPlay) {
      setError('You need to pay for at least one tournament to play');
      return;
    }
    
    setGameState('playing');
    setScore(0);
    setError(null);
  }, [canPlay]);
  
  /**
   * Update score during gameplay
   * @param {number} newScore - The new score to set
   */
  const updateScore = useCallback((newScore) => {
    setScore(newScore);
  }, []);
  
  /**
   * End game and submit score
   * @param {number} finalScore - The final score achieved
   * @returns {Promise<Object>} Result of score submission
   */
  const endGame = useCallback(async (finalScore) => {
    try {
      setGameState('gameOver');
      setLoadingMessage('Submitting score...');
      
      // Determine if boosters should be applied
      // Only apply boosters if user paid for grand tournament
      const applyBooster = tournamentStatus.grand.paid;
      
      // Submit score to server
      const result = await userService.updateHighScore(finalScore, applyBooster);
      
      // Update high score if needed
      if (result.isHighScore) {
        setHighScore(result.finalScore);
      }
      
      // Refresh score history
      await fetchScoreHistory();
      
      // Return result for display
      return {
        originalScore: result.originalScore,
        finalScore: result.finalScore,
        isHighScore: result.isHighScore,
        boosterApplied: result.boosterApplied
      };
    } catch (error) {
      console.error('Error submitting score:', error);
      setError('Failed to submit score');
      return {
        originalScore: finalScore,
        finalScore: finalScore,
        isHighScore: false,
        error: error.message
      };
    } finally {
      setLoadingMessage('');
    }
  }, [tournamentStatus]);
  
  /**
   * Reset game state
   */
  const resetGame = useCallback(() => {
    setGameState('ready');
    setScore(0);
    setError(null);
  }, []);
  
  /**
   * Calculate effective score multiplier based on active boosters
   * @returns {number} Score multiplier
   */
  const getScoreMultiplier = useCallback(() => {
    // Check if user has any active boosters
    if (Object.keys(activeBoosters).length === 0) {
      return 1; // No booster, normal score
    }
    
    // Check boosters in priority order
    if (activeBoosters.booster3) {
      return activeBoosters.booster3.multiplier;
    } else if (activeBoosters.booster2 && activeBoosters.booster2.gamesRemaining > 0) {
      return activeBoosters.booster2.multiplier;
    } else if (activeBoosters.booster1 && activeBoosters.booster1.gamesRemaining > 0) {
      return activeBoosters.booster1.multiplier;
    }
    
    return 1; // No active booster found
  }, [activeBoosters]);
  
  /**
   * Fetch user's score history
   */
  const fetchScoreHistory = useCallback(async () => {
    try {
      const history = await userService.getScoreHistory();
      setScoreHistory(history);
    } catch (error) {
      console.error('Error fetching score history:', error);
      // Don't set error state here to avoid disrupting gameplay
    }
  }, []);
  
  // Check tournament status and boosters on mount and when auth state changes
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      if (user) {
        checkCanPlay();
        fetchScoreHistory();
      } else {
        setCanPlay(false);
        setGameState('idle');
        setScoreHistory([]);
      }
    });
    
    return () => unsubscribe();
  }, [checkCanPlay, fetchScoreHistory]);
  
  return {
    gameState,
    score,
    highScore,
    canPlay,
    tournamentStatus,
    activeBoosters,
    loadingMessage,
    error,
    scoreHistory,
    initGame,
    startGame,
    updateScore,
    endGame,
    resetGame,
    getScoreMultiplier,
    fetchScoreHistory
  };
};

export default useGame;
