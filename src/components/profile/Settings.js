// src/components/profile/Settings.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import Loader from '../common/Loader';
import ErrorMessage from '../common/ErrorMessage';
import '../../styles/components/Settings.css';

/**
 * Settings Component
 * Allows users to manage their account settings and preferences
 */
const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // User settings
  const [settings, setSettings] = useState({
    emailNotifications: true,
    gameNotifications: true,
    tournamentReminders: true,
    soundEffects: true,
    darkMode: false
  });
  
  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Fetch user settings
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().settings) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ...userDoc.data().settings
          }));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUserSettings();
  }, [user]);
  
  // Handle settings toggle
  const handleSettingToggle = (setting) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [setting]: !prevSettings[setting]
    }));
  };
  
  // Save settings
  const handleSaveSettings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        settings: settings
      });
      
      setSuccessMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      setLoading(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
      setLoading(false);
    }
  };
  
  // Toggle password form
  const togglePasswordForm = () => {
    setShowPasswordForm(!showPasswordForm);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };
  
  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validate passwords
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    
    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    
    try {
      setChangingPassword(true);
      setPasswordError('');
      
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setChangingPassword(false);
      setShowPasswordForm(false);
      setSuccessMessage('Password changed successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      
      // Handle specific errors
      if (err.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect.');
      } else if (err.code === 'auth/too-many-requests') {
        setPasswordError('Too many attempts. Please try again later.');
      } else {
        setPasswordError('Failed to change password. Please try again.');
      }
      
      setChangingPassword(false);
    }
  };
  
  if (loading && !settings) {
    return <Loader message="Loading settings..." />;
  }
  
  if (!user) {
    return <ErrorMessage message="Please sign in to access settings." />;
  }
  
  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Account Settings</h2>
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        {error && (
          <div className="error-message">{error}</div>
        )}
      </div>
      
      <div className="settings-section">
        <h3>Notification Preferences</h3>
        <div className="settings-options">
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Email Notifications</span>
              <span className="setting-description">Receive emails about game updates and tournaments</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.emailNotifications} 
                onChange={() => handleSettingToggle('emailNotifications')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Game Notifications</span>
              <span className="setting-description">Receive in-game notifications</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.gameNotifications} 
                onChange={() => handleSettingToggle('gameNotifications')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Tournament Reminders</span>
              <span className="setting-description">Receive reminders before tournaments start or end</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.tournamentReminders} 
                onChange={() => handleSettingToggle('tournamentReminders')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="settings-section">
        <h3>Game Preferences</h3>
        <div className="settings-options">
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Sound Effects</span>
              <span className="setting-description">Enable sound effects while playing</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.soundEffects} 
                onChange={() => handleSettingToggle('soundEffects')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Dark Mode</span>
              <span className="setting-description">Use dark theme for the website</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.darkMode} 
                onChange={() => handleSettingToggle('darkMode')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="settings-section">
        <h3>Security</h3>
        <div className="security-options">
          <div className="security-item">
            <div className="security-info">
              <span className="security-label">Change Password</span>
              <span className="security-description">Update your account password</span>
            </div>
            <button 
              className="security-button"
              onClick={togglePasswordForm}
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>
        </div>
        
        {showPasswordForm && (
          <div className="password-form">
            <form onSubmit={handlePasswordChange}>
              {passwordError && (
                <div className="password-error">{passwordError}</div>
              )}
              
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password:</label>
                <input 
                  type="password" 
                  id="currentPassword" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={changingPassword}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password:</label>
                <input 
                  type="password" 
                  id="newPassword" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={changingPassword}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password:</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={changingPassword}
                />
              </div>
              
              <div className="password-requirements">
                <p>Password must be at least 6 characters long.</p>
              </div>
              
              <div className="form-actions">
                <button 
                  type="submit"
                  className="submit-button"
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      
      <div className="settings-actions">
        <button 
          className="save-button"
          onClick={handleSaveSettings}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
