// firebase/functions/referrals/processReferrals.js
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized elsewhere
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Constants for referral system
const REFERRAL_REWARD_AMOUNT = 1; // 1 USDT per valid referral
const MIN_PAYOUT_AMOUNT = 10; // Minimum 10 USDT for payout

/**
 * Process referral reward when a user pays for a tournament
 * @param {string} userId - ID of the user who paid
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} Processing result
 */
exports.processReferralReward = async (userId, tournamentType) => {
  try {
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    console.log(`Processing referral reward for user ${userId} for ${tournamentType} tournament...`);

    // Get user document to check if they were referred
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return {
        success: false,
        message: 'User not found',
        processed: false
      };
    }
    
    const userData = userDoc.data();
    
    // Check if user has a referrer
    if (!userData.referredBy) {
      return {
        success: true,
        message: 'User has no referrer',
        processed: false
      };
    }
    
    const referrerId = userData.referredBy;
    
    // Get the referral record
    const referralId = `${referrerId}_${userId}`;
    const referralRef = db.collection('referrals').doc(referralId);
    const referralDoc = await referralRef.get();
    
    // If no referral record exists or it's already valid, return
    if (!referralDoc.exists) {
      return {
        success: false,
        message: 'Referral record not found',
        processed: false
      };
    }
    
    const referralData = referralDoc.data();
    
    // Check if referral is already valid (to prevent double rewards)
    if (referralData.status === 'valid') {
      return {
        success: true,
        message: 'Referral already processed',
        processed: false,
        referralId: referralId
      };
    }
    
    // Start a batch transaction
    const batch = db.batch();
    
    // Update referral status to valid
    batch.update(referralRef, {
      status: 'valid',
      validatedAt: admin.firestore.FieldValue.serverTimestamp(),
      tournamentType: tournamentType
    });
    
    // Update referrer's stats
    batch.update(db.collection('users').doc(referrerId), {
      referralBalance: admin.firestore.FieldValue.increment(REFERRAL_REWARD_AMOUNT),
      referralCountValid: admin.firestore.FieldValue.increment(1)
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`Referral reward processed successfully for referrer ${referrerId}`);
    
    return {
      success: true,
      message: 'Referral reward processed successfully',
      processed: true,
      referralId: referralId,
      referrerId: referrerId,
      rewardAmount: REFERRAL_REWARD_AMOUNT
    };
  } catch (error) {
    console.error('Error processing referral reward:', error);
    throw error;
  }
};

/**
 * Process all pending referral payouts at the end of a tournament
 * @param {string} tournamentType - 'mini' or 'grand'
 * @param {FirebaseFirestore.WriteBatch} existingBatch - Optional existing batch
 * @returns {Promise<Object>} Processing result
 */
exports.processReferralPayouts = async (tournamentType, existingBatch = null) => {
  try {
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error(`Invalid tournament type: ${tournamentType}`);
    }

    console.log(`Processing referral payouts for ${tournamentType} tournament...`);

    // Create a new batch if one wasn't provided
    const batch = existingBatch || db.batch();
    
    // Get all users with referral balances
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
 * Get referral statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Referral statistics
 */
exports.getReferralStats = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Get referral code
    const referralCode = userData.referralCode || null;
    
    // Get all referrals for this user
    const referralsSnapshot = await db.collection('referrals')
      .where('referrerId', '==', userId)
      .get();
    
    // Calculate statistics
    const totalReferrals = referralsSnapshot.size;
    let validReferrals = 0;
    let pendingReferrals = 0;
    
    referralsSnapshot.forEach(doc => {
      const referralData = doc.data();
      if (referralData.status === 'valid') {
        validReferrals++;
      } else if (referralData.status === 'pending') {
        pendingReferrals++;
      }
    });
    
    // Build referral URL
    let referralUrl = null;
    if (referralCode) {
      referralUrl = `/?ref=${referralCode}`;
    }
    
    return {
      success: true,
      referralCode: referralCode,
      totalReferrals: totalReferrals,
      validReferrals: validReferrals,
      pendingReferrals: pendingReferrals,
      currentBalance: userData.referralBalance || 0,
      referralUrl: referralUrl,
      minimumPayout: MIN_PAYOUT_AMOUNT,
      rewardPerReferral: REFERRAL_REWARD_AMOUNT
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    throw error;
  }
};

/**
 * Get a list of referrals for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of referrals to return
 * @returns {Promise<Object>} Referral list
 */
exports.getReferralList = async (userId, limit = 50) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get all referrals for this user
    const referralsSnapshot = await db.collection('referrals')
      .where('referrerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    if (referralsSnapshot.empty) {
      return {
        success: true,
        message: 'No referrals found',
        referrals: []
      };
    }
    
    const referrals = [];
    
    // Process each referral
    for (const doc of referralsSnapshot.docs) {
      const referralData = doc.data();
      const referredUserId = referralData.referredUserId;
      
      // Get referred user info
      let referredUserInfo = {
        displayName: 'Anonymous User',
        email: null,
        photoURL: null
      };
      
      try {
        const referredUserDoc = await db.collection('users').doc(referredUserId).get();
        if (referredUserDoc.exists) {
          const referredUserData = referredUserDoc.data();
          referredUserInfo = {
            displayName: referredUserData.displayName || 'Anonymous User',
            email: referredUserData.email || null,
            photoURL: referredUserData.photoURL || null
          };
        }
      } catch (userError) {
        console.error(`Error getting referred user ${referredUserId}:`, userError);
        // Continue with default user info
      }
      
      referrals.push({
        id: doc.id,
        referredUser: referredUserInfo,
        status: referralData.status || 'pending',
        createdAt: referralData.createdAt?.toDate() || null,
        validatedAt: referralData.validatedAt?.toDate() || null,
        tournamentType: referralData.tournamentType || null,
        reward: referralData.status === 'valid' ? REFERRAL_REWARD_AMOUNT : 0
      });
    }
    
    return {
      success: true,
      referrals: referrals,
      count: referrals.length
    };
  } catch (error) {
    console.error('Error getting referral list:', error);
    throw error;
  }
};
