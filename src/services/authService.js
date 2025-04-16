// src/services/authService.js
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Initialize the authentication service
 * @returns {Object} Auth service with methods for authentication
 */
const authService = () => {
  const auth = getAuth();
  
  /**
   * Sign in with Google
   * @returns {Promise<Object>} User object
   */
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in database
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create new user
        const referralCode = generateReferralCode(user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          referralCode: referralCode,
          referralCount: 0,
          referralBalance: 0,
          balance: 0,
          pendingWithdrawal: 0,
          totalWithdrawn: 0,
          miniTournamentPaid: false,
          grandTournamentPaid: false,
          totalReferralEarned: 0,
          settings: {
            emailNotifications: true,
            gameNotifications: true,
            tournamentReminders: true,
            soundEffects: true,
            darkMode: false
          }
        });
      } else {
        // Update last login
        await updateDoc(userRef, {
          lastLogin: serverTimestamp()
        });
      }
      
      // Check for referral code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('ref');
      
      if (referralCode) {
        await handleReferral(user.uid, referralCode);
      }
      
      return user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };
  
  /**
   * Sign out the current user
   * @returns {Promise<void>}
   */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };
  
  /**
   * Get the current authenticated user
   * @returns {Promise<Object|null>} User object or null if not authenticated
   */
  const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });
  };
  
  /**
   * Get user data from Firestore
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User data or null if not found
   */
  const getUserData = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return {
          id: userSnap.id,
          ...userSnap.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  };
  
  /**
   * Update user profile data
   * @param {string} userId - User ID
   * @param {Object} data - Data to update
   * @returns {Promise<void>}
   */
  const updateUserProfile = async (userId, data) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };
  
  /**
   * Generate a unique referral code for a user
   * @param {string} userId - User ID
   * @returns {string} Referral code
   */
  const generateReferralCode = (userId) => {
    // Generate a unique 8-character code based on user ID and timestamp
    const timestamp = Date.now().toString(36);
    const userPart = userId.substring(0, 4);
    return (userPart + timestamp).toUpperCase().substring(0, 8);
  };
  
  /**
   * Handle referral when a user signs up with a referral code
   * @param {string} userId - User ID who was referred
   * @param {string} referralCode - Referral code used
   * @returns {Promise<void>}
   */
  const handleReferral = async (userId, referralCode) => {
    try {
      // Find user with this referral code
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referralCode', '==', referralCode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No user found with this referral code');
        return;
      }
      
      const referrerDoc = querySnapshot.docs[0];
      const referrerId = referrerDoc.id;
      
      // Don't allow self-referrals
      if (referrerId === userId) {
        console.log('Cannot refer yourself');
        return;
      }
      
      // Check if user already has a referrer
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists() && userSnap.data().referredBy) {
        console.log('User already has a referrer');
        return;
      }
      
      // Update user with referrer
      await updateDoc(userRef, {
        referredBy: referrerId
      });
      
      // Create referral record
      await setDoc(doc(db, 'referrals', `${referrerId}_${userId}`), {
        referrerId,
        referredUserId: userId,
        createdAt: serverTimestamp(),
        isValid: false, // Will be set to true when user pays for tournament
        isPaid: false
      });
      
      console.log('Referral recorded successfully');
    } catch (error) {
      console.error('Error handling referral:', error);
    }
  };
  
  return {
    signInWithGoogle,
    signOut,
    getCurrentUser,
    getUserData,
    updateUserProfile
  };
};

export default authService();
