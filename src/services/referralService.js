// src/services/referralService.js
import firebase from '../firebase/config';

class ReferralService {
  constructor() {
    this.db = firebase.firestore();
    this.MIN_PAYOUT_AMOUNT = 10; // Minimum amount for referral payout (USDT)
    this.REFERRAL_REWARD = 1; // Amount earned per valid referral (USDT)
  }

  /**
   * Generate a unique referral code for a user
   * @param {string} userId - The user ID
   * @returns {Promise<string>} - The generated referral code
   */
  async generateReferralCode(userId) {
    try {
      // Check if user already has a referral code
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData && userData.referralCode) {
        return userData.referralCode;
      }
      
      // Generate a new code if none exists
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Save the code to the user's profile
      await this.db.collection('users').doc(userId).update({
        referralCode: code,
        referralBalance: userData?.referralBalance || 0,
        referralCount: userData?.referralCount || 0,
        referralCountValid: userData?.referralCountValid || 0
      });
      
      // Create a mapping document for easy lookup
      await this.db.collection('referralCodes').doc(code).set({
        userId: userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return code;
    } catch (error) {
      console.error('Error generating referral code:', error);
      throw error;
    }
  }

  /**
   * Apply a referral code when a user signs up
   * @param {string} referralCode - The referral code
   * @param {string} newUserId - The new user's ID
   * @returns {Promise<boolean>} - Whether the referral was applied successfully
   */
  async applyReferralCode(referralCode, newUserId) {
    try {
      // Validate the referral code
      const codeDoc = await this.db.collection('referralCodes').doc(referralCode).get();
      
      if (!codeDoc.exists) {
        return false; // Invalid code
      }
      
      const referrerId = codeDoc.data().userId;
      
      // Make sure the user isn't referring themselves
      if (referrerId === newUserId) {
        return false;
      }
      
      // Store the referral relationship
      await this.db.collection('users').doc(newUserId).update({
        referredBy: referrerId,
        referredAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Increment the referrer's count (total referrals)
      await this.db.collection('users').doc(referrerId).update({
        referralCount: firebase.firestore.FieldValue.increment(1)
      });
      
      // Create a referral record
      await this.db.collection('referrals').doc(`${referrerId}_${newUserId}`).set({
        referrerId: referrerId,
        referredUserId: newUserId,
        referralCode: referralCode,
        status: 'pending', // Will be updated to 'valid' once the referred user pays for a tournament
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error applying referral code:', error);
      throw error;
    }
  }

  /**
   * Validate a referral after a user pays for a tournament
   * @param {string} referrerId - The referrer's user ID
   * @param {string} referredUserId - The referred user's ID
   * @returns {Promise<void>}
   */
  async validateReferral(referrerId, referredUserId) {
    try {
      const referralId = `${referrerId}_${referredUserId}`;
      const referralDoc = await this.db.collection('referrals').doc(referralId).get();
      
      if (!referralDoc.exists) {
        console.log('Referral document does not exist');
        return;
      }
      
      // Mark the referral as valid
      await this.db.collection('referrals').doc(referralId).update({
        status: 'valid',
        validatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update referrer's valid referral count and balance
      await this.db.collection('users').doc(referrerId).update({
        referralCountValid: firebase.firestore.FieldValue.increment(1),
        referralBalance: firebase.firestore.FieldValue.increment(this.REFERRAL_REWARD)
      });
      
      console.log(`Referral validated: ${referrerId} referred ${referredUserId}`);
    } catch (error) {
      console.error('Error validating referral:', error);
      throw error;
    }
  }

  /**
   * Get a user's referral statistics
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - Referral statistics
   */
  async getReferralStats(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData) {
        throw new Error('User not found');
      }
      
      // Get all referrals for this user
      const referralsSnapshot = await this.db.collection('referrals')
        .where('referrerId', '==', userId)
        .get();
      
      // Count valid referrals
      const validReferrals = referralsSnapshot.docs.filter(doc => doc.data().status === 'valid').length;
      
      return {
        referralCode: userData.referralCode || null,
        totalReferrals: userData.referralCount || 0,
        validReferrals: validReferrals,
        pendingReferrals: (userData.referralCount || 0) - validReferrals,
        currentBalance: userData.referralBalance || 0,
        referralUrl: userData.referralCode ? `${window.location.origin}?ref=${userData.referralCode}` : null
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed list of a user's referrals
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - List of referrals
   */
  async getReferralList(userId) {
    try {
      const referralsSnapshot = await this.db.collection('referrals')
        .where('referrerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const referrals = [];
      
      for (const doc of referralsSnapshot.docs) {
        const referralData = doc.data();
        
        // Get the referred user's information
        const userDoc = await this.db.collection('users').doc(referralData.referredUserId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        
        referrals.push({
          id: doc.id,
          referredUser: userData ? {
            email: userData.email,
            displayName: userData.displayName || 'Anonymous User',
            photoURL: userData.photoURL || null
          } : { displayName: 'Deleted User' },
          status: referralData.status,
          createdAt: referralData.createdAt?.toDate() || null,
          validatedAt: referralData.validatedAt?.toDate() || null,
          reward: referralData.status === 'valid' ? this.REFERRAL_REWARD : 0
        });
      }
      
      return referrals;
    } catch (error) {
      console.error('Error getting referral list:', error);
      throw error;
    }
  }

  /**
   * Process referral payouts at the end of a tournament
   * @param {string} tournamentId - The tournament ID
   * @returns {Promise<void>}
   */
  async processReferralPayouts(tournamentId) {
    try {
      const batch = this.db.batch();
      const usersSnapshot = await this.db.collection('users')
        .where('referralBalance', '>', 0)
        .get();
      
      for (const doc of usersSnapshot.docs) {
        const userId = doc.id;
        const userData = doc.data();
        const referralBalance = userData.referralBalance || 0;
        
        if (referralBalance >= this.MIN_PAYOUT_AMOUNT) {
          // Add to user's main wallet balance
          const userRef = this.db.collection('users').doc(userId);
          batch.update(userRef, {
            walletBalance: firebase.firestore.FieldValue.increment(referralBalance),
            referralBalance: 0 // Reset referral balance
          });
          
          // Create a transaction record
          const transactionRef = this.db.collection('transactions').doc();
          batch.set(transactionRef, {
            userId,
            type: 'referral_payout',
            amount: referralBalance,
            currency: 'USDT',
            description: `Referral payout for tournament ${tournamentId}`,
            status: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // If below minimum, reset to zero as per requirements
          const userRef = this.db.collection('users').doc(userId);
          batch.update(userRef, {
            referralBalance: 0
          });
        }
      }
      
      // Commit all changes in a batch
      await batch.commit();
      console.log(`Processed referral payouts for tournament ${tournamentId}`);
    } catch (error) {
      console.error('Error processing referral payouts:', error);
      throw error;
    }
  }

  /**
   * Get a referral link for sharing
   * @param {string} userId - The user ID
   * @returns {Promise<string>} - The referral link
   */
  async getReferralLink(userId) {
    try {
      let code = await this.generateReferralCode(userId);
      const baseUrl = window.location.origin;
      return `${baseUrl}?ref=${code}`;
    } catch (error) {
      console.error('Error generating referral link:', error);
      throw error;
    }
  }

  /**
   * Check if a referral code is valid
   * @param {string} code - The referral code to check
   * @returns {Promise<boolean>} - Whether the code is valid
   */
  async isValidReferralCode(code) {
    try {
      const codeDoc = await this.db.collection('referralCodes').doc(code).get();
      return codeDoc.exists;
    } catch (error) {
      console.error('Error checking referral code:', error);
      return false;
    }
  }
}

export default new ReferralService();
