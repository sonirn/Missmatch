// src/components/profile/UserProfile.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Loader from '../common/Loader';
import ErrorMessage from '../common/ErrorMessage';
import ReferralSystem from './ReferralSystem';
import '../../styles/components/UserProfile.css';

/**
 * UserProfile Component
 * Displays user profile information with tabs for account, tournaments, and referrals
 */
const UserProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('account');
  
  // Profile editing states
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPhotoURL, setNewPhotoURL] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfileData({
            ...userData,
            id: user.uid
          });
          setNewDisplayName(userData.displayName || user.displayName || '');
          setNewPhotoURL(userData.photoURL || user.photoURL || '');
        } else {
          setError('User profile not found. Please contact support.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Handle profile editing
  const handleEditProfile = () => {
    setIsEditing(true);
    setSuccessMessage('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewDisplayName(profileData.displayName || user.displayName || '');
    setNewPhotoURL(profileData.photoURL || user.photoURL || '');
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (newDisplayName.trim() === '') {
      setError('Display name cannot be empty.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: newDisplayName.trim(),
        photoURL: newPhotoURL.trim()
      });

      // Update local state
      setProfileData({
        ...profileData,
        displayName: newDisplayName.trim(),
        photoURL: newPhotoURL.trim()
      });
      
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Copy referral code to clipboard
  const copyReferralCode = () => {
    if (!profileData?.referralCode) return;
    
    navigator.clipboard.writeText(profileData.referralCode);
    
    // Show copied message
    const copyButton = document.querySelector('.copy-button');
    if (copyButton) {
      const originalText = copyButton.innerText;
      copyButton.innerText = 'Copied!';
      setTimeout(() => {
        copyButton.innerText = originalText;
      }, 2000);
    }
  };
  
  if (loading) {
    return <Loader message="Loading profile..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  if (!user || !profileData) {
    return <ErrorMessage message="Please sign in to view your profile." />;
  }
  
  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          {profileData.photoURL ? (
            <img src={profileData.photoURL} alt={profileData.displayName || 'User'} />
          ) : (
            <div className="avatar-placeholder">
              {(profileData.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{profileData.displayName || 'Anonymous Player'}</h2>
          <p className="profile-email">{user.email}</p>
          <p className="profile-joined">Joined: {formatDate(profileData.createdAt)}</p>
        </div>
      </div>
      
      <div className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
        <button 
          className={`profile-tab ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournaments')}
        >
          Tournaments
        </button>
        <button 
          className={`profile-tab ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          Referrals
        </button>
      </div>
      
      <div className="profile-content">
        {activeTab === 'account' && (
          <div className="account-section">
            <h3 className="section-title">Account Information</h3>
            
            {!isEditing ? (
              <>
                <div className="account-details">
                  <div className="detail-item">
                    <span className="detail-label">Display Name:</span>
                    <span className="detail-value">{profileData.displayName || 'Not set'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{user.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Photo URL:</span>
                    <span className="detail-value">{profileData.photoURL || 'Not set'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Account Created:</span>
                    <span className="detail-value">{formatDate(profileData.createdAt)}</span>
                  </div>
                </div>
                
                <div className="account-actions">
                  <button className="edit-button" onClick={handleEditProfile}>
                    Edit Profile
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="account-form">
                  <div className="form-group">
                    <label htmlFor="displayName">Display Name:</label>
                    <input
                      type="text"
                      id="displayName"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="photoURL">Photo URL:</label>
                    <input
                      type="text"
                      id="photoURL"
                      value={newPhotoURL}
                      onChange={(e) => setNewPhotoURL(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    className="cancel-button" 
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    className="save-button" 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}
            
            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}
          </div>
        )}
        
        {activeTab === 'tournaments' && (
          <div className="tournaments-section">
            <h3 className="section-title">Tournament Participation</h3>
            
            <div className="tournament-status-cards">
              <div className={`tournament-status-card ${profileData.miniTournamentPaid ? 'active' : 'inactive'}`}>
                <div className="tournament-status-header">
                  <h4>Mini Tournament</h4>
                  <span className={`status-badge ${profileData.miniTournamentPaid ? 'active' : 'inactive'}`}>
                    {profileData.miniTournamentPaid ? 'Registered' : 'Not Registered'}
                  </span>
                </div>
                <div className="tournament-status-details">
                  <p>Entry Fee: 1 USDT</p>
                  {profileData.miniTournamentPaid ? (
                    <p className="registration-date">
                      Registered on: {formatDate(profileData.miniTournamentRegisteredAt || profileData.createdAt)}
                    </p>
                  ) : (
                    <p className="registration-note">
                      Register to compete for a prize pool of 10,500 USDT + 1,050 DINO
                    </p>
                  )}
                </div>
              </div>
              
              <div className={`tournament-status-card ${profileData.grandTournamentPaid ? 'active' : 'inactive'}`}>
                <div className="tournament-status-header">
                  <h4>Grand Tournament</h4>
                  <span className={`status-badge ${profileData.grandTournamentPaid ? 'active' : 'inactive'}`}>
                    {profileData.grandTournamentPaid ? 'Registered' : 'Not Registered'}
                  </span>
                </div>
                <div className="tournament-status-details">
                  <p>Entry Fee: 10 USDT</p>
                  {profileData.grandTournamentPaid ? (
                    <p className="registration-date">
                      Registered on: {formatDate(profileData.grandTournamentRegisteredAt || profileData.createdAt)}
                    </p>
                  ) : (
                    <p className="registration-note">
                      Register to compete for a prize pool of 605,000 USDT + 60,500 DINO
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {profileData.grandTournamentPaid && (
              <div className="booster-section">
                <h4>Boosters</h4>
                {profileData.activeBooster ? (
                  <div className="active-booster">
                    <div className="booster-info">
                      <span className="booster-type">
                        {profileData.activeBooster.type === 'booster1' && 'Booster 1 (10x Games)'}
                        {profileData.activeBooster.type === 'booster2' && 'Booster 2 (100x Games)'}
                        {profileData.activeBooster.type === 'booster3' && 'Booster 3 (Unlimited)'}
                      </span>
                      <span className="booster-status">Active</span>
                    </div>
                    <div className="booster-details">
                      {profileData.activeBooster.gamesRemaining ? (
                        <p>Games remaining: {profileData.activeBooster.gamesRemaining}</p>
                      ) : (
                        <p>Valid until tournament end</p>
                      )}
                      <p>Purchased: {formatDate(profileData.activeBooster.purchasedAt)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="no-boosters">No active boosters. Purchase boosters to multiply your scores!</p>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'referrals' && (
          <div className="referrals-section">
            <h3 className="section-title">Your Referral Code</h3>
            
            <div className="referral-code-box">
              <div className="referral-code">{profileData.referralCode}</div>
              <button 
                className="copy-button"
                onClick={copyReferralCode}
              >
                Copy Code
              </button>
            </div>
            
            <div className="referral-instructions">
              <p>Share your referral code with friends. When they register and pay for any tournament, you'll earn 1 USDT for each valid referral.</p>
              <p className="referral-note">Note: Referral balance must be at least 10 USDT to be transferred to your main balance.</p>
            </div>
            
            <div className="referral-stats">
              <div className="stat-card">
                <span className="stat-value">{profileData.referralBalance || 0}</span>
                <span className="stat-label">USDT Balance</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{profileData.referralCount || 0}</span>
                <span className="stat-label">Referrals</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
