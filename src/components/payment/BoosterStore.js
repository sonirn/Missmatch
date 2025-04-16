// src/components/payment/BoosterStore.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PAYMENT_CONFIG } from '../../config/payment-config';
import PaymentForm from './PaymentForm';
import PaymentStatus from './PaymentStatus';
import Modal from '../common/Modal';
import '../../styles/components/BoosterStore.css';

/**
 * BoosterStore Component
 * Displays available boosters for purchase with payment integration
 */
const BoosterStore = () => {
  const { user } = useAuth();
  const [activeBooster, setActiveBooster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooster, setSelectedBooster] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  
  // Fetch user's active booster on component mount
  useEffect(() => {
    const fetchUserBooster = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().activeBooster) {
          setActiveBooster(userDoc.data().activeBooster);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user booster:', error);
        setLoading(false);
      }
    };
    
    fetchUserBooster();
  }, [user]);
  
  // Booster data
  const boosters = [
    {
      id: 'booster1',
      name: 'Booster 1',
      description: 'Double your high score for your next 10 matches.',
      price: PAYMENT_CONFIG.getBoosterPrice('booster1'),
      features: [
        'Score multiplier: 2x',
        'Duration: 10 games',
        'Applies to Grand Tournament only'
      ],
      icon: '🚀'
    },
    {
      id: 'booster2',
      name: 'Booster 2',
      description: 'Double your high score for your next 100 matches.',
      price: PAYMENT_CONFIG.getBoosterPrice('booster2'),
      features: [
        'Score multiplier: 2x',
        'Duration: 100 games',
        'Applies to Grand Tournament only'
      ],
      icon: '⚡'
    },
    {
      id: 'booster3',
      name: 'Booster 3',
      description: 'Double every game high score until the tournament ends.',
      price: PAYMENT_CONFIG.getBoosterPrice('booster3'),
      features: [
        'Score multiplier: 2x',
        'Duration: Until tournament ends',
        'Applies to Grand Tournament only'
      ],
      icon: '💎'
    }
  ];
  
  // Handle booster selection
  const handleSelectBooster = (booster) => {
    setSelectedBooster(booster);
    setShowPaymentModal(true);
  };
  
  // Handle payment completion
  const handlePaymentComplete = (result) => {
    setPaymentResult(result);
    
    // If payment was successful, update active booster
    if (result.success) {
      // The active booster will be updated in the user's profile
      // We'll reflect this change when the user refreshes or navigates
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  };
  
  // Close payment modal
  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setSelectedBooster(null);
    setPaymentResult(null);
  };
  
  // Render active booster status
  const renderActiveBooster = () => {
    if (!activeBooster) return null;
    
    let boosterName, boosterDetails;
    
    switch (activeBooster.type) {
      case 'booster1':
        boosterName = 'Booster 1';
        boosterDetails = `${activeBooster.gamesRemaining} games remaining`;
        break;
      case 'booster2':
        boosterName = 'Booster 2';
        boosterDetails = `${activeBooster.gamesRemaining} games remaining`;
        break;
      case 'booster3':
        boosterName = 'Booster 3';
        boosterDetails = 'Active until tournament ends';
        break;
      default:
        boosterName = 'Unknown Booster';
        boosterDetails = '';
    }
    
    return (
      <div className="active-booster">
        <div className="active-booster-header">
          <h3>Active Booster</h3>
        </div>
        <div className="active-booster-content">
          <div className="active-booster-icon">
            {activeBooster.type === 'booster1' && '🚀'}
            {activeBooster.type === 'booster2' && '⚡'}
            {activeBooster.type === 'booster3' && '💎'}
          </div>
          <div className="active-booster-details">
            <div className="active-booster-name">{boosterName}</div>
            <div className="active-booster-status">{boosterDetails}</div>
            <div className="active-booster-effect">2x Score Multiplier</div>
          </div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return <div className="booster-store-loading">Loading boosters...</div>;
  }
  
  return (
    <div className="booster-store">
      <div className="booster-store-header">
        <h2>Power Boosters</h2>
        <p className="booster-store-description">
          Enhance your gameplay and climb the tournament rankings with these powerful boosters.
          Each booster doubles your score, giving you a competitive edge!
        </p>
        <div className="booster-store-note">
          <strong>Note:</strong> Boosters are only applicable to the Grand Tournament.
        </div>
      </div>
      
      {renderActiveBooster()}
      
      <div className="booster-grid">
        {boosters.map((booster) => (
          <div key={booster.id} className="booster-card">
            <div className="booster-icon">{booster.icon}</div>
            <h3 className="booster-name">{booster.name}</h3>
            <p className="booster-description">{booster.description}</p>
            <ul className="booster-features">
              {booster.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            <div className="booster-price">{booster.price} USDT</div>
            <button 
              className="booster-buy-button"
              onClick={() => handleSelectBooster(booster)}
              disabled={!user || (activeBooster && activeBooster.type === booster.id)}
            >
              {!user ? 'Sign in to Purchase' : 
                (activeBooster && activeBooster.type === booster.id) ? 'Already Active' : 'Purchase'}
            </button>
          </div>
        ))}
      </div>
      
      {showPaymentModal && selectedBooster && (
        <Modal
          title={`Purchase ${selectedBooster.name}`}
          onClose={handleCloseModal}
        >
          {paymentResult ? (
            <PaymentStatus
              status={paymentResult.success ? 'success' : 'error'}
              message={paymentResult.message}
              txHash={paymentResult.transaction?.hash}
              amount={selectedBooster.price}
              onClose={handleCloseModal}
              onRetry={paymentResult.success ? null : () => setPaymentResult(null)}
            />
          ) : (
            <PaymentForm
              paymentType="booster"
              itemType={selectedBooster.id}
              onPaymentComplete={handlePaymentComplete}
              onCancel={handleCloseModal}
            />
          )}
        </Modal>
      )}
    </div>
  );
};

export default BoosterStore;
