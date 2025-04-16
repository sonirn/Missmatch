// src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import UserProfile from '../components/profile/UserProfile';
import ReferralSystem from '../components/profile/ReferralSystem';
import Settings from '../components/profile/Settings';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/pages/ProfilePage.css';

/**
 * ProfilePage Component
 * User profile management page with tabs for different sections
 */
const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData({
            id: user.uid,
            ...userDoc.data()
          });
        } else {
          setError('User profile not found. Please contact support.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user profile. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);
  
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out. Please try again.');
    }
  };
  
  if (loading) {
    return <Loader message="Loading profile..." />;
  }
  
  if (!user) {
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please sign in to view your profile.</p>
        <button 
          className="auth-button"
          onClick={() => navigate('/login')}
        >
          Sign In
        </button>
      </div>
    );
  }
  
  return (
    <div className="profile-page-container">
      {/* SEO Optimization */}
      <Helmet>
        <title>Dino Runner - Your Profile</title>
        <meta name="description" content="Manage your Dino Runner profile, referrals, and account settings." />
      </Helmet>
      
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {userData?.photoURL ? (
            <img 
              src={userData.photoURL} 
              alt={userData.displayName || 'User'} 
              className="avatar-image"
            />
          ) : (
            <div className="avatar-placeholder">
              {(userData?.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{userData?.displayName || 'Anonymous Player'}</h1>
          <p className="profile-email">{user.email}</p>
          <div className="profile-membership">
            <span className="membership-label">Member since:</span>
            <span className="membership-date">
              {userData?.createdAt?.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) || 'N/A'}
            </span>
          </div>
        </div>
        <div className="profile-actions">
          <button 
            className="sign-out-button"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
      
      {/* Profile Navigation */}
      <div className="profile-navigation">
        <button 
          className={`nav-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          Account
        </button>
        <button 
          className={`nav-button ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => handleTabChange('referrals')}
        >
          Referrals
        </button>
        <button 
          className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabChange('settings')}
        >
          Settings
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="profile-error">
          <ErrorMessage message={error} />
        </div>
      )}
      
      {/* Tab Content */}
      <div className="profile-content">
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <UserProfile />
          </div>
        )}
        
        {activeTab === 'referrals' && (
          <div className="referrals-tab">
            <ReferralSystem />
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <Settings />
          </div>
        )}
      </div>
      
      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-label">Balance:</span>
          <span className="stat-value">{userData?.balance || 0} USDT</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">High Score:</span>
          <span className="stat-value">{userData?.highScore || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Referrals:</span>
          <span className="stat-value">{userData?.referralCount || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
