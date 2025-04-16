// firebase/functions/tournament/calculateRankings.js
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized elsewhere
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Calculate tournament rankings for Mini and Grand tournaments
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Array>} Array of ranked players
 */
exports.calculateRankings = async (tournamentType) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    console.log(`Calculating rankings for ${tournamentType} tournament...`);

    // Get tournament settings
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    if (!settingsDoc.exists) {
      throw new Error('Tournament settings not found');
    }

    const settings = settingsDoc.data();
    const tournamentStatus = settings[`${tournamentType}Status`] || 'upcoming';

    // Only calculate rankings if tournament is active or completed
    if (tournamentStatus === 'upcoming') {
      throw new Error(`${tournamentType} tournament has not started yet`);
    }

    // Query for users who have paid for the tournament
    const usersSnapshot = await db.collection('users')
      .where(`tournaments.${tournamentType}.paid`, '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log(`No participants found for ${tournamentType} tournament`);
      return [];
    }

    // Build list of users with their high scores
    const participants = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Get user's high score
      const highScore = userData.highScore || 0;
      
      participants.push({
        userId: userDoc.id,
        displayName: userData.displayName || 'Anonymous',
        email: userData.email || '',
        photoURL: userData.photoURL || null,
        highScore: highScore
      });
    }

    // Sort by high score in descending order
    participants.sort((a, b) => b.highScore - a.highScore);

    // Assign ranks (handling ties properly)
    let currentRank = 1;
    let currentScore = null;
    let sameRankCount = 0;

    const rankedParticipants = participants.map((participant, index) => {
      // If this is the first participant or the score is different from the previous one
      if (index === 0 || participant.highScore !== currentScore) {
        currentRank = index + 1;
        sameRankCount = 1;
      } else {
        // Same score as previous participant, so same rank
        sameRankCount++;
      }
      
      currentScore = participant.highScore;
      
      return {
        ...participant,
        rank: currentRank,
        sameRankCount: sameRankCount
      };
    });

    // Store the rankings in Firestore
    const rankingsRef = db.collection('tournamentRankings').doc(tournamentType);
    await rankingsRef.set({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      participants: rankedParticipants,
      totalParticipants: rankedParticipants.length,
      tournamentStatus: tournamentStatus
    });

    console.log(`${tournamentType} tournament rankings calculated successfully. Total participants: ${rankedParticipants.length}`);
    
    return rankedParticipants;
  } catch (error) {
    console.error(`Error calculating ${tournamentType} tournament rankings:`, error);
    throw error;
  }
};

/**
 * Get current tournament rankings
 * @param {string} tournamentType - 'mini' or 'grand'
 * @param {number} limit - Maximum number of rankings to return
 * @returns {Promise<Object>} Tournament rankings
 */
exports.getTournamentRankings = async (tournamentType, limit = 100) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    // Try to get cached rankings first
    const rankingsDoc = await db.collection('tournamentRankings').doc(tournamentType).get();
    
    if (rankingsDoc.exists) {
      const rankingsData = rankingsDoc.data();
      const participants = rankingsData.participants || [];
      
      // Return limited number of participants
      return {
        participants: participants.slice(0, limit),
        totalParticipants: participants.length,
        updatedAt: rankingsData.updatedAt?.toDate() || null,
        tournamentStatus: rankingsData.tournamentStatus
      };
    }
    
    // If no cached rankings exist, calculate them now
    const participants = await exports.calculateRankings(tournamentType);
    
    return {
      participants: participants.slice(0, limit),
      totalParticipants: participants.length,
      updatedAt: new Date(),
      tournamentStatus: 'active' // Default assumption
    };
  } catch (error) {
    console.error(`Error getting ${tournamentType} tournament rankings:`, error);
    throw error;
  }
};

/**
 * Get a user's rank in a tournament
 * @param {string} userId - User ID
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} User's rank information
 */
exports.getUserRank = async (userId, tournamentType) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    // Validate user ID
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get tournament rankings
    const rankingsDoc = await db.collection('tournamentRankings').doc(tournamentType).get();
    
    if (!rankingsDoc.exists) {
      // Calculate rankings if they don't exist
      await exports.calculateRankings(tournamentType);
      
      // Try to get rankings again
      const newRankingsDoc = await db.collection('tournamentRankings').doc(tournamentType).get();
      
      if (!newRankingsDoc.exists) {
        return { 
          found: false, 
          message: 'Tournament rankings not available' 
        };
      }
      
      const rankings = newRankingsDoc.data();
      const participants = rankings.participants || [];
      const userRanking = participants.find(p => p.userId === userId);
      
      if (!userRanking) {
        return { 
          found: false, 
          message: 'User not found in tournament rankings' 
        };
      }
      
      return {
        found: true,
        rank: userRanking.rank,
        highScore: userRanking.highScore,
        totalParticipants: participants.length,
        percentile: Math.round((1 - (userRanking.rank / participants.length)) * 100)
      };
    }
    
    const rankings = rankingsDoc.data();
    const participants = rankings.participants || [];
    const userRanking = participants.find(p => p.userId === userId);
    
    if (!userRanking) {
      return { 
        found: false, 
        message: 'User not found in tournament rankings' 
      };
    }
    
    return {
      found: true,
      rank: userRanking.rank,
      highScore: userRanking.highScore,
      totalParticipants: participants.length,
      percentile: Math.round((1 - (userRanking.rank / participants.length)) * 100)
    };
  } catch (error) {
    console.error(`Error getting user rank for ${tournamentType} tournament:`, error);
    throw error;
  }
};

/**
 * Scheduled function to update tournament rankings
 * This can be scheduled to run periodically during active tournaments
 */
exports.scheduledRankingsUpdate = async () => {
  try {
    // Get tournament settings
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    if (!settingsDoc.exists) {
      console.log('Tournament settings not found, skipping rankings update');
      return;
    }

    const settings = settingsDoc.data();
    
    // Check mini tournament status
    if (settings.miniStatus === 'active') {
      await exports.calculateRankings('mini');
      console.log('Mini tournament rankings updated successfully');
    }
    
    // Check grand tournament status
    if (settings.grandStatus === 'active') {
      await exports.calculateRankings('grand');
      console.log('Grand tournament rankings updated successfully');
    }
    
    return { success: true, message: 'Tournament rankings updated successfully' };
  } catch (error) {
    console.error('Error updating tournament rankings:', error);
    throw error;
  }
};
