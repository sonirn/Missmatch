// src/components/tournament/TournamentList.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import TournamentCard from './TournamentCard';
import Loader from '../common/Loader';
import ErrorMessage from '../common/ErrorMessage';
import '../../styles/components/TournamentList.css';
/**
 * Tournament List Component
 * Displays a list of all available tournaments with filtering options
 */
const TournamentList = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, upcoming, completed

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        
        // Create base query
        let tournamentsQuery;
        const tournamentsRef = collection(db, 'tournaments');
        
        // Apply filter if not 'all'
        if (filter !== 'all') {
          tournamentsQuery = query(
            tournamentsRef, 
            where('status', '==', filter),
            orderBy('startDate', 'desc')
          );
        } else {
          tournamentsQuery = query(
            tournamentsRef,
            orderBy('startDate', 'desc')
          );
        }
        
        const querySnapshot = await getDocs(tournamentsQuery);
        
        const tournamentList = [];
        querySnapshot.forEach((doc) => {
          tournamentList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setTournaments(tournamentList);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        setError('Failed to load tournaments. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchTournaments();
  }, [filter]);
  
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };
  
  if (loading) {
    return <Loader message="Loading tournaments..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  return (
    <div className="tournament-list-container">
      <div className="tournament-list-header">
        <h2>Tournaments</h2>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => handleFilterChange('active')}
          >
            Active
          </button>
          <button 
            className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => handleFilterChange('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => handleFilterChange('completed')}
          >
            Completed
          </button>
        </div>
      </div>
      
      {tournaments.length === 0 ? (
        <div className="no-tournaments">
          <p>No tournaments found for the selected filter.</p>
        </div>
      ) : (
        <div className="tournament-grid">
          {tournaments.map((tournament) => (
            <TournamentCard 
              key={tournament.id} 
              tournament={tournament} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TournamentList;
