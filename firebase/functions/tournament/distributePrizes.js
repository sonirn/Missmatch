// firebase/functions/tournament/distributePrizes.js
const admin = require('firebase-admin');
const calculateRankings = require('./calculateRankings');

// Initialize Firebase Admin if not already initialized elsewhere
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Prize pool configuration for Mini and Grand tournaments
 * These match the prize structures specified in your requirements
 */
const PRIZE_POOLS = {
  mini: {
    totalUsdt: 10500,
    totalDino: 1050,
    ranks: [
      { rank: 1, usdt: 1000, dino: 100 },
      { rank: 2, usdt: 900, dino: 90 },
      { rank: 3, usdt: 800, dino: 80 },
      { rank: 4, usdt: 700, dino: 70 },
      { rank: 5, usdt: 600, dino: 60 },
      { rankStart: 6, rankEnd: 10, usdt: 400, dino: 40 },
      { rankStart: 11, rankEnd: 50, usdt: 100, dino: 10 },
      { rankStart: 51, rankEnd: 100, usdt: 10, dino: 1 }
    ]
  },
  grand: {
    totalUsdt: 605000,
    totalDino: 60500,
    ranks: [
      { rank: 1, usdt: 100000, dino: 10000 },
      { rank: 2, usdt: 90000, dino: 9000 },
      { rank: 3, usdt: 80000, dino: 8000 },
      { rank: 4, usdt: 70000, dino: 7000 },
      { rank: 5, usdt: 60000, dino: 6000 },
      { rankStart: 6, rankEnd: 10, usdt: 30000, dino: 3000 },
      { rankStart: 11, rankEnd: 50, usdt: 1000, dino: 100 },
      { rankStart: 51, rankEnd: 100, usdt: 100, dino: 10 },
      { rankStart: 101, rankEnd: 10000, usdt: 1, dino: 1 }
    ],
    // Random prize
    randomPrize: { usdt: 100, dino: 10 }
  }
};

/**
 * Calculate prize for a specific rank
 * @param {string} tournamentType - 'mini' or 'grand'
 * @param {number} rank - Player's rank
 * @returns {Object} Prize amount in USDT and DINO
 */
const calculatePrize = (tournamentType, rank) => {
  if (!['mini', 'grand'].includes(tournamentType)) {
    throw new Error(`Invalid tournament type: ${tournamentType}`);
  }

  if (!rank || rank < 1) {
    return { usdt: 0, dino: 0 };
  }

  const prizePool = PRIZE_POOLS[tournamentType];
  
  // Find the prize tier for this rank
  for (const tier of prizePool.ranks) {
    // Single rank tier
    if (tier.rank && tier.rank === rank) {
      return { usdt: tier.usdt, dino: tier.dino };
    }
    
    // Range tier
    if (tier.rankStart && tier.rankEnd && 
        rank >= tier.rankStart && rank <= tier.rankEnd) {
      return { usdt: tier.usdt, dino: tier.dino };
    }
  }
  
  // No prize for this rank
  return { usdt: 0, dino: 0 };
};

/**
 * Select a random winner for the Grand Tournament special prize
 * @param {Array} participants - List of tournament participants
 * @returns {Object|null} Random winner or null if no eligible participants
 */
const selectRandomWinner = (participants) => {
  // Select from participants ranked > 100 to avoid giving extra prizes to top winners
  const eligibleParticipants = participants.filter(p => p.rank > 100);
  
  if (eligibleParticipants.length === 0) {
    return null;
  }
  
  // Generate random index and return the participant
  const randomIndex = Math.floor(Math.random() * eligibleParticipants.length);
  return eligibleParticipants[randomIndex];
};

/**
 * Distribute prizes to winners of a tournament
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} Distribution results
 */
