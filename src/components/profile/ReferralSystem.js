// src/components/profile/ReferralSystem.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Loader from '../common/Loader';
import ErrorMessage from '../common/ErrorMessage';
import '../../styles/components/ReferralSystem.css';

/**
 * ReferralSystem Component
 * Displays and manages user's referral code, statistics, and history
 */
const ReferralSystem = () => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  
  // Fetch user's referral code and stats
  useEffect(() => {
    const fetchReferralData = async () => {
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
          setReferralData({
            referralCode: userData.referralCode || '',
            referralBalance: userData.referralBalance || 0,
            referralCount: userData.referralCount || 0,
            totalEarned: userData.totalReferralEarned || 0
          });
          
          // Create referral link with current domain
          const domain = window.location.origin;
          setReferralLink(`${domain}/register?ref=${userData.referralCode}`);
        } else {
          setError('User profile not found.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching referral data:', err);
        setError('Failed to load referral data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchReferralData();
  }, [user]);
  
  // Fetch user's referral history (limited to 5 most recent)
  useEffect(() => {
    const fetchReferrals = async () => {
      if (!user) {
        setLoadingReferrals(false);
        return;
      }
      
      try {
        setLoadingReferrals(true);
        
        // Query referrals where current user is the referrer
        const referralsRef = collection(db, 'referrals');
        const referralsQuery = query(
          referralsRef,
          where('referrerId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const referralsSnapshot = await getDocs(referralsQuery);
        
        // Process referrals and fetch referred user details
        const referralsList = [];
        const userPromises = [];
        
        referralsSnapshot.forEach((docSnapshot) => {
          const referralData = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
            createdAt: docSnapshot.data().createdAt?.toDate() // Convert Firestore timestamp to JS Date
          };
          
          // Fetch referred user details
          const userPromise = getDoc(doc(db, 'users', referralData.referredUserId))
            .then(userDoc => {
              if (userDoc.exists()) {
                return {
                  ...referralData,
                  userDisplayName: userDoc.data().displayName || 'Anonymous',
                  userEmail: userDoc.data().email || 'No email'
                };
              }
              return {
                ...referralData,
                userDisplayName: 'Unknown User',
                userEmail: 'No email'
              };
            })
            .catch(err => {
              console.error('Error fetching referred user:', err);
              return {
                ...referralData,
                userDisplayName: 'Error Loading User',
                userEmail: 'Error'
              };
            });
          
          userPromises.push(userPromise);
          referralsList.push(referralData);
        });
        
        // Wait for all user details to be fetched
        const referralsWithUserDetails = await Promise.all(userPromises);
        setReferrals(referralsWithUserDetails);
        setLoadingReferrals(false);
      } catch (err) {
        console.error('Error fetching referrals:', err);
        setLoadingReferrals(false);
      }
    };
    
    fetchReferrals();
  }, [user]);
  
  // Copy referral code to clipboard
  const copyReferralCode = () => {
    if (!referralData?.referralCode) return;
    
    navigator.clipboard.writeText(referralData.referralCode);
    setCopied(true);
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  // Copy referral link to clipboard
  const copyReferralLink = () => {
    if (!referralLink) return;
    
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (loading) {
    return <Loader message="Loading referral system..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  if (!user || !referralData) {
    return <ErrorMessage message="Please sign in to view your referrals." />;
  }
  
  return (
    <div className="referral-system-container">
      <div className="referral-header">
        <h2>Referral System</h2>
        <p className="referral-subtitle">
          Earn 1 USDT for each friend who registers and pays for any tournament using your referral code.
        </p>
      </div>
      
      <div className="referral-stats-container">
        <div className="referral-stat-card">
          <div className="stat-value">{referralData.referralBalance} USDT</div>
          <div className="stat-label">Current Balance</div>
        </div>
        
        <div className="referral-stat-card">
          <div className="stat-value">{referralData.referralCount}</div>
          <div className="stat-label">Total Referrals</div>
        </div>
        
        <div className="referral-stat-card">
          <div className="stat-value">{referralData.totalEarned || 0} USDT</div>
          <div className="stat-label">Total Earned</div>
        </div>
      </div>
      
      <div className="referral-code-section">
        <h3>Your Referral Code</h3>
        
        <div className="referral-code-container">
          <div className="referral-code-box">
            <span className="referral-code">{referralData.referralCode}</span>
            <button 
              className="copy-button"
              onClick={copyReferralCode}
              disabled={copied}
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          
          <div className="referral-link-box">
            <span className="referral-link">{referralLink}</span>
            <button 
              className="copy-button"
              onClick={copyReferralLink}
              disabled={copied}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
        
        <div className="referral-instructions">
          <h4>How it works:</h4>
          <ol>
            <li>Share your referral code or link with friends</li>
            <li>They register using your code</li>
            <li>When they pay for any tournament, you earn 1 USDT</li>
            <li>Referral balance will be transferred to your main balance after each tournament ends</li>
            <li>Minimum 10 USDT required to transfer to main balance</li>
          </ol>
        </div>
      </div>
      
      <div className="referral-history-section">
        <h3>Recent Referrals</h3>
        
        {loadingReferrals ? (
          <Loader message="Loading referrals..." />
        ) : referrals.length === 0 ? (
          <div className="no-referrals">
            <p>You haven't referred anyone yet.</p>
            <p>Share your referral code to start earning!</p>
          </div>
        ) : (
          <div className="referral-table-container">
            <table className="referral-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Reward</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td className="user-cell">
                      <div className="user-info">
                        <span className="user-name">{referral.userDisplayName}</span>
                        <span className="user-email">{referral.userEmail}</span>
                      </div>
                    </td>
                    <td className="date-cell">
                      {formatDate(referral.createdAt)}
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${referral.isValid ? 'valid' : 'pending'}`}>
                        {referral.isValid ? 'Valid' : 'Pending'}
                      </span>
                    </td>
                    <td className="reward-cell">
                      {referral.isValid ? (
                        <span className="reward-amount">1 USDT</span>
                      ) : (
                        <span className="pending-reward">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="referral-note">
        <p>
          <strong>Note:</strong> Referral balance must be at least 10 USDT to be transferred to your main balance.
          If it's less than 10 USDT at the end of a tournament, it will be reset to zero.
        </p>
      </div>
    </div>
  );
};

export default ReferralSystem;
