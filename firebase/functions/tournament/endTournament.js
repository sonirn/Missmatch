// firebase/functions/tournament/endTournament.js
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const calculateRankings = require('./calculateRankings');
const distributePrizes = require('./distributePrizes');

// Initialize Firebase Admin if not already initialized elsewhere
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * End a tournament
 * @param {string} tournamentType - 'mini' or 'grand'
 * @param {boolean} distributePrizesImmediately - Whether to distribute prizes immediately
 * @returns {Promise<Object>} Tournament end result
 */
exports.endTournament = async (tournamentType, distributePrizesImmediately = false) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    console.log(`Ending ${tournamentType} tournament...`);

    // Get tournament settings
    const settingsRef = db.collection('settings').doc('tournament');
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists) {
      throw new Error('Tournament settings not found');
    }
    
    const settings = settingsDoc.data();
    
    // Check current status
    const currentStatus = settings[`${tournamentType}Status`] || 'upcoming';
    if (currentStatus !== 'active') {
      throw new Error(`Cannot end ${tournamentType} tournament: status is ${currentStatus}`);
    }

    // Get the tournament record
    const startDate = settings[`${tournamentType}StartDate`]?.toDate() || new Date();
    const tournamentId = `${tournamentType}_${startDate.getFullYear()}_${startDate.getMonth() + 1}`;
    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const tournamentDoc = await tournamentRef.get();
    
    if (!tournamentDoc.exists) {
      throw new Error(`Tournament record not found: ${tournamentId}`);
    }

    // Calculate final rankings
    console.log(`Calculating final rankings for ${tournamentType} tournament...`);
    const finalRankings = await calculateRankings.calculateRankings(tournamentType);
    
    // Update tournament status to completed
    await settingsRef.update({
      [`${tournamentType}Status`]: 'completed',
      [`${tournamentType}CompletedAt`]: admin.firestore.FieldValue.serverTimestamp(),
      [`${tournamentType}FinalParticipants`]: finalRankings.length,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update tournament record
    await tournamentRef.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      participants: finalRankings.length,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update rankings document
    const rankingsRef = db.collection('tournamentRankings').doc(tournamentType);
    await rankingsRef.update({
      tournamentStatus: 'completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      finalizedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`${tournamentType} tournament ended successfully with ${finalRankings.length} participants`);
    
    // Distribute prizes if requested
    let prizeDistributionResult = null;
    if (distributePrizesImmediately) {
      console.log(`Distributing prizes for ${tournamentType} tournament...`);
      try {
        prizeDistributionResult = await distributePrizes.distributePrizes(tournamentType);
        console.log(`Prize distribution completed for ${tournamentType} tournament`);
      } catch (prizeError) {
        console.error(`Error distributing prizes for ${tournamentType} tournament:`, prizeError);
        // Continue with tournament end even if prize distribution fails
      }
    }
    
    return {
      success: true,
      tournamentId: tournamentId,
      tournamentType: tournamentType,
      status: 'completed',
      completedAt: new Date(),
      participants: finalRankings.length,
      prizesDistributed: prizeDistributionResult ? true : false,
      message: `${tournamentType} tournament ended successfully`
    };
  } catch (error) {
    console.error(`Error ending ${tournamentType} tournament:`, error);
    throw error;
  }
};

/**
 * Check if a tournament should be ended based on its end date
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<boolean>} Whether the tournament should be ended
 */
exports.shouldEndTournament = async (tournamentType) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    // Get tournament settings
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    
    if (!settingsDoc.exists) {
      return false;
    }
    
    const settings = settingsDoc.data();
    
    // Check current status
    const currentStatus = settings[`${tournamentType}Status`] || 'upcoming';
    if (currentStatus !== 'active') {
      return false;
    }
    
    // Check end date
    const endDate = settings[`${tournamentType}EndDate`]?.toDate();
    if (!endDate) {
      return false;
    }
    
    // Compare with current time
    const now = new Date();
    return now >= endDate;
  } catch (error) {
    console.error(`Error checking if ${tournamentType} tournament should end:`, error);
    return false;
  }
};

