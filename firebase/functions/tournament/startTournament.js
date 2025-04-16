// firebase/functions/tournament/startTournament.js
const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Initialize Firebase Admin if not already initialized elsewhere
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Tournament configuration defaults
 */
const DEFAULT_TOURNAMENT_CONFIG = {
  mini: {
    durationDays: 15,
    prizePool: {
      usdt: 10500,
      dino: 1050
    },
    entryFee: 1
  },
  grand: {
    durationDays: 15,
    prizePool: {
      usdt: 605000,
      dino: 60500
    },
    entryFee: 10
  }
};

/**
 * Initialize a new tournament with configuration
 * @param {string} tournamentType - 'mini' or 'grand'
 * @param {Object} config - Tournament configuration
 * @returns {Promise<Object>} Tournament initialization result
 */
exports.initializeTournament = async (tournamentType, config = {}) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    console.log(`Initializing ${tournamentType} tournament...`);

    // Get tournament settings
    const settingsRef = db.collection('settings').doc('tournament');
    const settingsDoc = await settingsRef.get();
    
    // Create settings document if it doesn't exist
    if (!settingsDoc.exists) {
      await settingsRef.set({
        miniStatus: 'upcoming',
        grandStatus: 'upcoming',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Get current settings
    const currentSettings = settingsDoc.exists ? settingsDoc.data() : {};
    
    // Check if tournament is already active or completed
    const currentStatus = currentSettings[`${tournamentType}Status`] || 'upcoming';
    if (currentStatus === 'active') {
      throw new Error(`${tournamentType} tournament is already active`);
    }
    if (currentStatus === 'completed' && !config.force) {
      throw new Error(`${tournamentType} tournament is already completed. Use force=true to override.`);
    }

    // Merge default config with provided config
    const defaultConfig = DEFAULT_TOURNAMENT_CONFIG[tournamentType];
    const tournamentConfig = {
      ...defaultConfig,
      ...config
    };

    // Calculate start and end dates
    const startDate = config.startDate ? new Date(config.startDate) : new Date();
    const endDate = config.endDate ? new Date(config.endDate) : 
                   new Date(startDate.getTime() + (tournamentConfig.durationDays * 24 * 60 * 60 * 1000));

    // Create tournament record
    const tournamentData = {
      type: tournamentType,
      status: 'upcoming',
      startDate: admin.firestore.Timestamp.fromDate(startDate),
      endDate: admin.firestore.Timestamp.fromDate(endDate),
      durationDays: tournamentConfig.durationDays,
      prizePoolUsdt: tournamentConfig.prizePool.usdt,
      prizePoolDino: tournamentConfig.prizePool.dino,
      entryFee: tournamentConfig.entryFee,
      participants: 0,
      totalScores: 0,
      highestScore: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update tournament settings
    await settingsRef.update({
      [`${tournamentType}Status`]: 'upcoming',
      [`${tournamentType}StartDate`]: tournamentData.startDate,
      [`${tournamentType}EndDate`]: tournamentData.endDate,
      [`${tournamentType}PrizePoolUsdt`]: tournamentData.prizePoolUsdt,
      [`${tournamentType}PrizePoolDino`]: tournamentData.prizePoolDino,
      [`${tournamentType}EntryFee`]: tournamentData.entryFee,
      [`${tournamentType}Initialized`]: true,
      [`${tournamentType}PrizesDistributed`]: false,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create a tournament record in the tournaments collection
    const tournamentRef = db.collection('tournaments').doc(`${tournamentType}_${startDate.getFullYear()}_${startDate.getMonth() + 1}`);
    await tournamentRef.set(tournamentData);

    console.log(`${tournamentType} tournament initialized successfully`);
    
    return {
      success: true,
      tournamentId: tournamentRef.id,
      tournamentType: tournamentType,
      status: 'upcoming',
      startDate: startDate,
      endDate: endDate,
      message: `${tournamentType} tournament initialized successfully`
    };
  } catch (error) {
    console.error(`Error initializing ${tournamentType} tournament:`, error);
    throw error;
  }
};

/**
 * Start a tournament
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} Tournament start result
 */
exports.startTournament = async (tournamentType) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    console.log(`Starting ${tournamentType} tournament...`);

    // Get tournament settings
    const settingsRef = db.collection('settings').doc('tournament');
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists) {
      throw new Error('Tournament settings not found');
    }
    
    const settings = settingsDoc.data();
    
    // Check if tournament is initialized
    if (!settings[`${tournamentType}Initialized`]) {
      throw new Error(`${tournamentType} tournament is not initialized`);
    }
    
    // Check current status
    const currentStatus = settings[`${tournamentType}Status`] || 'upcoming';
    if (currentStatus === 'active') {
      throw new Error(`${tournamentType} tournament is already active`);
    }
    if (currentStatus === 'completed') {
      throw new Error(`${tournamentType} tournament is already completed`);
    }

    // Get the tournament record
    const startDate = settings[`${tournamentType}StartDate`]?.toDate() || new Date();
    const tournamentId = `${tournamentType}_${startDate.getFullYear()}_${startDate.getMonth() + 1}`;
    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const tournamentDoc = await tournamentRef.get();
    
    if (!tournamentDoc.exists) {
      throw new Error(`Tournament record not found: ${tournamentId}`);
    }

    // Update tournament status to active
    await settingsRef.update({
      [`${tournamentType}Status`]: 'active',
      [`${tournamentType}StartedAt`]: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update tournament record
    await tournamentRef.update({
      status: 'active',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create rankings document if it doesn't exist
    const rankingsRef = db.collection('tournamentRankings').doc(tournamentType);
    const rankingsDoc = await rankingsRef.get();
    
    if (!rankingsDoc.exists) {
      await rankingsRef.set({
        tournamentType: tournamentType,
        participants: [],
        totalParticipants: 0,
        tournamentStatus: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await rankingsRef.update({
        tournamentStatus: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`${tournamentType} tournament started successfully`);
    
    return {
      success: true,
      tournamentId: tournamentId,
      tournamentType: tournamentType,
      status: 'active',
      startedAt: new Date(),
      message: `${tournamentType} tournament started successfully`
    };
  } catch (error) {
    console.error(`Error starting ${tournamentType} tournament:`, error);
    throw error;
  }
};

/**
 * Get tournament status
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} Tournament status
 */
exports.getTournamentStatus = async (tournamentType) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    // Get tournament settings
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    
    if (!settingsDoc.exists) {
      return {
        success: false,
        message: 'Tournament settings not found'
      };
    }
    
    const settings = settingsDoc.data();
    
    // Get tournament status
    const status = settings[`${tournamentType}Status`] || 'upcoming';
    const startDate = settings[`${tournamentType}StartDate`]?.toDate() || null;
    const endDate = settings[`${tournamentType}EndDate`]?.toDate() || null;
    const startedAt = settings[`${tournamentType}StartedAt`]?.toDate() || null;
    const completedAt = settings[`${tournamentType}CompletedAt`]?.toDate() || null;
    const prizePoolUsdt = settings[`${tournamentType}PrizePoolUsdt`] || 0;
    const prizePoolDino = settings[`${tournamentType}PrizePoolDino`] || 0;
    const entryFee = settings[`${tournamentType}EntryFee`] || 0;
    const prizesDistributed = settings[`${tournamentType}PrizesDistributed`] || false;
    
    // Get tournament stats
    let participants = 0;
    let highestScore = 0;
    
    // Get rankings if they exist
    const rankingsDoc = await db.collection('tournamentRankings').doc(tournamentType).get();
    
    if (rankingsDoc.exists) {
      const rankingsData = rankingsDoc.data();
      participants = rankingsData.totalParticipants || 0;
      
      // Find highest score from participants
      if (rankingsData.participants && rankingsData.participants.length > 0) {
        highestScore = rankingsData.participants[0].highScore || 0;
      }
    }
    
    return {
      success: true,
      tournamentType: tournamentType,
      status: status,
      startDate: startDate,
      endDate: endDate,
      startedAt: startedAt,
      completedAt: completedAt,
      prizePool: {
        usdt: prizePoolUsdt,
        dino: prizePoolDino
      },
      entryFee: entryFee,
      participants: participants,
      highestScore: highestScore,
      prizesDistributed: prizesDistributed,
      timeRemaining: endDate ? Math.max(0, endDate.getTime() - Date.now()) : null
    };
  } catch (error) {
    console.error(`Error getting ${tournamentType} tournament status:`, error);
    throw error;
  }
};

/**
 * Scheduled function to auto-start tournaments based on their start date
 */
exports.scheduledTournamentStarter = async () => {
  try {
    console.log('Running scheduled tournament starter...');

    // Get tournament settings
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    
    if (!settingsDoc.exists) {
      console.log('Tournament settings not found, skipping auto-start');
      return;
    }
    
    const settings = settingsDoc.data();
    const now = new Date();
    
    // Check mini tournament
    if (settings.miniStatus === 'upcoming' && settings.miniStartDate) {
      const miniStartDate = settings.miniStartDate.toDate();
      
      if (miniStartDate <= now) {
        console.log('Auto-starting mini tournament...');
        await exports.startTournament('mini');
      }
    }
    
    // Check grand tournament
    if (settings.grandStatus === 'upcoming' && settings.grandStartDate) {
      const grandStartDate = settings.grandStartDate.toDate();
      
      if (grandStartDate <= now) {
        console.log('Auto-starting grand tournament...');
        await exports.startTournament('grand');
      }
    }
    
    return { success: true, message: 'Scheduled tournament starter completed' };
  } catch (error) {
    console.error('Error in scheduled tournament starter:', error);
    throw error;
  }
};
