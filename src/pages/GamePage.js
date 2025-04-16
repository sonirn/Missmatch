// src/pages/GamePage.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { initGame } from '../game-integration/adapters';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import '../styles/pages/GamePage.css';

/**
 * GamePage Component
 * Displays the game interface and handles game-related logic
 */
const GamePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTournamentWarning, setShowTournamentWarning] = useState(false);
  const [gameInstance, setGameInstance] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverData, setGameOverData] = useState(null);
  const [boosterApplied, setBoosterApplied] = useState(false);
  const [originalScore, setOriginalScore] = useState(0);
  const gameContainerRef = useRef(null);
  
  // Fetch user data and check tournament participation
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          
          // Check if user has paid for any tournament
          if (!data.miniTournamentPaid && !data.grandTournamentPaid) {
            setShowTournamentWarning(true);
          }
          
          // Get high score if available
          if (data.highScore) {
            setHighScore(data.highScore);
          }
        } else {
          setError('User profile not found. Please sign in again.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);
  
  // Initialize game when component mounts
  useEffect(() => {
    if (!gameContainerRef.current || !user || loading) return;
    
    if (!userData?.miniTournamentPaid && !userData?.grandTournamentPaid) {
      // Don't initialize game if user hasn't paid for any tournament
      return;
    }
    
    // Initialize game
    const instance = initGame(gameContainerRef.current, {
      userId: user.uid,
      activeBooster: userData?.activeBooster,
      onScore: handleScoreUpdate,
      onGameOver: handleGameOver
    });
    
    setGameInstance(instance);
    
    // Clean up game instance on unmount
    return () => {
      if (instance && instance.destroy) {
        instance.destroy();
      }
    };
  }, [userData, user, loading]);
  
  // Handle score updates during gameplay
  const handleScoreUpdate = (score) => {
    setCurrentScore(score);
    
    // Apply booster if active
    if (userData?.activeBooster) {
      const booster = userData.activeBooster;
      
      // Check if booster is still valid
      const isBoosterValid = booster.unlimited || 
        (booster.gamesRemaining && booster.gamesRemaining > 0);
      
      if (isBoosterValid) {
        // Store original score for reference
        setOriginalScore(score);
        
        // Apply double score
        const boostedScore = score * 2;
        setCurrentScore(boostedScore);
        setBoosterApplied(true);
        
        return boostedScore;
      }
    }
    
    setBoosterApplied(false);
    return score;
  };
  
  // Handle game over event
  const handleGameOver = async (finalScore) => {
    try {
      // Save score to database
      const scoreData = {
        userId: user.uid,
        score: finalScore,
        originalScore: boosterApplied ? originalScore : finalScore,
        boosterApplied: boosterApplied,
        timestamp: serverTimestamp()
      };
      
      // Determine which tournaments the user is participating in
      if (userData.miniTournamentPaid) {
        scoreData.tournamentId = 'mini';
      }
      
      if (userData.grandTournamentPaid) {
        // If user is in both tournaments, use the grand tournament
        scoreData.tournamentId = 'grand';
      }
      
      // Save score to Firestore
      await addDoc(collection(db, 'scores'), scoreData);
      
      // Update high score if needed
      if (finalScore > highScore) {
        setHighScore(finalScore);
      }
      
      // Prepare game over data for display
      setGameOverData({
        score: finalScore,
        originalScore: boosterApplied ? originalScore : null,
        boosterApplied: boosterApplied,
        highScore: Math.max(finalScore, highScore)
      });
      
      // Show game over modal
      setShowGameOver(true);
    } catch (err) {
      console.error('Error saving score:', err);
      // Still show game over screen even if score saving failed
      setGameOverData({
        score: finalScore,
        originalScore: boosterApplied ? originalScore : null,
        boosterApplied: boosterApplied,
        highScore: Math.max(finalScore, highScore),
        error: 'Failed to save score. Please try again.'
      });
      setShowGameOver(true);
    }
  };
  
  // Handle play again
  const handlePlayAgain = () => {
    setShowGameOver(false);
    setCurrentScore(0);
    setOriginalScore(0);
    setBoosterApplied(false);
    
    // Reset and restart game
    if (gameInstance && gameInstance.restart) {
      gameInstance.restart();
    }
  };
  
  // Navigate to tournaments page
  const goToTournaments = () => {
    navigate('/tournament');
  };
  
  // Navigate to boosters page
  const goToBoosters = () => {
    navigate('/boosters');
  };
  
  // Render loading state
  if (loading) {
    return <Loader message="Loading game..." />;
  }
  
  // Require authentication
  if (!user) {
    return (
      <div className="game-auth-required">
        <h2>Authentication Required</h2>
        <p>Please sign in to play the game.</p>
        <button className="auth-button" onClick={() => navigate('/login')}>
          Sign In
        </button>
      </div>
    );
  }
  
  return (
    <div className="game-page-container">
      {/* Tournament Warning Modal */}
      {showTournamentWarning && (
        <Modal 
          title="Tournament Registration Required" 
          onClose={() => setShowTournamentWarning(false)}
        >
          <div className="tournament-warning-content">
            <p>
              You need to register for at least one tournament to play the game.
            </p>
            <p>
              Registration fees:
              <ul>
                <li>Mini Tournament: 1 USDT</li>
                <li>Grand Tournament: 10 USDT</li>
              </ul>
            </p>
            <div className="warning-actions">
              <button 
                className="primary-button"
                onClick={goToTournaments}
              >
                View Tournaments
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Game Over Modal */}
      {showGameOver && gameOverData && (
        <Modal 
          title="Game Over" 
          onClose={() => setShowGameOver(false)}
        >
          <div className="game-over-content">
            <div className="score-display">
              <h3>Your Score</h3>
              <div className="final-score">{gameOverData.score}</div>
              {gameOverData.boosterApplied && (
                <div className="boosted-score-info">
                  <span className="original-score">{gameOverData.originalScore}</span>
                  <span className="multiplier">× 2</span>
                </div>
              )}
            </div>
            
            <div className="high-score-display">
              <h4>High Score</h4>
              <div className="high-score">{gameOverData.highScore}</div>
            </div>
            
            {gameOverData.error && (
              <div className="score-error">{gameOverData.error}</div>
            )}
            
            <div className="game-over-actions">
              <button 
                className="play-again-button"
                onClick={handlePlayAgain}
              >
                Play Again
              </button>
              <button 
                className="boosters-button"
                onClick={goToBoosters}
              >
                Get Boosters
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      <div className="game-header">
        <div className="score-display">
          <div className="current-score-label">Score</div>
          <div className="current-score-value">{currentScore}</div>
          {boosterApplied && (
            <div className="booster-indicator">
              <span className="booster-icon">🚀</span>
              <span className="booster-text">2x Booster Active</span>
            </div>
          )}
        </div>
        <div className="high-score-display">
          <div className="high-score-label">High Score</div>
          <div className="high-score-value">{highScore}</div>
        </div>
      </div>
      
      {/* Game Container */}
      <div className="game-wrapper">
        {error ? (
          <div className="game-error">
            <h3>Error Loading Game</h3>
            <p>{error}</p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : userData?.miniTournamentPaid || userData?.grandTournamentPaid ? (
          <div className="game-container" ref={gameContainerRef}></div>
        ) : (
          <div className="tournament-required">
            <h3>Tournament Registration Required</h3>
            <p>You need to register for at least one tournament to play the game.</p>
            <button 
              className="register-button"
              onClick={goToTournaments}
            >
              Register Now
            </button>
          </div>
        )}
      </div>
      
      <div className="game-controls">
        <div className="controls-info">
          <h3>Controls</h3>
          <div className="control-item">
            <span className="control-key">Space / ↑</span>
            <span className="control-action">Jump</span>
          </div>
          <div className="control-item">
            <span className="control-key">↓</span>
            <span className="control-action">Duck</span>
          </div>
        </div>
        
        <div className="tournament-info">
          <h3>Your Tournaments</h3>
          <div className="tournament-status-list">
            <div className={`tournament-status ${userData?.miniTournamentPaid ? 'active' : 'inactive'}`}>
              <span className="tournament-name">Mini Tournament</span>
              <span className="status-indicator"></span>
            </div>
            <div className={`tournament-status ${userData?.grandTournamentPaid ? 'active' : 'inactive'}`}>
              <span className="tournament-name">Grand Tournament</span>
              <span className="status-indicator"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