/**
 * Scheduled function to auto-end tournaments based on their end date
 */
exports.scheduledTournamentEnder = async () => {
  try {
    console.log('Running scheduled tournament ender...');

    // Check mini tournament
    const shouldEndMini = await exports.shouldEndTournament('mini');
    if (shouldEndMini) {
      console.log('Auto-ending mini tournament...');
      await exports.endTournament('mini', true); // Auto-distribute prizes
    }
    
    // Check grand tournament
    const shouldEndGrand = await exports.shouldEndTournament('grand');
    if (shouldEndGrand) {
      console.log('Auto-ending grand tournament...');
      await exports.endTournament('grand', true); // Auto-distribute prizes
    }
    
    return { success: true, message: 'Scheduled tournament ender completed' };
  } catch (error) {
    console.error('Error in scheduled tournament ender:', error);
    throw error;
  }
};

/**
 * Create a new tournament after the current one ends
 * @param {string} tournamentType - 'mini' or 'grand'
 * @param {Object} config - Tournament configuration
 * @returns {Promise<Object>} Tournament creation result
 */
exports.createNextTournament = async (tournamentType, config = {}) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    console.log(`Creating next ${tournamentType} tournament...`);

    // Get tournament settings
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    
    if (!settingsDoc.exists) {
      throw new Error('Tournament settings not found');
    }
    
    const settings = settingsDoc.data();
    
    // Check current status
    const currentStatus = settings[`${tournamentType}Status`] || 'upcoming';
    if (currentStatus !== 'completed') {
      throw new Error(`Cannot create next ${tournamentType} tournament: current status is ${currentStatus}`);
    }

    // Calculate start date for next tournament (1 day after current end date)
    const currentEndDate = settings[`${tournamentType}EndDate`]?.toDate();
    if (!currentEndDate) {
      throw new Error(`Cannot determine end date for current ${tournamentType} tournament`);
    }
    
    const nextStartDate = new Date(currentEndDate.getTime() + (24 * 60 * 60 * 1000)); // 1 day after current end
    
    // Default configuration for next tournament
    const defaultNextConfig = {
      startDate: nextStartDate,
      durationDays: settings[`${tournamentType}DurationDays`] || 15,
      prizePool: {
        usdt: settings[`${tournamentType}PrizePoolUsdt`] || 0,
        dino: settings[`${tournamentType}PrizePoolDino`] || 0
      },
      entryFee: settings[`${tournamentType}EntryFee`] || 0
    };
    
    // Merge with provided config
    const nextConfig = {
      ...defaultNextConfig,
      ...config
    };
    
    // Initialize next tournament
    const startTournament = require('./startTournament');
    const result = await startTournament.initializeTournament(tournamentType, nextConfig);
    
    console.log(`Next ${tournamentType} tournament created successfully`);
    
    return result;
  } catch (error) {
    console.error(`Error creating next ${tournamentType} tournament:`, error);
    throw error;
  }
};

/**
 * Get tournament history
 * @param {number} limit - Maximum number of tournaments to return
 * @returns {Promise<Object>} Tournament history
 */
exports.getTournamentHistory = async (limit = 10) => {
  try {
    // Query tournaments collection
    const tournamentsSnapshot = await db.collection('tournaments')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    if (tournamentsSnapshot.empty) {
      return {
        success: true,
        message: 'No tournament history found',
        tournaments: []
      };
    }
    
    const tournaments = [];
    
    tournamentsSnapshot.forEach(doc => {
      const data = doc.data();
      tournaments.push({
        id: doc.id,
        type: data.type,
        status: data.status,
        startDate: data.startDate?.toDate() || null,
        endDate: data.endDate?.toDate() || null,
        startedAt: data.startedAt?.toDate() || null,
        completedAt: data.completedAt?.toDate() || null,
        participants: data.participants || 0,
        prizePoolUsdt: data.prizePoolUsdt || 0,
        prizePoolDino: data.prizePoolDino || 0
      });
    });
    
    return {
      success: true,
      tournaments: tournaments
    };
  } catch (error) {
    console.error('Error getting tournament history:', error);
    throw error;
  }
};
