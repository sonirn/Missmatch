// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import firebase from '../firebase/config';
import userService from '../services/userService';
import referralService from '../services/referralService';
import { handleError } from '../utils/errorHandler';

// Create the context
export const AuthContext = createContext();

/**
 * AuthContext Provider component
 * Manages authentication state and user information
 */
export const AuthProvider = ({ children }) => {
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // Track initialization
  const [initialized, setInitialized] = useState(false);

  /**
   * Sign in with Google
   * @param {string} referralCode - Optional referral code
   * @returns {Promise<Object>} Authentication result
   */
  const signInWithGoogle = useCallback(async (referralCode = null) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      const result = await userService.signInWithGoogle(referralCode);
      
      // User profile will be updated by the auth state change listener
      return { success: true, user: result };
    } catch (error) {
      const errorMessage = handleError(error, 'Google Sign In');
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign out the current user
   * @returns {Promise<Object>} Sign out result
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setAuthError(null);
      
      await userService.signOut();
      
      // Clear user state
      setUserProfile(null);
      
      return { success: true };
    } catch (error) {
      const errorMessage = handleError(error, 'Sign Out');
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch user profile data
   * @returns {Promise<Object>} User profile data
   */
  const fetchUserProfile = useCallback(async () => {
    try {
      if (!currentUser) {
        setUserProfile(null);
        return null;
      }
      
      const profile = await userService.getCurrentUserProfile();
      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, [currentUser]);

  /**
   * Update user display name
   * @param {string} displayName - New display name
   * @returns {Promise<Object>} Update result
   */
  const updateDisplayName = useCallback(async (displayName) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      if (!currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      // Update profile
      await userService.updateUserProfile(displayName, currentUser.photoURL);
      
      // Refresh user profile
      await fetchUserProfile();
      
      return { success: true };
    } catch (error) {
      const errorMessage = handleError(error, 'Update Display Name');
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserProfile]);

  /**
   * Generate a referral code for the current user
   * @returns {Promise<Object>} Referral code generation result
   */
  const generateReferralCode = useCallback(async () => {
    try {
      setLoading(true);
      setAuthError(null);
      
      if (!currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      const code = await referralService.generateReferralCode(currentUser.uid);
      
      // Refresh user profile to get the new code
      await fetchUserProfile();
      
      return { success: true, code };
    } catch (error) {
      const errorMessage = handleError(error, 'Generate Referral Code');
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserProfile]);

  /**
   * Check if a user is authenticated
   * @returns {boolean} Whether user is authenticated
   */
  const isAuthenticated = useCallback(() => {
    return !!currentUser;
  }, [currentUser]);

  /**
   * Clear any authentication errors
   */
  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Set up auth state change listener
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          await fetchUserProfile();
        } catch (error) {
          console.error('Error in auth state change:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
      setInitialized(true);
    });
    
    return () => unsubscribe();
  }, [fetchUserProfile]);

  // Context value
  const value = {
    currentUser,
    userProfile,
    loading,
    authError,
    initialized,
    signInWithGoogle,
    signOut,
    fetchUserProfile,
    updateDisplayName,
    generateReferralCode,
    isAuthenticated,
    clearAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
