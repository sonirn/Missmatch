// src/services/gameService.js
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Save a game score to Firestore
 * @param {string} userId - User ID
 * @param {number} score - Game score
 * @param {string} tournamentId - Tournament ID (mini or grand)
 * @param {Object} boosterInfo - Booster information if applied
 * @returns {Promise<Object>} Saved score document
 */
export const saveScore = async (userId, score, tournamentId, boosterInfo = null) => {
  try {
    // Validate parameters
    if (!userId || !score || !tournamentId) {
      throw new Error('Missing required parameters');
    }
    
    // Prepare score data
    const scoreData = {
      userId,
      score: Number(score),
      tournamentId,
      timestamp: serverTimestamp()
    };
    
    // Add booster information if provided
    if (boosterInfo) {
      scoreData.boosterApplied = true;
      scoreData.originalScore = boosterInfo.originalScore;
      scoreData.boosterId = boosterInfo.boosterId;
    } else {
      scoreData.boosterApplied = false;
    }
    
    // Use a transaction to ensure atomic operations
    return await runTransaction(db, async (transaction) => {
      // Save score to Firestore
      const scoreRef = doc(collection(db, 'scores'));
      transaction.set(scoreRef, scoreData);
      
      // Check if this is a new high score for the user
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentHighScore = userData.highScore || 0;
        
        if (score > currentHighScore) {
          transaction.update(userRef, {
            highScore: score,
            highScoreUpdatedAt: serverTimestamp()
          });
        }
        
        // Update booster usage if applicable
        if (boosterInfo && boosterInfo.boosterId && userData.activeBooster) {
          const booster = userData.activeBooster;
          
          // Only update if the booster is not unlimited and has games remaining
          if (!booster.unlimited && booster.gamesRemaining > 0) {
            const gamesRemaining = booster.gamesRemaining - 1;
            
            if (gamesRemaining > 0) {
              // Update games remaining
              transaction.update(userRef, {
                'activeBooster.gamesRemaining': gamesRemaining
              });
            } else {
              // Remove booster if no games remaining
              transaction.update(userRef, {
                activeBooster: null
              });
            }
          }
        }
      }
      
      return {
        id: scoreRef.id,
        ...scoreData,
        // Replace server timestamp with current date for immediate use
        timestamp: new Date()
      };
    });
  } catch (error) {
    console.error('Error saving score:', error);
    throw error;
  }
};

/**
 * Get user's high score
 * @param {string} userId - User ID
 * @returns {Promise<number>} High score
 */
export const getUserHighScore = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data().highScore || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting user high score:', error);
    throw error;
  }
};

/**
 * Apply booster to score
 * @param {number} score - Original score
 * @param {Object} booster - Booster object
 * @returns {number} Boosted score
 */
export const applyBooster = (score, booster) => {
  if (!booster) return score;
  
  // Currently all boosters double the score
  return score * 2;
};

/**
 * Get leaderboard for a specific tournament
 * @param {string} tournamentId - Tournament ID (mini or grand)
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Leaderboard entries
 */
export const getLeaderboard = async (tournamentId, resultLimit = 100) => {
  try {
    const scoresRef = collection(db, 'scores');
    const q = query(
      scoresRef,
      where('tournamentId', '==', tournamentId),
      orderBy('score', 'desc'),
      limit(resultLimit)
    );
    
    const querySnapshot = await getDocs(q);
    
    const leaderboard = [];
    const processedUsers = new Set(); // To track unique users
    
    for (const docSnapshot of querySnapshot.docs) {
      const scoreData = docSnapshot.data();
      const userId = scoreData.userId;
      
      // Only include the highest score for each user
      if (!processedUsers.has(userId)) {
        processedUsers.add(userId);
        
        // Get user details
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          leaderboard.push({
            id: docSnapshot.id,
            score: scoreData.score,
            userId: userId,
            displayName: userData.displayName || 'Anonymous',
            photoURL: userData.photoURL || null,
            timestamp: scoreData.timestamp,
            boosterApplied: scoreData.boosterApplied || false
          });
        }
      }
    }
    
    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};

/**
 * Get user's game history
 * @param {string} userId - User ID
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Game history
 */
export const getUserGameHistory = async (userId, resultLimit = 50) => {
  try {
    const scoresRef = collection(db, 'scores');
    const q = query(
      scoresRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(resultLimit)
    );
    
    const querySnapshot = await getDocs(q);
    
    const history = [];
    querySnapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      });
    });
    
    return history;
  } catch (error) {
    console.error('Error getting user game history:', error);
    throw error;
  }
};

/**
 * Get user's game statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Game statistics
 */
export const getUserGameStats = async (userId) => {
  try {
    // Get all user scores
    const scoresRef = collection(db, 'scores');
    const q = query(
      scoresRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        totalGames: 0,
        highestScore: 0,
        averageScore: 0,
        miniTournamentHighScore: 0,
        grandTournamentHighScore: 0,
        recentImprovement: 0
      };
    }
    
    const scores = [];
    querySnapshot.forEach((doc) => {
      scores.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Calculate statistics
    const totalGames = scores.length;
    const highestScore = Math.max(...scores.map(s => s.score));
    const averageScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / totalGames);
    
    // Get tournament-specific high scores
    const miniScores = scores.filter(s => s.tournamentId === 'mini');
    const grandScores = scores.filter(s => s.tournamentId === 'grand');
    
    const miniTournamentHighScore = miniScores.length > 0 
      ? Math.max(...miniScores.map(s => s.score)) 
      : 0;
      
    const grandTournamentHighScore = grandScores.length > 0 
      ? Math.max(...grandScores.map(s => s.score)) 
      : 0;
    
    // Calculate improvement (compare last 5 games vs previous 5)
    let recentImprovement = 0;
    
    if (totalGames >= 10) {
      const recent5 = scores.slice(0, 5);
      const previous5 = scores.slice(5, 10);
      
      const recent5Avg = recent5.reduce((sum, s) => sum + s.score, 0) / 5;
      const previous5Avg = previous5.reduce((sum, s) => sum + s.score, 0) / 5;
      
      recentImprovement = Math.round(((recent5Avg - previous5Avg) / previous5Avg) * 100);
    }
    
    return {
      totalGames,
      highestScore,
      averageScore,
      miniTournamentHighScore,
      grandTournamentHighScore,
      recentImprovement
    };
  } catch (error) {
    console.error('Error getting user game stats:', error);
    throw error;
  }
};

export default {
  saveScore,
  getUserHighScore,
  applyBooster,
  getLeaderboard,
  getUserGameHistory,
  getUserGameStats
};
