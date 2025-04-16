// src/components/profile/ScoreHistory.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Loader from '../common/Loader';
import ErrorMessage from '../common/ErrorMessage';
import '../../styles/components/ScoreHistory.css';

/**
 * ScoreHistory Component
 * Displays a user's game score history with filtering and sorting options
 */
const ScoreHistory = () => {
  const { user } = useAuth();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tournamentFilter, setTournamentFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  
  useEffect(() => {
    const fetchScores = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Build query based on filters
        let scoresQuery = collection(db, 'scores');
        let constraints = [
          where('userId', '==', user.uid),
          orderBy('score', sortOrder),
          limit(displayLimit)
        ];
        
        // Add tournament filter if not 'all'
        if (tournamentFilter !== 'all') {
          constraints.unshift(where('tournamentId', '==', tournamentFilter));
        }
        
        // Execute query
        const scoreSnapshot = await getDocs(query(scoresQuery, ...constraints));
        
        // Process results
        const scoresList = [];
        scoreSnapshot.forEach((doc) => {
          scoresList.push({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() // Convert Firestore timestamp to JS Date
          });
        });
        
        setScores(scoresList);
        setHasMore(scoresList.length === displayLimit);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching score history:', err);
        setError('Failed to load score history. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchScores();
  }, [user, tournamentFilter, sortOrder, displayLimit]);
  
  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle tournament filter change
  const handleTournamentFilterChange = (event) => {
    setTournamentFilter(event.target.value);
    setDisplayLimit(10); // Reset limit when changing filters
  };
  
  // Handle sort order change
  const handleSortOrderChange = (event) => {
    setSortOrder(event.target.value);
  };
  
  // Load more scores
  const handleLoadMore = () => {
    setDisplayLimit(prevLimit => prevLimit + 10);
  };
  
  // Get tournament name
  const getTournamentName = (tournamentId) => {
    switch(tournamentId) {
      case 'mini':
        return 'Mini Tournament';
      case 'grand':
        return 'Grand Tournament';
      case 'practice':
        return 'Practice';
      default:
        return tournamentId;
    }
  };
  
  // Calculate statistics
  const calculateStats = () => {
    if (scores.length === 0) {
      return { highest: 0, average: 0, total: 0 };
    }
    
    const highest = Math.max(...scores.map(s => s.score));
    const average = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
    
    return { highest, average, total: scores.length };
  };
  
  const stats = calculateStats();
  
  if (loading && scores.length === 0) {
    return <Loader message="Loading score history..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  if (!user) {
    return <ErrorMessage message="Please sign in to view your score history." />;
  }
  
  return (
    <div className="score-history-container">
      <div className="score-history-header">
        <h2>Your Score History</h2>
        <div className="score-filters">
          <div className="filter-group">
            <label htmlFor="tournamentFilter">Tournament:</label>
            <select 
              id="tournamentFilter" 
              value={tournamentFilter} 
              onChange={handleTournamentFilterChange}
            >
              <option value="all">All Tournaments</option>
              <option value="mini">Mini Tournament</option>
              <option value="grand">Grand Tournament</option>
              <option value="practice">Practice</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="sortOrder">Sort By:</label>
            <select 
              id="sortOrder" 
              value={sortOrder} 
              onChange={handleSortOrderChange}
            >
              <option value="desc">Highest Score First</option>
              <option value="asc">Lowest Score First</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="score-stats">
        <div className="stat-box">
          <span className="stat-label">Highest Score:</span>
          <span className="stat-value">{stats.highest}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Average Score:</span>
          <span className="stat-value">{stats.average}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Total Games:</span>
          <span className="stat-value">{stats.total}{hasMore ? '+' : ''}</span>
        </div>
      </div>
      
      {scores.length === 0 ? (
        <div className="no-scores">
          <p>No scores found for the selected filters.</p>
          <p>Play some games to see your score history here!</p>
        </div>
      ) : (
        <>
          <div className="score-table-container">
            <table className="score-table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Tournament</th>
                  <th>Date</th>
                  <th>Booster</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score) => (
                  <tr key={score.id}>
                    <td className="score-value">
                      {score.score}
                      {score.boosterApplied && score.originalScore && (
                        <span className="original-score">
                          ({score.originalScore} × 2)
                        </span>
                      )}
                    </td>
                    <td className="tournament-name">
                      {getTournamentName(score.tournamentId)}
                    </td>
                    <td className="score-date">
                      {formatDate(score.timestamp)}
                    </td>
                    <td className="booster-status">
                      {score.boosterApplied ? (
                        <span className="booster-applied">Booster Applied</span>
                      ) : (
                        <span className="no-booster">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {loading && <Loader message="Loading more scores..." />}
          
          {hasMore && !loading && (
            <div className="load-more-container">
              <button className="load-more-button" onClick={handleLoadMore}>
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScoreHistory;
