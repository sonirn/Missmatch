// src/pages/Home.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import TournamentCard from '../components/tournament/TournamentCard';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/pages/Home.css';

/**
 * Home Page Component
 * Landing page for the Dinosaur Tournament website
 */
const Home = () => {
  const { user } = useAuth();
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch active tournaments
  useEffect(() => {
    const fetchActiveTournaments = async () => {
      try {
        setLoading(true);
        
        const tournamentsRef = collection(db, 'tournaments');
        const activeTournamentsQuery = query(
          tournamentsRef,
          where('status', '==', 'active'),
          orderBy('startDate', 'desc'),
          limit(2)
        );
        
        const querySnapshot = await getDocs(activeTournamentsQuery);
        
        const tournaments = [];
        querySnapshot.forEach((doc) => {
          tournaments.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setActiveTournaments(tournaments);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching active tournaments:', err);
        setError('Failed to load tournaments. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchActiveTournaments();
  }, []);
  
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Dino Runner Tournament</h1>
          <p className="hero-subtitle">
            Compete in our 15-day tournament for a chance to win from a prize pool of over 615,500 USDT!
          </p>
          <div className="hero-cta">
            <Link to="/game" className="cta-button primary">Play Now</Link>
            <Link to="/tournament" className="cta-button secondary">View Tournaments</Link>
          </div>
          <div className="hero-sponsors">
            <p>Sponsored by:</p>
            <div className="sponsor-logos">
              <img src="/assets/images/sponsors/kucoin.png" alt="KuCoin" className="sponsor-logo" />
              <img src="/assets/images/sponsors/pancakeswap.png" alt="PancakeSwap" className="sponsor-logo" />
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img src="/assets/images/dino-hero.png" alt="Dinosaur Runner" />
        </div>
      </section>
      
      {/* Active Tournaments Section */}
      <section className="tournaments-section">
        <div className="section-header">
          <h2>Active Tournaments</h2>
          <Link to="/tournament" className="view-all-link">View All</Link>
        </div>
        
        {loading ? (
          <Loader message="Loading tournaments..." />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : activeTournaments.length === 0 ? (
          <div className="no-tournaments">
            <p>No active tournaments at the moment.</p>
            <p>Check back soon for upcoming tournaments!</p>
          </div>
        ) : (
          <div className="tournaments-grid">
            {activeTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </section>
      
      {/* How It Works Section */}
      <section className="how-it-works-section">
        <h2>How It Works</h2>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Sign Up</h3>
            <p>Create an account using your Google account to get started.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Register for Tournament</h3>
            <p>Pay the entry fee (1 USDT for Mini, 10 USDT for Grand Tournament) using BEP20 USDT.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Play and Compete</h3>
            <p>Play the Dino Runner game and try to achieve the highest score.</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3>Win Prizes</h3>
            <p>Top players win from a prize pool of 615,500 USDT + 61,550 DINO tokens.</p>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="features-section">
        <h2>Game Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎮</div>
            <h3>Classic Gameplay</h3>
            <p>The classic dinosaur runner game you know and love, with enhanced graphics and gameplay.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Competitive Tournaments</h3>
            <p>Compete against players worldwide in Mini and Grand tournaments with huge prize pools.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Score Boosters</h3>
            <p>Purchase boosters to multiply your score and increase your chances of winning.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Referral System</h3>
            <p>Earn 1 USDT for each friend you refer who registers for a tournament.</p>
          </div>
        </div>
      </section>
      
      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Play?</h2>
          <p>Join thousands of players competing for massive prizes!</p>
          <div className="cta-buttons">
            {user ? (
              <Link to="/game" className="cta-button primary">Play Now</Link>
            ) : (
              <Link to="/login" className="cta-button primary">Sign In</Link>
            )}
            <Link to="/tournament" className="cta-button secondary">View Tournaments</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
