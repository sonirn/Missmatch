// src/pages/TournamentPage.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import TournamentList from '../components/tournament/TournamentList';
import TournamentTimer from '../components/tournament/TournamentTimer';
import RulesDisplay from '../components/tournament/RulesDisplay';
import PrizePool from '../components/tournament/PrizePool';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/pages/TournamentPage.css';

/**
 * TournamentPage Component
 * Displays all available tournaments with filtering, rules, and prize information
 */
const TournamentPage = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tournaments');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Fetch tournaments data
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        
        // Create base query
        const tournamentsRef = collection(db, 'tournaments');
        let tournamentsQuery;
        let constraints = [orderBy('startDate', 'desc')];
        
        // Add type filter if not 'all'
        if (typeFilter !== 'all') {
          constraints.unshift(where('type', '==', typeFilter));
        }
        
        tournamentsQuery = query(tournamentsRef, ...constraints);
        const querySnapshot = await getDocs(tournamentsQuery);
        
        const tournamentList = [];
        let activeOne = null;
        
        querySnapshot.forEach((doc) => {
          const tournamentData = {
            id: doc.id,
            ...doc.data()
          };
          
          tournamentList.push(tournamentData);
          
          // Find the first active tournament for the timer
          if (tournamentData.status === 'active' && !activeOne) {
            activeOne = tournamentData;
          }
        });
        
        setTournaments(tournamentList);
        setActiveTournament(activeOne);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        setError('Failed to load tournaments. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchTournaments();
  }, [typeFilter]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle status filter change
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  // Handle type filter change
  const handleTypeFilterChange = (type) => {
    setTypeFilter(type);
  };

  // Filter tournaments by status if needed
  const filteredTournaments = statusFilter === 'all' 
    ? tournaments 
    : tournaments.filter(tournament => tournament.status === statusFilter);

  return (
    <div className="tournament-page-container">
      {/* SEO Optimization */}
      <Helmet>
        <title>Dino Runner - Tournaments</title>
        <meta name="description" content="Participate in Dino Runner tournaments to win USDT and DINO tokens. View active and upcoming tournaments." />
      </Helmet>
      
      {/* Page Header */}
      <div className="tournament-page-header">
        <h1>Dinosaur Tournaments</h1>
        <p className="tournament-subtitle">
          Compete against players worldwide for massive prizes in USDT and DINO tokens!
        </p>
      </div>
      
      {/* Tournament Timer */}
      {activeTournament && (
        <div className="tournament-timer-container">
          <TournamentTimer tournament={activeTournament} />
        </div>
      )}
      
      {/* Tournament Navigation Tabs */}
      <div className="tournament-tabs">
        <button 
          className={`tournament-tab ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => handleTabChange('tournaments')}
        >
          Tournaments
        </button>
        <button 
          className={`tournament-tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => handleTabChange('rules')}
        >
          Rules
        </button>
        <button 
          className={`tournament-tab ${activeTab === 'prizes' ? 'active' : ''}`}
          onClick={() => handleTabChange('prizes')}
        >
          Prize Pool
        </button>
      </div>
      
      {/* Tournament Filters */}
      {activeTab === 'tournaments' && (
        <div className="tournament-filters">
          <div className="status-filters">
            <button 
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('upcoming')}
            >
              Upcoming
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('active')}
            >
              Active
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('completed')}
            >
              Completed
            </button>
          </div>
          
          <div className="type-filters">
            <button 
              className={`type-filter-button ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleTypeFilterChange('all')}
            >
              All Types
            </button>
            <button 
              className={`type-filter-button ${typeFilter === 'mini' ? 'active' : ''}`}
              onClick={() => handleTypeFilterChange('mini')}
            >
              Mini
            </button>
            <button 
              className={`type-filter-button ${typeFilter === 'grand' ? 'active' : ''}`}
              onClick={() => handleTypeFilterChange('grand')}
            >
              Grand
            </button>
          </div>
        </div>
      )}
      
      {/* Tab Content */}
      <div className="tab-content">
        {loading ? (
          <Loader message="Loading tournament information..." />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <>
            {activeTab === 'tournaments' && (
              <div className="tournaments-tab-content">
                {filteredTournaments.length === 0 ? (
                  <div className="no-tournaments">
                    <p>No tournaments found for the selected filters.</p>
                  </div>
                ) : (
                  <div className="tournament-grid">
                    {filteredTournaments.map(tournament => (
                      <div key={tournament.id} className="tournament-item">
                        <TournamentList tournaments={[tournament]} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'rules' && (
              <div className="rules-tab-content">
                <div className="tournament-type-selector">
                  <button 
                    className={`type-selector-button ${typeFilter === 'mini' || typeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => handleTypeFilterChange('mini')}
                  >
                    Mini Tournament Rules
                  </button>
                  <button 
                    className={`type-selector-button ${typeFilter === 'grand' ? 'active' : ''}`}
                    onClick={() => handleTypeFilterChange('grand')}
                  >
                    Grand Tournament Rules
                  </button>
                </div>
                <RulesDisplay tournamentType={typeFilter === 'all' ? 'mini' : typeFilter} />
              </div>
            )}
            
            {activeTab === 'prizes' && (
              <div className="prizes-tab-content">
                <div className="tournament-type-selector">
                  <button 
                    className={`type-selector-button ${typeFilter === 'mini' || typeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => handleTypeFilterChange('mini')}
                  >
                    Mini Tournament Prizes
                  </button>
                  <button 
                    className={`type-selector-button ${typeFilter === 'grand' ? 'active' : ''}`}
                    onClick={() => handleTypeFilterChange('grand')}
                  >
                    Grand Tournament Prizes
                  </button>
                </div>
                <PrizePool tournamentType={typeFilter === 'all' ? 'mini' : typeFilter} />
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Tournament Info Section */}
      <div className="tournament-info-section">
        <div className="info-card">
          <div className="info-icon">🏆</div>
          <h3>How to Win</h3>
          <p>Achieve the highest score in the game to climb the leaderboard and win prizes!</p>
        </div>
        <div className="info-card">
          <div className="info-icon">💰</div>
          <h3>Prize Pool</h3>
          <p>Mini Tournament: 10,500 USDT + 1,050 DINO<br />Grand Tournament: 605,000 USDT + 60,500 DINO</p>
        </div>
        <div className="info-card">
          <div className="info-icon">🚀</div>
          <h3>Boosters</h3>
          <p>Purchase boosters to double your score and increase your chances of winning!</p>
        </div>
        <div className="info-card">
          <div className="info-icon">👥</div>
          <h3>Referrals</h3>
          <p>Earn 1 USDT for each friend you refer who registers for a tournament!</p>
        </div>
      </div>
    </div>
  );
};

export default TournamentPage;
