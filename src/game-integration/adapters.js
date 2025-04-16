// src/game-integration/adapters.js
import { applyBooster } from './boosterApplier';
import { trackScore, reportFinalScore } from './scoreTracker';
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for adapting the Chrome dinosaur game to the tournament platform
 * @param {Object} options - Configuration options
 * @returns {Object} Game adapter interface
 */
export const useGameAdapter = (options = {}) => {
  const [gameInstance, setGameInstance] = useState(null);
  const [originalGameOver, setOriginalGameOver] = useState(null);
  const [originalUpdateScore, setOriginalUpdateScore] = useState(null);
  const [isBoosterEnabled, setIsBoosterEnabled] = useState(false);
  const [boosterMultiplier, setBoosterMultiplier] = useState(1);
  const [currentScore, setCurrentScore] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [gameState, setGameState] = useState('idle'); // idle, loading, ready, playing, gameOver

  /**
   * Initialize the adapter with the game instance
   * @param {Object} instance - The Chrome dinosaur game instance
   * @returns {boolean} Whether initialization was successful
   */
  const initGame = useCallback((instance) => {
    try {
      if (!instance || !instance.Runner) {
        throw new Error('Invalid game instance provided');
      }

      const runner = instance.Runner.instance_;
      if (!runner) {
        throw new Error('Game runner not found');
      }

      // Store game instance
      setGameInstance(instance);

      // Store original methods for later restoration
      setOriginalGameOver(runner.gameOver);
      setOriginalUpdateScore(runner.updateScore);

      // Override game methods
      overrideGameMethods(runner);

      // Set initialized flag
      setInitialized(true);
      setGameState('ready');

      console.log('Dino game adapter initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing game adapter:', error);
      setGameState('error');
      return false;
    }
  }, []);

  /**
   * Override original game methods to add custom functionality
   * @param {Object} runner - The game runner instance
   */
  const overrideGameMethods = useCallback((runner) => {
    // Store reference to adapter methods
    const adapter = {
      currentScore,
      setCurrentScore,
      isBoosterEnabled,
      boosterMultiplier,
      onGameOver: options.onGameOver || (() => {}),
      onScoreUpdate: options.onScoreUpdate || (() => {})
    };

    // Override game over method
    runner.gameOver = function() {
      // Get final score before game over
      const finalScore = adapter.currentScore;
      
      // Call original game over method
      originalGameOver.apply(this, arguments);
      
      // Report final score to tournament platform
      reportFinalScore(finalScore, adapter.isBoosterEnabled ? adapter.boosterMultiplier : 1)
        .then(result => {
          // Call game over callback with result
          adapter.onGameOver(result);
          setGameState('gameOver');
        })
        .catch(error => {
          console.error('Error reporting final score:', error);
          adapter.onGameOver({ 
            success: false, 
            originalScore: finalScore, 
            finalScore: finalScore,
            error: error.message 
          });
          setGameState('error');
        });
    };

    // Override update score method
    runner.updateScore = function(score) {
      // Call original update score method
      originalUpdateScore.apply(this, arguments);
      
      // Store current score
      adapter.setCurrentScore(score);
      
      // Apply booster if enabled
      const boostedScore = adapter.isBoosterEnabled 
        ? applyBooster(score, adapter.boosterMultiplier) 
        : score;
      
      // Track score with tournament platform
      trackScore(score, boostedScore);
      
      // Call score update callback
      adapter.onScoreUpdate(score, boostedScore);
    };
  }, [originalGameOver, originalUpdateScore, currentScore, isBoosterEnabled, boosterMultiplier, options.onGameOver, options.onScoreUpdate]);

  /**
   * Restore original game methods
   */
  const restoreOriginalMethods = useCallback(() => {
    if (gameInstance && originalGameOver && originalUpdateScore) {
      const runner = gameInstance.Runner.instance_;
      if (runner) {
        runner.gameOver = originalGameOver;
        runner.updateScore = originalUpdateScore;
      }
    }
  }, [gameInstance, originalGameOver, originalUpdateScore]);

  /**
   * Start a new game
   */
  const startGame = useCallback(() => {
    if (!initialized || !gameInstance) {
      console.error('Game adapter not initialized');
      return;
    }

    const runner = gameInstance.Runner.instance_;
    if (runner.playing) {
      // If already playing, restart
      restartGame();
    } else {
      // Start the game
      runner.play();
      setGameState('playing');
    }
  }, [initialized, gameInstance, restartGame]);

  /**
   * Restart the game
   */
  const restartGame = useCallback(() => {
    if (!initialized || !gameInstance) {
      console.error('Game adapter not initialized');
      return;
    }

    const runner = gameInstance.Runner.instance_;
    
    // Reset score
    setCurrentScore(0);

    // If game is over, we need to restart
    if (runner.crashed) {
      runner.restart();
      setGameState('playing');
    } else if (runner.playing) {
      // If playing, stop first
      runner.stop();
      // Then start again
      setTimeout(() => {
        runner.play();
        setGameState('playing');
      }, 100);
    } else {
      // Otherwise just play
      runner.play();
      setGameState('playing');
    }
  }, [initialized, gameInstance]);

  /**
   * Pause the game
   */
  const pauseGame = useCallback(() => {
    if (!initialized || !gameInstance) {
      console.error('Game adapter not initialized');
      return;
    }

    const runner = gameInstance.Runner.instance_;
    if (runner.playing) {
      runner.stop();
      setGameState('paused');
    }
  }, [initialized, gameInstance]);

  /**
   * Resume the paused game
   */
  const resumeGame = useCallback(() => {
    if (!initialized || !gameInstance) {
      console.error('Game adapter not initialized');
      return;
    }

    const runner = gameInstance.Runner.instance_;
    if (!runner.playing && !runner.crashed) {
      runner.play();
      setGameState('playing');
    }
  }, [initialized, gameInstance]);

  /**
   * Update game settings
   * @param {Object} settings - Game settings
   */
  const updateSettings = useCallback((settings = {}) => {
    if (!initialized || !gameInstance) {
      console.error('Game adapter not initialized');
      return;
    }

    const runner = gameInstance.Runner.instance_;
    
    // Apply speed setting
    if (settings.speed !== undefined && typeof settings.speed === 'number') {
      const baseSpeed = runner.config.SPEED;
      runner.config.SPEED = baseSpeed * settings.speed;
    }

    // Apply gravity setting
    if (settings.gravity !== undefined && typeof settings.gravity === 'number') {
      runner.config.GRAVITY = settings.gravity;
    }

    // Apply obstacle frequency setting
    if (settings.obstacleFrequency !== undefined && typeof settings.obstacleFrequency === 'number') {
      runner.config.GAP_COEFFICIENT = 0.6 / settings.obstacleFrequency;
    }

    // Apply sound setting
    if (settings.soundEnabled !== undefined) {
      runner.config.SOUND_ENABLED = !!settings.soundEnabled;
    }

    console.log('Game settings updated:', settings);
  }, [initialized, gameInstance]);

  /**
   * Enable score booster
   * @param {number} multiplier - Score multiplier value
   */
  const enableBooster = useCallback((multiplier = 2) => {
    setIsBoosterEnabled(true);
    setBoosterMultiplier(multiplier);
    console.log(`Booster enabled with ${multiplier}x multiplier`);
  }, []);

  /**
   * Disable score booster
   */
  const disableBooster = useCallback(() => {
    setIsBoosterEnabled(false);
    setBoosterMultiplier(1);
    console.log('Booster disabled');
  }, []);

  /**
   * Get current game state
   * @returns {Object} Current game state
   */
  const getGameState = useCallback(() => {
    if (!initialized || !gameInstance) {
      return { initialized: false, state: gameState };
    }

    const runner = gameInstance.Runner.instance_;
    return {
      initialized: true,
      state: gameState,
      playing: runner.playing,
      crashed: runner.crashed,
      paused: !runner.playing && !runner.crashed,
      currentScore: currentScore,
      boostedScore: isBoosterEnabled ? currentScore * boosterMultiplier : currentScore,
      boosterEnabled: isBoosterEnabled,
      boosterMultiplier: boosterMultiplier
    };
  }, [initialized, gameInstance, gameState, currentScore, isBoosterEnabled, boosterMultiplier]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      restoreOriginalMethods();
      setGameInstance(null);
      setInitialized(false);
      console.log('Dino game adapter destroyed');
    };
  }, [restoreOriginalMethods]);

  return {
    initGame,
    startGame,
    restartGame,
    pauseGame,
    resumeGame,
    updateSettings,
    enableBooster,
    disableBooster,
    getGameState,
    gameState,
    currentScore,
    isBoosterEnabled,
    boosterMultiplier,
    initialized
  };
};

export default useGameAdapter;
