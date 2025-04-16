// src/components/game/ScoreDisplay.js
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import '../../styles/components/ScoreDisplay.css';

/**
 * ScoreDisplay Component
 * 
 * Displays the current and high scores during gameplay.
 * Shows booster multiplier effect when active.
 * 
 * @param {Object} props - Component props
 * @param {number} props.currentScore - The current game score
 * @param {number} props.highScore - The player's high score
 * @param {boolean} props.boosterActive - Whether a score booster is active
 * @param {number} props.boosterMultiplier - The multiplier value of the active booster
 */
const ScoreDisplay = ({ 
  currentScore = 0, 
  highScore = 0, 
  boosterActive = false,
  boosterMultiplier = 1
}) => {
  const [displayScore, setDisplayScore] = useState(currentScore);
  const [scoreAnimation, setScoreAnimation] = useState('');
  const [originalScore, setOriginalScore] = useState(0);

  // Update display score with animation when current score changes
  useEffect(() => {
    if (currentScore > displayScore) {
      setScoreAnimation('score-increase');
      
      // Remove animation class after animation completes
      const timer = setTimeout(() => {
        setScoreAnimation('');
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    setDisplayScore(currentScore);
    
    // Calculate original score if booster is active
    if (boosterActive && boosterMultiplier > 1) {
      setOriginalScore(Math.floor(currentScore / boosterMultiplier));
    } else {
      setOriginalScore(currentScore);
    }
  }, [currentScore, displayScore, boosterActive, boosterMultiplier]);

  // Format score with leading zeros
  const formatScore = (score) => {
    return score.toString().padStart(5, '0');
  };

  return (
    <div className="score-display">
      <div className="score-current-container">
        <div className="score-label">SCORE</div>
        <div className={`score-value ${scoreAnimation}`}>
          {formatScore(displayScore)}
          
          {/* Show booster effect */}
          {boosterActive && boosterMultiplier > 1 && (
            <div className="score-booster-effect">
              <span className="score-original">{formatScore(originalScore)}</span>
              <span className="score-multiplier">×{boosterMultiplier}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="score-high-container">
        <div className="score-label">HI</div>
        <div className="score-value">{formatScore(highScore)}</div>
      </div>
    </div>
  );
};

ScoreDisplay.propTypes = {
  currentScore: PropTypes.number,
  highScore: PropTypes.number,
  boosterActive: PropTypes.bool,
  boosterMultiplier: PropTypes.number
};

export default ScoreDisplay;
