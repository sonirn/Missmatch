// src/services/tournamentService.js
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { PAYMENT_CONFIG } from '../config/payment-config';

/**
 * Register a user for a tournament by verifying their payment
 * @param {string} userId - User ID
 * @param {string} tournamentType - 'mini' or 'grand'
 * @param {string} txHash - Transaction hash for payment verification
 * @returns {Promise<Object>} - Result of registration attempt
 */
export const registerForTournament = async (userId, tournamentType, txHash) => {
  try {
    // Call Firebase function to verify payment
    const verifyPayment = httpsCallable(functions, 'verifyPayment');
    const result = await verifyPayment({
      userId,
      tournamentType,
      txHash,
      receivingAddress: PAYMENT_CONFIG.RECEIVING_ADDRESS,
      amount: PAYMENT_CONFIG.getEntryFee(tournamentType)
    });
    
    if (result.data.success) {
      // Update user's tournament status
      const userRef = doc(db, 'users', userId);
      
      if (tournamentType === 'mini') {
        await updateDoc(userRef, { miniTournamentPaid: true });
      } else if (tournamentType === 'grand') {
        await updateDoc(userRef, { grandTournamentPaid: true });
      }
      
      // Check if user was referred and validate the referral if needed
      const userDoc = await getDoc(userRef);
      if (userDoc.exists() && userDoc.data().referredBy) {
        const referrerId = userDoc.data().referredBy;
        
        // Update referral status to valid
        const referralId = `${referrerId}_${userId}`;
        const referralRef = doc(db, 'referrals', referralId);
        
        // Check if referral document exists
        const referralDoc = await getDoc(referralRef);
        
        if (referralDoc.exists()) {
          await updateDoc(referralRef, { 
            isValid: true,
            validatedAt: serverTimestamp()
          });
        } else {
          // Create referral document if it doesn't exist
          await setDoc(referralRef, {
            referrerId,
            referredUserId: userId,
            createdAt: serverTimestamp(),
            isValid: true,
            validatedAt: serverTimestamp(),
            isPaid: false
          });
        }
      }
      
      // Record payment in database
      const paymentRef = doc(db, 'payments', `${userId}_${tournamentType}_${Date.now()}`);
      await setDoc(paymentRef, {
        userId,
        amount: PAYMENT_CONFIG.getEntryFee(tournamentType),
        type: "tournament",
        tournamentType,
        txHash,
        status: "verified",
        timestamp: serverTimestamp()
      });
      
      return { success: true, message: "Tournament registration successful!" };
    } else {
      return { success: false, message: result.data.message || "Payment verification failed" };
    }
  } catch (error) {
    console.error("Error registering for tournament:", error);
    return { success: false, message: "Failed to register for tournament. Please try again." };
  }
};

/**
 * Get tournament details by ID
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Object|null>} - Tournament data or null if not found
 */
export const getTournamentById = async (tournamentId) => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (tournamentDoc.exists()) {
      return {
        id: tournamentDoc.id,
        ...tournamentDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching tournament:", error);
    throw error;
  }
};
