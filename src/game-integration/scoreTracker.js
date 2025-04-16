// src/game-integration/scoreTracker.js
import { useState, useEffect, useCallback } from 'react';
import userService from '../services/userService';

/**
 * Custom hook for tracking and submitting game scores
 * @returns {Object} Score tracking functions and state
 */
export const useScoreTracker = () => {
  const [sessionData, setSessionData] = useState({
    startTime: Date.now(),
    highScore: 0,
    lastReportedScore: 0,
    isActive: true
  });
  const [reportTimer, setReportTimer] = useState(null);

  /**
   * Initialize a new game session
   */
  const initGameSession = useCallback(() => {
    // Clear any existing report timer
    if (reportTimer) {
      clearInterval(reportTimer);
    }

    setSessionData({
      startTime: Date.now(),
      highScore: 0,
      lastReportedScore: 0,
      isActive: true
    });

    // Set up periodic score reporting
    const timer = setInterval(() => {
      setSessionData(prevData => {
        if (prevData.isActive && prevData.highScore > 0) {
          // Only report if score has changed
          if (prevData.highScore > prevData.lastReportedScore) {
            // Update last reported score
            const updatedData = {
              ...prevData,
              lastReportedScore: prevData.highScore
            };
            
            // Report progress score (without affecting high score)
            reportProgressScore(prevData.highScore);
            
            return updatedData;
          }
        }
        return prevData;
      });
    }, 5000); // Report every 5 seconds

    setReportTimer(timer);
  }, [reportTimer]);

  /**
   * Track score during gameplay
   * @param {number} originalScore - Original score from game
   * @param {number} boostedScore - Score after applying boosters
   */
  const trackScore = useCallback((originalScore, boostedScore) => {
    setSessionData(prevData => {
      // Ensure game session is active
      if (!prevData.isActive) {
        return {
          ...prevData,
          startTime: Date.now(),
          isActive: true,
          highScore: Math.max(prevData.highScore, boostedScore)
        };
      }

      // Update high score if needed
      if (boostedScore > prevData.highScore) {
        return {
          ...prevData,
          highScore: boostedScore
        };
      }

      return prevData;
    });
  }, []);

  /**
   * Report progress score to analytics (doesn't affect high score)
   * @param {number} score - Current score
   */
  const reportProgressScore = useCallback((score) => {
    // This could send to analytics or a real-time leaderboard
    console.log(`Progress score: ${score}`);
    
    // You could implement real-time leaderboard updates here
    // Example: firebase.firestore().collection('liveScores').doc(userId).set({ score });
  }, []);

  /**
   * Report final score when game ends
   * @param {number} finalScore - Final score from game
   * @param {number} multiplier - Booster multiplier applied
   * @returns {Promise<Object>} Score submission result
   */
  const reportFinalScore = useCallback(async (finalScore, multiplier = 1) => {
    try {
      // End the game session
      endGameSession();
      
      // Report score to user service
      const result = await userService.updateHighScore(finalScore, multiplier > 1);
      
      return result;
    } catch (error) {
      console.error('Error reporting final score:', error);
      throw error;
    }
  }, []);

  /**
   * End the current game session
   */
  const endGameSession = useCallback(() => {
    // Clear report timer
    if (reportTimer) {
      clearInterval(reportTimer);
      setReportTimer(null);
    }
    
    // Mark session as inactive
    setSessionData(prevData => ({
      ...prevData,
      isActive: false
    }));
  }, [reportTimer]);

  /**
   * Get current game session stats
   * @returns {Object} Game session stats
   */
  const getSessionStats = useCallback(() => {
    return {
      duration: sessionData.isActive ? Date.now() - sessionData.startTime : 0,
      highScore: sessionData.highScore,
      isActive: sessionData.isActive
    };
  }, [sessionData]);

  // Initialize game session on mount
  useEffect(() => {
    initGameSession();
    
    // Clean up on unmount
    return () => {
      if (reportTimer) {
        clearInterval(reportTimer);
      }
    };
  }, [initGameSession, reportTimer]);

  // Expose non-hook functions for direct use in adapter
  trackScore.direct = (originalScore, boostedScore) => {
    // Ensure game session is active
    if (!sessionData.isActive) {
      setSessionData({
        startTime: Date.now(),
        highScore: Math.max(sessionData.highScore, boostedScore),
        lastReportedScore: 0,
        isActive: true
      });
      return;
    }

    // Update high score if needed
    if (boostedScore > sessionData.highScore) {
      setSessionData(prevData => ({
        ...prevData,
        highScore: boostedScore
      }));
    }
  };

  reportFinalScore.direct = async (finalScore, multiplier = 1) => {
    try {
      // End the game session
      if (reportTimer) {
        clearInterval(reportTimer);
        setReportTimer(null);
      }
      
      setSessionData(prevData => ({
        ...prevData,
        isActive: false
      }));
      
      // Report score to user service
      return await userService.updateHighScore(finalScore, multiplier > 1);
    } catch (error) {
      console.error('Error reporting final score:', error);
      throw error;
    }
  };

  return {
    trackScore,
    reportFinalScore,
    initGameSession,
    endGameSession,
    getSessionStats,
    sessionData
  };
};

// Export direct functions for use in adapter
export const trackScore = (originalScore, boostedScore) => {
  // This is a placeholder that will be replaced with the direct function
  // when the hook is initialized
  console.log('Score tracker not initialized');
};

export const reportFinalScore = async (finalScore, multiplier = 1) => {
  // This is a placeholder that will be replaced with the direct function
  // when the hook is initialized
  console.log('Score tracker not initialized');
  return { success: false, message: 'Score tracker not initialized' };
};

// Initialize the direct functions when the module is loaded
let scoreTrackerInstance = null;

export const initScoreTracker = () => {
  const { trackScore: trackScoreHook, reportFinalScore: reportFinalScoreHook } = useScoreTracker();
  
  // Replace the exported functions with the hook implementations
  trackScore = trackScoreHook.direct;
  reportFinalScore = reportFinalScoreHook.direct;
  
  scoreTrackerInstance = { trackScore, reportFinalScore };
  return scoreTrackerInstance;
};
