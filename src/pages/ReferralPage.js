// src/pages/ReferralPage.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/pages/ReferralPage.css';

/**
 * ReferralPage Component
 * Dedicated page for referral system management and tracking
 */
const ReferralPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [referralData, setReferralData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [showAllReferrals, setShowAllReferrals] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // Fetch user's referral data
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
  
  // Fetch user's referrals
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
        let referralsQuery;
        
        if (filter === 'valid') {
          referralsQuery = query(
            referralsRef,
            where('referrerId', '==', user.uid),
            where('isValid', '==', true),
            orderBy('createdAt', 'desc')
          );
        } else if (filter === 'pending') {
          referralsQuery = query(
            referralsRef,
            where('referrerId', '==', user.uid),
            where('isValid', '==', false),
            orderBy('createdAt', 'desc')
          );
        } else {
          referralsQuery = query(
            referralsRef,
            where('referrerId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        }
        
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
                  userEmail: userDoc.data().email || 'No email',
                  userPhotoURL: userDoc.data().photoURL || null
                };
              }
              return {
                ...referralData,
                userDisplayName: 'Unknown User',
                userEmail: 'No email',
                userPhotoURL: null
              };
            })
            .catch(err => {
              console.error('Error fetching referred user:', err);
              return {
                ...referralData,
                userDisplayName: 'Error Loading User',
                userEmail: 'Error',
                userPhotoURL: null
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
  }, [user, filter]);
  
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
  
  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };
  
  // Share referral code on social media
  const shareOnSocial = (platform) => {
    let shareUrl = '';
    const shareText = `Join me on Dino Runner Tournament and win USDT prizes! Use my referral code: ${referralData?.referralCode}`;
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + referralLink)}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };
  
  if (loading) {
    return <Loader message="Loading referral system..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  if (!user) {
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please sign in to view your referrals.</p>
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
    <div className="referral-page-container">
      {/* SEO Optimization */}
      <Helmet>
        <title>Dino Runner - Referral Program</title>
        <meta name="description" content="Refer friends to Dino Runner Tournament and earn USDT rewards for each valid referral." />
      </Helmet>
      
      {/* Page Header */}
      <div className="referral-page-header">
        <h1>Referral Program</h1>
        <p className="referral-subtitle">
          Earn 1 USDT for each friend who joins and participates in a tournament!
        </p>
      </div>
      
      {/* Referral Stats */}
      <div className="referral-stats-container">
        <div className="stat-card">
          <div className="stat-value">{referralData?.referralBalance || 0} USDT</div>
          <div className="stat-label">Current Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{referralData?.referralCount || 0}</div>
          <div className="stat-label">Total Referrals</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{referralData?.totalEarned || 0} USDT</div>
          <div className="stat-label">Total Earned</div>
        </div>
      </div>
      
      {/* Referral Code Section */}
      <div className="referral-code-section">
        <h2>Your Referral Code</h2>
        
        <div className="referral-code-container">
          <div className="referral-code-box">
            <span className="referral-code">{referralData?.referralCode}</span>
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
        
        {/* Social Sharing */}
        <div className="social-sharing">
          <h3>Share Your Referral</h3>
          <div className="social-buttons">
            <button 
              className="social-button twitter"
              onClick={() => shareOnSocial('twitter')}
            >
              Twitter
            </button>
            <button 
              className="social-button facebook"
              onClick={() => shareOnSocial('facebook')}
            >
              Facebook
            </button>
            <button 
              className="social-button telegram"
              onClick={() => shareOnSocial('telegram')}
            >
              Telegram
            </button>
            <button 
              className="social-button whatsapp"
              onClick={() => shareOnSocial('whatsapp')}
            >
              WhatsApp
            </button>
          </div>
        </div>
      </div>
      
      {/* Referral History Section */}
      <div className="referral-history-section">
        <div className="history-header">
          <h2>Referral History</h2>
          <div className="filter-buttons">
            <button 
              className={`filter-button ${filter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button 
              className={`filter-button ${filter === 'valid' ? 'active' : ''}`}
              onClick={() => handleFilterChange('valid')}
            >
              Valid
            </button>
            <button 
              className={`filter-button ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => handleFilterChange('pending')}
            >
              Pending
            </button>
          </div>
        </div>
        
        {loadingReferrals ? (
          <Loader message="Loading referrals..." />
        ) : referrals.length === 0 ? (
          <div className="no-referrals">
            <h3>No Referrals Found</h3>
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
                {referrals.slice(0, showAllReferrals ? referrals.length : 10).map((referral) => (
                  <tr key={referral.id}>
                    <td className="user-cell" data-label="User">
                      <div className="user-avatar">
                        {referral.userPhotoURL ? (
                          <img src={referral.userPhotoURL} alt={referral.userDisplayName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {referral.userDisplayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="user-info">
                        <span className="user-name">{referral.userDisplayName}</span>
                        <span className="user-email">{referral.userEmail}</span>
                      </div>
                    </td>
                    <td className="date-cell" data-label="Date">
                      {formatDate(referral.createdAt)}
                    </td>
                    <td className="status-cell" data-label="Status">
                      <span className={`status-badge ${referral.isValid ? 'valid' : 'pending'}`}>
                        {referral.isValid ? 'Valid' : 'Pending'}
                      </span>
                    </td>
                    <td className="reward-cell" data-label="Reward">
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
            
            {referrals.length > 10 && !showAllReferrals && (
              <div className="show-more-container">
                <button 
                  className="show-more-button"
                  onClick={() => setShowAllReferrals(true)}
                >
                  Show All ({referrals.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* How It Works Section */}
      <div className="how-it-works-section">
        <h2>How Referrals Work</h2>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Share Your Code</h3>
            <p>Share your unique referral code with friends through social media, email, or messaging apps.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Friends Register</h3>
            <p>Your friends sign up using your referral code and register for any tournament.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Earn Rewards</h3>
            <p>You earn 1 USDT for each valid referral when they pay for any tournament.</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3>Get Paid</h3>
            <p>Referral balance is transferred to your main balance after each tournament ends (minimum 10 USDT).</p>
          </div>
        </div>
      </div>
      
      {/* Referral Notes */}
      <div className="referral-notes">
        <h3>Important Notes</h3>
        <ul>
          <li>A referral is considered valid when the referred user registers using your code AND pays for any tournament.</li>
          <li>Referral balance must be at least 10 USDT to be transferred to your main balance.</li>
          <li>If your referral balance is less than 10 USDT at the end of a tournament, it will be reset to zero.</li>
          <li>You can track the status of your referrals and earnings on this page.</li>
          <li>Referral rewards are paid in USDT and can be withdrawn to your wallet.</li>
        </ul>
      </div>
    </div>
  );
};

export default ReferralPage;
