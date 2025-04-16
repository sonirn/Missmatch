// src/contexts/GameContext.js
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import firebase from '../firebase/config';
import userService from '../services/userService';
import { AuthContext } from './AuthContext';
import { TournamentContext } from './TournamentContext';
import { handleError } from '../utils/errorHandler';

// Create the context
export const GameContext = createContext();

/**
 * GameContext Provider component
 * Manages game state, scores, and integration with the dinosaur game
 */
export const GameProvider = ({ children }) => {
  // Access auth and tournament contexts
  const { currentUser, userProfile } = useContext(AuthContext);
  const { tournamentStatus, fetchTournamentStatus } = useContext(TournamentContext);
  
  // Game state
  const [gameState, setGameState] = useState('idle'); // idle, loading, ready, playing, gameOver
  const [gameInstance, setGameInstance] = useState(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  const [activeBoosters, setActiveBoosters] = useState({});
  const [scoreHistory, setScoreHistory] = useState([]);
  const [gameError, setGameError] = useState(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [lastGameResult, setLastGameResult] = useState(null);
  
  // Game settings
  const [gameSettings, setGameSettings] = useState({
    speed: 1.0,
    gravity: 0.6,
    obstacleFrequency: 1.0,
    soundEnabled: true,
  });

  /**
   * Initialize the game
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  const initGame = useCallback(async () => {
    try {
      setGameLoading(true);
      setGameError(null);
      
      // Check if user can play (has paid for tournament)
      if (!currentUser) {
        setCanPlay(false);
        setGameState('idle');
        return false;
      }
      
      // Make sure tournament status is up to date
      await fetchTournamentStatus();
      
      // Check if user has paid for either tournament
      const hasPaidMini = tournamentStatus.mini?.paid || false;
      const hasPaidGrand = tournamentStatus.grand?.paid || false;
      
      if (!hasPaidMini && !hasPaidGrand) {
        setCanPlay(false);
        setGameError('You need to pay for at least one tournament to play');
        setGameState('idle');
        return false;
      }
      
      setCanPlay(true);
      
      // Get user's high score
      if (userProfile) {
        setHighScore(userProfile.highScore || 0);
      }
      
      // Fetch active boosters if user paid for grand tournament
      if (hasPaidGrand) {
        const boosters = await userService.getActiveBoosters();
        setActiveBoosters(boosters);
      } else {
        setActiveBoosters({});
      }
      
      // Fetch score history
      await fetchScoreHistory();
      
      // Set game as ready
      setGameState('ready');
      return true;
    } catch (error) {
      const errorMessage = handleError(error, 'Game Initialization');
      setGameError(errorMessage);
      setGameState('idle');
      return false;
    } finally {
      setGameLoading(false);
    }
  }, [currentUser, fetchTournamentStatus, tournamentStatus, userProfile]);

  /**
   * Start a new game
   */
  const startGame = useCallback(() => {
    if (!canPlay) {
      setGameError('You need to pay for at least one tournament to play');
      return;
    }
    
    setScore(0);
    setGameError(null);
    setLastGameResult(null);
    setGameState('playing');
    
    // If game instance exists, start it
    if (gameInstance && typeof gameInstance.start === 'function') {
      gameInstance.start();
    }
  }, [canPlay, gameInstance]);

  /**
   * Update score during gameplay
   * @param {number} newScore - The new score
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
      setGameLoading(true);
      setGameState('gameOver');
      
      // Determine if boosters should be applied
      // Only apply boosters if user paid for grand tournament
      const applyBooster = tournamentStatus.grand?.paid || false;
      
      // Submit score to server
      const result = await userService.updateHighScore(finalScore, applyBooster);
      
      // Update high score if needed
      if (result.isHighScore) {
        setHighScore(result.finalScore);
      }
      
      // Refresh score history
      await fetchScoreHistory();
      
      // Save last game result for display
      setLastGameResult(result);
      
      return result;
    } catch (error) {
      const errorMessage = handleError(error, 'Score Submission');
      setGameError(errorMessage);
      return {
        success: false,
        originalScore: finalScore,
        finalScore: finalScore,
        isHighScore: false,
        error: errorMessage
      };
    } finally {
      setGameLoading(false);
    }
  }, [tournamentStatus, fetchScoreHistory]);

  /**
   * Reset game state to ready
   */
  const resetGame = useCallback(() => {
    setGameState('ready');
    setScore(0);
    setGameError(null);
    
    // If game instance exists, reset it
    if (gameInstance && typeof gameInstance.reset === 'function') {
      gameInstance.reset();
    }
  }, [gameInstance]);

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
   * @returns {Promise<Array>} Score history
   */
  const fetchScoreHistory = useCallback(async () => {
    try {
      if (!currentUser) return [];
      
      const history = await userService.getScoreHistory();
      setScoreHistory(history);
      return history;
    } catch (error) {
      console.error('Error fetching score history:', error);
      return [];
    }
  }, [currentUser]);

  /**
   * Update game settings
   * @param {Object} newSettings - New settings to apply
   */
  const updateGameSettings = useCallback((newSettings) => {
    setGameSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings
    }));
    
    // Apply settings to game instance if it exists
    if (gameInstance && typeof gameInstance.updateSettings === 'function') {
      gameInstance.updateSettings(newSettings);
    }
  }, [gameInstance]);

  /**
   * Register the game instance
   * @param {Object} instance - Game instance with control methods
   */
  const registerGameInstance = useCallback((instance) => {
    setGameInstance(instance);
    
    // Apply current settings to new instance
    if (instance && typeof instance.updateSettings === 'function') {
      instance.updateSettings(gameSettings);
    }
  }, [gameSettings]);

  /**
   * Clear any game errors
   */
  const clearGameError = useCallback(() => {
    setGameError(null);
  }, []);

  // Initialize game when user or tournament status changes
  useEffect(() => {
    if (currentUser && (tournamentStatus.mini?.paid || tournamentStatus.grand?.paid)) {
      initGame();
    } else {
      setCanPlay(false);
      setGameState('idle');
    }
  }, [currentUser, tournamentStatus, initGame]);

  // Context value
  const value = {
    gameState,
    gameInstance,
    score,
    highScore,
    canPlay,
    activeBoosters,
    scoreHistory,
    gameError,
    gameLoading,
    lastGameResult,
    gameSettings,
    initGame,
    startGame,
    updateScore,
    endGame,
    resetGame,
    getScoreMultiplier,
    fetchScoreHistory,
    updateGameSettings,
    registerGameInstance,
    clearGameError
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

/**
 * Custom hook to use the game context
 * @returns {Object} Game context value
 */
export const useGame = () => {
  const context = React.useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export default GameContext;