exports.distributePrizes = async (tournamentType) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    console.log(`Starting prize distribution for ${tournamentType} tournament...`);

    // Get tournament settings
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    if (!settingsDoc.exists) {
      throw new Error('Tournament settings not found');
    }

    const settings = settingsDoc.data();
    const tournamentStatus = settings[`${tournamentType}Status`] || 'upcoming';

    // Only distribute prizes if tournament is completed
    if (tournamentStatus !== 'completed') {
      throw new Error(`Cannot distribute prizes: ${tournamentType} tournament status is ${tournamentStatus}`);
    }

    // Check if prizes were already distributed
    if (settings[`${tournamentType}PrizesDistributed`] === true) {
      throw new Error(`Prizes for ${tournamentType} tournament have already been distributed`);
    }

    // Calculate final rankings
    const rankings = await calculateRankings.calculateRankings(tournamentType);
    
    if (!rankings || rankings.length === 0) {
      throw new Error(`No participants found for ${tournamentType} tournament`);
    }

    console.log(`Found ${rankings.length} participants for prize distribution`);

    // Start a batch for all prize distributions
    const batch = db.batch();
    const prizeDistributions = [];
    let totalUsdtDistributed = 0;
    let totalDinoDistributed = 0;
    let winnersCount = 0;

    // Process each ranked participant
    for (const participant of rankings) {
      // Calculate prize based on rank
      const prize = calculatePrize(tournamentType, participant.rank);
      
      // Skip if no prize
      if (prize.usdt === 0 && prize.dino === 0) {
        continue;
      }

      winnersCount++;

      // Get user reference
      const userRef = db.collection('users').doc(participant.userId);
      
      // Add prize to user's wallet
      batch.update(userRef, {
        walletBalance: admin.firestore.FieldValue.increment(prize.usdt),
        dinoCoinBalance: admin.firestore.FieldValue.increment(prize.dino)
      });

      // Create transaction record
      const transactionRef = db.collection('transactions').doc();
      batch.set(transactionRef, {
        userId: participant.userId,
        type: 'tournament_prize',
        amount: prize.usdt,
        dinoCoin: prize.dino,
        currency: 'USDT',
        description: `${tournamentType === 'mini' ? 'Mini' : 'Grand'} Tournament Prize - Rank ${participant.rank}`,
        tournamentType: tournamentType,
        rank: participant.rank,
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Record distribution for logging
      prizeDistributions.push({
        userId: participant.userId,
        displayName: participant.displayName,
        email: participant.email,
        rank: participant.rank,
        highScore: participant.highScore,
        prize: {
          usdt: prize.usdt,
          dino: prize.dino
        },
        prizeType: 'rank'
      });

      // Update totals
      totalUsdtDistributed += prize.usdt;
      totalDinoDistributed += prize.dino;
    }

    // For Grand Tournament, distribute a random prize
    if (tournamentType === 'grand' && rankings.length > 0) {
      const randomWinner = selectRandomWinner(rankings);
      
      if (randomWinner) {
        const randomPrize = PRIZE_POOLS.grand.randomPrize;
        
        // Get user reference
        const userRef = db.collection('users').doc(randomWinner.userId);
        
        // Add random prize to user's wallet
        batch.update(userRef, {
          walletBalance: admin.firestore.FieldValue.increment(randomPrize.usdt),
          dinoCoinBalance: admin.firestore.FieldValue.increment(randomPrize.dino)
        });

        // Create transaction record
        const transactionRef = db.collection('transactions').doc();
        batch.set(transactionRef, {
          userId: randomWinner.userId,
          type: 'tournament_random_prize',
          amount: randomPrize.usdt,
          dinoCoin: randomPrize.dino,
          currency: 'USDT',
          description: `Grand Tournament Random Prize Winner`,
          tournamentType: 'grand',
          rank: randomWinner.rank,
          status: 'completed',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Add to distribution records
        prizeDistributions.push({
          userId: randomWinner.userId,
          displayName: randomWinner.displayName,
          email: randomWinner.email,
          rank: randomWinner.rank,
          highScore: randomWinner.highScore,
          prize: {
            usdt: randomPrize.usdt,
            dino: randomPrize.dino
          },
          prizeType: 'random'
        });

        // Update totals
        totalUsdtDistributed += randomPrize.usdt;
        totalDinoDistributed += randomPrize.dino;
        winnersCount++;
      }
    }

    // Record the distribution summary
    const distributionRef = db.collection('prizeDistributions').doc(tournamentType);
    batch.set(distributionRef, {
      tournamentType: tournamentType,
      totalParticipants: rankings.length,
      totalWinners: winnersCount,
      totalUsdtDistributed: totalUsdtDistributed,
      totalDinoDistributed: totalDinoDistributed,
      distributedAt: admin.firestore.FieldValue.serverTimestamp(),
      distributions: prizeDistributions
    });

    // Update tournament status to indicate prizes have been distributed
    const tournamentRef = db.collection('settings').doc('tournament');
    batch.update(tournamentRef, {
      [`${tournamentType}PrizesDistributed`]: true,
      [`${tournamentType}PrizesDistributedAt`]: admin.firestore.FieldValue.serverTimestamp()
    });

    // Process referral payouts
    await processReferralPayouts(tournamentType, batch);

    // Commit all changes
    await batch.commit();

    console.log(`Prize distribution completed for ${tournamentType} tournament`);
    console.log(`Distributed ${totalUsdtDistributed} USDT and ${totalDinoDistributed} DINO to ${winnersCount} winners`);

    return {
      success: true,
      tournamentType: tournamentType,
      totalParticipants: rankings.length,
      totalWinners: winnersCount,
      totalUsdtDistributed: totalUsdtDistributed,
      totalDinoDistributed: totalDinoDistributed,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error distributing prizes for ${tournamentType} tournament:`, error);
    throw error;
  }
};

/**
 * Process referral payouts at the end of a tournament
 * @param {string} tournamentType - 'mini' or 'grand'
 * @param {FirebaseFirestore.WriteBatch} existingBatch - Optional existing batch
 * @returns {Promise<Object>} Payout results
 */
const processReferralPayouts = async (tournamentType, existingBatch = null) => {
  try {
    console.log(`Processing referral payouts for ${tournamentType} tournament...`);

    // Create a new batch if one wasn't provided
    const batch = existingBatch || db.batch();
    
    // Minimum referral balance required for payout
    const MIN_PAYOUT_AMOUNT = 10;
    
    // Get users with referral balances
    const usersSnapshot = await db.collection('users')
      .where('referralBalance', '>', 0)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('No users with referral balances found');
      
      // If we created a new batch, commit it
      if (!existingBatch) {
        await batch.commit();
      }
      
      return { 
        success: true, 
        usersProcessed: 0, 
        totalPaidOut: 0, 
        totalReset: 0 
      };
    }
    
    let usersProcessed = 0;
    let totalPaidOut = 0;
    let totalReset = 0;
    
    // Process each user with a referral balance
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const referralBalance = userData.referralBalance || 0;
      
      // Skip users with zero balance (shouldn't happen due to query, but just in case)
      if (referralBalance <= 0) {
        continue;
      }
      
      usersProcessed++;
      
      if (referralBalance >= MIN_PAYOUT_AMOUNT) {
        // Add to user's main wallet balance
        batch.update(userDoc.ref, {
          walletBalance: admin.firestore.FieldValue.increment(referralBalance),
          referralBalance: 0 // Reset referral balance
        });
        
        // Create a transaction record
        const transactionRef = db.collection('transactions').doc();
        batch.set(transactionRef, {
          userId,
          type: 'referral_payout',
          amount: referralBalance,
          currency: 'USDT',
          description: `Referral payout for ${tournamentType} tournament`,
          status: 'completed',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        totalPaidOut += referralBalance;
      } else {
        // If below minimum, reset to zero as per requirements
        batch.update(userDoc.ref, {
          referralBalance: 0
        });
        
        totalReset += referralBalance;
      }
    }
    
    // If we created a new batch, commit it
    if (!existingBatch) {
      await batch.commit();
    }
    
    console.log(`Referral payouts processed: ${usersProcessed} users, ${totalPaidOut} USDT paid out, ${totalReset} USDT reset`);
    
    return {
      success: true,
      usersProcessed,
      totalPaidOut,
      totalReset
    };
  } catch (error) {
    console.error(`Error processing referral payouts for ${tournamentType} tournament:`, error);
    
    // If we created a new batch, we don't need to commit it on error
    // If we're using an existing batch, let the caller handle the error
    if (existingBatch) {
      throw error;
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get prize distribution history for a tournament
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} Prize distribution history
 */
exports.getPrizeDistributionHistory = async (tournamentType) => {
  try {
    // Validate tournament type
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }
    
    const distributionDoc = await db.collection('prizeDistributions').doc(tournamentType).get();
    
    if (!distributionDoc.exists) {
      return {
        success: false,
        message: `No prize distribution found for ${tournamentType} tournament`
      };
    }
    
    const distributionData = distributionDoc.data();
    
    return {
      success: true,
      tournamentType: tournamentType,
      totalParticipants: distributionData.totalParticipants,
      totalWinners: distributionData.totalWinners,
      totalUsdtDistributed: distributionData.totalUsdtDistributed,
      totalDinoDistributed: distributionData.totalDinoDistributed,
      distributedAt: distributionData.distributedAt?.toDate() || null,
      // Limit the distributions to top 100 for API response size
      distributions: (distributionData.distributions || []).slice(0, 100)
    };
  } catch (error) {
    console.error(`Error getting prize distribution history for ${tournamentType} tournament:`, error);
    throw error;
  }
};

/**
 * Get a user's prize winnings
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User's prize winnings
 */
exports.getUserPrizeWinnings = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Query transactions for tournament prizes
    const transactionsSnapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .where('type', 'in', ['tournament_prize', 'tournament_random_prize'])
      .orderBy('createdAt', 'desc')
      .get();
    
    if (transactionsSnapshot.empty) {
      return {
        success: true,
        message: 'No prize winnings found',
        winnings: []
      };
    }
    
    const winnings = [];
    let totalUsdt = 0;
    let totalDino = 0;
    
    transactionsSnapshot.forEach(doc => {
      const data = doc.data();
      winnings.push({
        id: doc.id,
        tournamentType: data.tournamentType,
        rank: data.rank,
        amount: data.amount,
        dinoCoin: data.dinoCoin,
        type: data.type,
        description: data.description,
        createdAt: data.createdAt?.toDate() || null
      });
      
      totalUsdt += data.amount || 0;
      totalDino += data.dinoCoin || 0;
    });
    
    return {
      success: true,
      totalUsdt,
      totalDino,
      winnings
    };
  } catch (error) {
    console.error(`Error getting prize winnings for user ${userId}:`, error);
    throw error;
  }
};

// Export additional functions
exports.calculatePrize = calculatePrize;
exports.processReferralPayouts = processReferralPayouts;
