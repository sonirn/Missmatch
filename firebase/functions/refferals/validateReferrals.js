// firebase/functions/referrals/validateReferrals.js
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized elsewhere
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Generate a unique referral code for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generated referral code
 */
exports.generateReferralCode = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Check if user already has a referral code
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // If user already has a referral code, return it
    if (userData.referralCode) {
      return {
        success: true,
        referralCode: userData.referralCode,
        isNew: false
      };
    }
    
    // Generate a new unique referral code
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters
    let code;
    let isUnique = false;
    
    // Try to generate a unique code
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code already exists
      const codeDoc = await db.collection('referralCodes').doc(code).get();
      isUnique = !codeDoc.exists;
    }
    
    // Start a batch transaction
    const batch = db.batch();
    
    // Update user with new referral code
    batch.update(db.collection('users').doc(userId), {
      referralCode: code
    });
    
    // Create referral code document for lookup
    batch.set(db.collection('referralCodes').doc(code), {
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Commit the batch
    await batch.commit();
    
    return {
      success: true,
      referralCode: code,
      isNew: true
    };
  } catch (error) {
    console.error('Error generating referral code:', error);
    throw error;
  }
};

/**
 * Check if a referral code is valid
 * @param {string} code - Referral code to check
 * @returns {Promise<boolean>} Whether the code is valid
 */
exports.isValidReferralCode = async (code) => {
  try {
    if (!code) {
      return false;
    }
    
    // Normalize code (uppercase)
    const normalizedCode = code.toUpperCase();
    
    // Check if code exists
    const codeDoc = await db.collection('referralCodes').doc(normalizedCode).get();
    
    return codeDoc.exists;
  } catch (error) {
    console.error('Error checking referral code:', error);
    return false;
  }
};

/**
 * Validate a referral code
 * @param {string} code - Referral code to validate
 * @returns {Promise<Object>} Validation result
 */
exports.validateReferralCode = async (code) => {
  try {
    if (!code) {
      return {
        valid: false,
        message: 'Referral code is required'
      };
    }
    
    // Normalize code (uppercase)
    const normalizedCode = code.toUpperCase();
    
    // Check if code exists
    const codeDoc = await db.collection('referralCodes').doc(normalizedCode).get();
    
    if (!codeDoc.exists) {
      return {
        valid: false,
        message: 'Invalid referral code'
      };
    }
    
    const codeData = codeDoc.data();
    
    // Check if referrer exists
    const referrerDoc = await db.collection('users').doc(codeData.userId).get();
    
    if (!referrerDoc.exists) {
      return {
        valid: false,
        message: 'Referrer not found'
      };
    }
    
    return {
      valid: true,
      referrerId: codeData.userId,
      referralCode: normalizedCode
    };
  } catch (error) {
    console.error('Error validating referral code:', error);
    throw error;
  }
};

/**
 * Apply a referral code during user registration
 * @param {string} referralCode - Referral code to apply
 * @param {string} newUserId - ID of the new user
 * @returns {Promise<Object>} Application result
 */
exports.applyReferralCode = async (referralCode, newUserId) => {
  try {
    if (!referralCode || !newUserId) {
      return {
        success: false,
        message: 'Referral code and new user ID are required'
      };
    }
    
    // Validate the referral code
    const validationResult = await exports.validateReferralCode(referralCode);
    
    if (!validationResult.valid) {
      return {
        success: false,
        message: validationResult.message
      };
    }
    
    const referrerId = validationResult.referrerId;
    
    // Make sure user isn't referring themselves
    if (referrerId === newUserId) {
      return {
        success: false,
        message: 'You cannot refer yourself'
      };
    }
    
    // Check if user already has a referrer
    const userDoc = await db.collection('users').doc(newUserId).get();
    
    if (!userDoc.exists) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    const userData = userDoc.data();
    
    if (userData.referredBy) {
      return {
        success: false,
        message: 'User already has a referrer'
      };
    }
    
    // Start a batch transaction
    const batch = db.batch();
    
    // Update user with referrer
    batch.update(db.collection('users').doc(newUserId), {
      referredBy: referrerId,
      referredAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update referrer's total referral count
    batch.update(db.collection('users').doc(referrerId), {
      referralCount: admin.firestore.FieldValue.increment(1)
    });
    
    // Create referral record
    const referralId = `${referrerId}_${newUserId}`;
    batch.set(db.collection('referrals').doc(referralId), {
      referrerId: referrerId,
      referredUserId: newUserId,
      referralCode: validationResult.referralCode,
      status: 'pending', // Will be updated to 'valid' once the referred user pays for a tournament
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Commit the batch
    await batch.commit();
    
    return {
      success: true,
      message: 'Referral code applied successfully',
      referrerId: referrerId,
      referralId: referralId
    };
  } catch (error) {
    console.error('Error applying referral code:', error);
    throw error;
  }
};

/**
 * Get referral link for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Referral link result
 */
exports.getReferralLink = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Check if user has a referral code
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    let referralCode = userData.referralCode;
    
    // If user doesn't have a referral code, generate one
    if (!referralCode) {
      const generateResult = await exports.generateReferralCode(userId);
      
      if (!generateResult.success) {
        throw new Error('Failed to generate referral code');
      }
      
      referralCode = generateResult.referralCode;
    }
    
    // Build referral link (relative URL for flexibility)
    const referralLink = `/?ref=${referralCode}`;
    
    return {
      success: true,
      referralCode: referralCode,
      referralLink: referralLink
    };
  } catch (error) {
    console.error('Error getting referral link:', error);
    throw error;
  }
};

/**
 * Validate referrals when a user pays for a tournament
 * @param {string} userId - User ID
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} Validation result
 */
exports.validateReferralsOnPayment = async (userId, tournamentType) => {
  try {
    const processReferrals = require('./processReferrals');
    
    if (!userId || !['mini', 'grand'].includes(tournamentType)) {
      throw new Error('Invalid user ID or tournament type');
    }
    
    // Process referral reward
    const result = await processReferrals.processReferralReward(userId, tournamentType);
    
    return result;
  } catch (error) {
    console.error('Error validating referrals on payment:', error);
    throw error;
  }
};
