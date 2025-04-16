// src/services/boosterService.js
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { PAYMENT_CONFIG } from '../config/payment-config';

/**
 * Purchase a booster using transaction hash verification
 * @param {string} userId - User ID
 * @param {string} boosterType - 'booster1', 'booster2', or 'booster3'
 * @param {string} txHash - Transaction hash for payment verification
 * @returns {Promise<Object>} - Result of purchase attempt
 */
export const purchaseBooster = async (userId, boosterType, txHash) => {
  try {
    // Call Firebase function to verify payment
    const verifyPayment = httpsCallable(functions, 'verifyPayment');
    const result = await verifyPayment({
      userId,
      boosterType,
      txHash,
      receivingAddress: PAYMENT_CONFIG.RECEIVING_ADDRESS,
      amount: PAYMENT_CONFIG.getBoosterPrice(boosterType)
    });
    
    if (result.data.success) {
      // Update user's active booster
      const userRef = doc(db, 'users', userId);
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        return { success: false, message: "User not found" };
      }
      
      // Check if user is registered for grand tournament
      if (!userDoc.data().grandTournamentPaid) {
        return { 
          success: false, 
          message: "You must be registered for the Grand Tournament to use boosters"
        };
      }
      
      // Create booster data based on type
      let boosterData = {
        type: boosterType,
        purchasedAt: serverTimestamp(),
        activatedAt: serverTimestamp()
      };
      
      // Add specific properties based on booster type
      switch (boosterType) {
        case 'booster1':
          boosterData.gamesRemaining = 10;
          break;
        case 'booster2':
          boosterData.gamesRemaining = 100;
          break;
        case 'booster3':
          boosterData.unlimited = true;
          break;
        default:
          return { success: false, message: "Invalid booster type" };
      }
      
      // Update user with new booster
      await updateDoc(userRef, { activeBooster: boosterData });
      
      // Record payment in database
      const paymentRef = doc(db, 'payments', `${userId}_${boosterType}_${Date.now()}`);
      await setDoc(paymentRef, {
        userId,
        amount: PAYMENT_CONFIG.getBoosterPrice(boosterType),
        type: "booster",
        boosterType,
        txHash,
        status: "verified",
        timestamp: serverTimestamp()
      });
      
      return { 
        success: true, 
        message: "Booster purchased successfully!",
        transaction: result.data.transaction
      };
    } else {
      return { success: false, message: result.data.message || "Payment verification failed" };
    }
  } catch (error) {
    console.error("Error purchasing booster:", error);
    return { success: false, message: "Failed to purchase booster. Please try again." };
  }
};

/**
 * Apply booster to a game score
 * @param {string} userId - User ID
 * @param {number} score - Original game score
 * @returns {Promise<Object>} - Result with modified score if booster is active
 */
export const applyBoosterToScore = async (userId, score) => {
  try {
    // Get user document to check for active booster
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { 
        success: true, 
        boostedScore: score, 
        originalScore: score, 
        boosterApplied: false 
      };
    }
    
    const userData = userDoc.data();
    
    // Check if user has an active booster
    if (!userData.activeBooster) {
      return { 
        success: true, 
        boostedScore: score, 
        originalScore: score, 
        boosterApplied: false 
      };
    }
    
    const activeBooster = userData.activeBooster;
    let boosterApplied = false;
    let boostedScore = score;
    let gamesRemaining = null;
    
    // Apply booster based on type
    if (activeBooster.type === 'booster3' && activeBooster.unlimited) {
      // Unlimited booster - always applies
      boostedScore = score * 2;
      boosterApplied = true;
    } else if (
      (activeBooster.type === 'booster1' || activeBooster.type === 'booster2') && 
      activeBooster.gamesRemaining > 0
    ) {
      // Limited use booster - apply and decrement counter
      boostedScore = score * 2;
      boosterApplied = true;
      
      // Decrement games remaining
      gamesRemaining = activeBooster.gamesRemaining - 1;
      
      // Update booster in database
      if (gamesRemaining <= 0) {
        // Remove booster if no games remaining
        await updateDoc(userRef, { activeBooster: null });
      } else {
        // Update games remaining
        await updateDoc(userRef, { 
          'activeBooster.gamesRemaining': gamesRemaining 
        });
      }
    }
    
    return {
      success: true,
      boostedScore,
      originalScore: score,
      boosterApplied,
      gamesRemaining
    };
  } catch (error) {
    console.error("Error applying booster:", error);
    // Return original score if there's an error
    return { 
      success: false, 
      boostedScore: score, 
      originalScore: score, 
      boosterApplied: false,
      error: error.message
    };
  }
};
