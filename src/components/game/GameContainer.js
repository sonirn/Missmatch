// src/components/game/GameContainer.js
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { initGame } from '../../game-integration/adapters';
import ScoreDisplay from './ScoreDisplay';
import Button from '../common/Button';
import Loader from '../common/Loader';
import '../../styles/components/GameContainer.css';

/**
 * GameContainer Component
 * 
 * Initializes and manages the Chrome Dinosaur game.
 * Handles tournament eligibility, game state, and score tracking.
 */
const GameContainer = () => {
  const gameContainerRef = useRef(null);
  const { user, userData, refreshUserData } = useAuth();
  const navigate = useNavigate();
  
  const [gameInstance, setGameInstance] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tournamentStatus, setTournamentStatus] = useState({
    mini: false,
    grand: false
  });
  const [activeBooster, setActiveBooster] = useState(null);
  const [gameState, setGameState] = useState('not-started'); // 'not-started', 'playing', 'game-over'

  // Initialize game and check tournament eligibility
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check tournament eligibility
          setTournamentStatus({
            mini: userData.miniTournamentPaid || false,
            grand: userData.grandTournamentPaid || false
          });
          
          // Check for active booster
          if (userData.activeBooster) {
            setActiveBooster(userData.activeBooster);
          }
          
          // Get high score if available
          if (userData.highScore) {
            setHighScore(userData.highScore);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load game data. Please try again.");
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);

  // Clean up game instance when component unmounts
  useEffect(() => {
    return () => {
      if (gameInstance && typeof gameInstance.destroy === 'function') {
        gameInstance.destroy();
      }
    };
  }, [gameInstance]);

  // Start the game
  const startGame = () => {
    if (!gameContainerRef.current) return;
    
    try {
      // Clear container
      while (gameContainerRef.current.firstChild) {
        gameContainerRef.current.removeChild(gameContainerRef.current.firstChild);
      }
      
      // Initialize game with callbacks
      const instance = initGame(gameContainerRef.current, {
        userId: user.uid,
        activeBooster: activeBooster,
        onScore: handleScoreUpdate,
        onGameOver: handleGameOver,
        onGameStart: handleGameStart
      });
      
      setGameInstance(instance);
      setGameState('playing');
      setCurrentScore(0);
    } catch (error) {
      console.error("Error starting game:", error);
      setError("Failed to start game. Please refresh the page and try again.");
    }
  };

  // Handle score updates from the game
  const handleScoreUpdate = (score) => {
    setCurrentScore(score);
  };

  // Handle game start event
  const handleGameStart = () => {
    setGameState('playing');
  };

  // Handle game over event
  const handleGameOver = (finalScore, originalScore) => {
    setGameState('game-over');
    
    // Update high score if needed
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }
    
    console.log(`Game over! Final score: ${finalScore}${originalScore !== finalScore ? ` (Original: ${originalScore})` : ''}`);
  };

  // Restart the game
  const restartGame = () => {
    if (gameInstance && typeof gameInstance.restart === 'function') {
      gameInstance.restart();
      setGameState('playing');
      setCurrentScore(0);
    } else {
      startGame();
    }
  };

  // Go to tournaments page
  const goToTournaments = () => {
    navigate('/tournaments');
  };

  // Render loading state
  if (loading) {
    return (
      <div className="game-loading">
        <Loader size="large" text="Loading Dino Game..." />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="game-error">
        <div className="game-error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h2 className="game-error-title">Oops! Something went wrong</h2>
        <p className="game-error-message">{error}</p>
        <Button onClick={() => window.location.reload()} variant="primary">
          Refresh Page
        </Button>
      </div>
    );
  }

  // Check if user has paid for any tournament
  const canPlayGame = tournamentStatus.mini || tournamentStatus.grand;

  // If user hasn't paid for any tournament, show payment required message
  if (!canPlayGame) {
    return (
      <div className="game-payment-required">
        <div className="game-payment-icon">
          <i className="fas fa-lock"></i>
        </div>
        <h2 className="game-payment-title">Tournament Entry Required</h2>
        <p className="game-payment-message">
          To play the Dino Game, you need to register for at least one tournament.
        </p>
        <div className="game-payment-options">
          <div className="game-payment-option">
            <h3>Mini Tournament</h3>
            <p className="game-payment-price">1 USDT</p>
            <p className="game-payment-description">
              Access to the game and compete in the Mini Tournament
            </p>
          </div>
          <div className="game-payment-option">
            <h3>Grand Tournament</h3>
            <p className="game-payment-price">10 USDT</p>
            <p className="game-payment-description">
              Access to the game, compete in the Grand Tournament, and unlock boosters
            </p>
          </div>
        </div>
        <Button onClick={goToTournaments} variant="primary" size="large">
          Register for Tournament
        </Button>
      </div>
    );
  }

  return (
    <div className="game-container">
      {/* Game header with tournament info */}
      <div className="game-header">
        <div className="game-tournaments">
          <div className={`game-tournament-badge ${tournamentStatus.mini ? 'active' : 'inactive'}`}>
            <span className="game-tournament-icon">
              <i className="fas fa-trophy"></i>
            </span>
            <span className="game-tournament-name">Mini Tournament</span>
          </div>
          <div className={`game-tournament-badge ${tournamentStatus.grand ? 'active' : 'inactive'}`}>
            <span className="game-tournament-icon">
              <i className="fas fa-crown"></i>
            </span>
            <span className="game-tournament-name">Grand Tournament</span>
          </div>
        </div>
        
        {/* Active booster display */}
        {activeBooster && (
          <div className="game-booster">
            <span className="game-booster-icon">
              <i className="fas fa-bolt"></i>
            </span>
            <span className="game-booster-info">
              {activeBooster.multiplier}x Booster
              {activeBooster.games ? ` (${activeBooster.gamesRemaining}/${activeBooster.games} games)` : ' (Unlimited)'}
            </span>
          </div>
        )}
      </div>
      
      {/* Score display */}
      <ScoreDisplay 
        currentScore={currentScore} 
        highScore={highScore} 
        boosterActive={!!activeBooster}
        boosterMultiplier={activeBooster?.multiplier || 1}
      />
      
      {/* Game canvas container */}
      <div className="game-canvas-wrapper">
        {gameState === 'not-started' && (
          <div className="game-start-overlay">
            <h2 className="game-start-title">Ready to Play?</h2>
            <p className="game-start-description">
              Press the button below to start the game. Use spacebar or up arrow to jump!
            </p>
            <Button onClick={startGame} variant="primary" size="large">
              Start Game
            </Button>
          </div>
        )}
        
        {gameState === 'game-over' && (
          <div className="game-over-overlay">
            <h2 className="game-over-title">Game Over!</h2>
            <div className="game-over-score">
              <p className="game-over-score-label">Your Score:</p>
              <p className="game-over-score-value">{currentScore}</p>
            </div>
            <div className="game-over-actions">
              <Button onClick={restartGame} variant="primary" size="medium">
                Play Again
              </Button>
              <Button onClick={goToTournaments} variant="secondary" size="medium">
                View Tournament
              </Button>
            </div>
          </div>
        )}
        
        <div ref={gameContainerRef} className="game-canvas-container"></div>
      </div>
      
      {/* Game controls */}
      <div className="game-controls">
        <div className="game-control-info">
          <div className="game-control-item">
            <span className="game-control-key">Space</span>
            <span className="game-control-action">Jump</span>
          </div>
          <div className="game-control-item">
            <span className="game-control-key">↓</span>
            <span className="game-control-action">Duck</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameContainer;
