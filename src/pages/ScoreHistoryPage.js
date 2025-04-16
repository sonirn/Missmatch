// src/pages/ScoreHistoryPage.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import ScoreHistory from '../components/profile/ScoreHistory';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/pages/ScoreHistoryPage.css';

/**
 * ScoreHistoryPage Component
 * Displays the user's score history with statistics and insights
 */
const ScoreHistoryPage = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch user statistics
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get user's scores
        const scoresRef = collection(db, 'scores');
        const scoresQuery = query(
          scoresRef,
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        
        const scoresSnapshot = await getDocs(scoresQuery);
        
        if (scoresSnapshot.empty) {
          setUserStats({
            totalGames: 0,
            highestScore: 0,
            averageScore: 0,
            miniTournamentHighScore: 0,
            grandTournamentHighScore: 0,
            recentImprovement: 0
          });
          setLoading(false);
          return;
        }
        
        const scores = [];
        scoresSnapshot.forEach(doc => {
          scores.push({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
          });
        });
        
        // Calculate statistics
        const totalGames = scores.length;
        const highestScore = Math.max(...scores.map(s => s.score));
        const averageScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / totalGames);
        
        // Get tournament-specific high scores
        const miniScores = scores.filter(s => s.tournamentId === 'mini');
        const grandScores = scores.filter(s => s.tournamentId === 'grand');
        
        const miniTournamentHighScore = miniScores.length > 0 
          ? Math.max(...miniScores.map(s => s.score)) 
          : 0;
          
        const grandTournamentHighScore = grandScores.length > 0 
          ? Math.max(...grandScores.map(s => s.score)) 
          : 0;
        
        // Calculate improvement (compare last 5 games vs previous 5)
        let recentImprovement = 0;
        
        if (totalGames >= 10) {
          const recent5 = scores.slice(0, 5);
          const previous5 = scores.slice(5, 10);
          
          const recent5Avg = recent5.reduce((sum, s) => sum + s.score, 0) / 5;
          const previous5Avg = previous5.reduce((sum, s) => sum + s.score, 0) / 5;
          
          recentImprovement = Math.round(((recent5Avg - previous5Avg) / previous5Avg) * 100);
        }
        
        setUserStats({
          totalGames,
          highestScore,
          averageScore,
          miniTournamentHighScore,
          grandTournamentHighScore,
          recentImprovement
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user statistics:', err);
        setError('Failed to load score statistics. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [user]);
  
  if (loading) {
    return <Loader message="Loading score history..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  if (!user) {
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please sign in to view your score history.</p>
        <Link to="/login" className="auth-button">Sign In</Link>
      </div>
    );
  }
  
  return (
    <div className="score-history-page-container">
      {/* SEO Optimization */}
      <Helmet>
        <title>Dino Runner - Score History</title>
        <meta name="description" content="Track your Dino Runner game scores. View your high scores and performance history." />
      </Helmet>
      
      {/* Page Header */}
      <div className="score-history-page-header">
        <h1>Your Score History</h1>
        <p className="history-subtitle">
          Track your game performance and tournament scores
        </p>
      </div>
      
      {/* Stats Overview */}
      {userStats && userStats.totalGames > 0 ? (
        <div className="stats-overview">
          <div className="stat-card total-games">
            <div className="stat-value">{userStats.totalGames}</div>
            <div className="stat-label">Total Games</div>
          </div>
          <div className="stat-card highest-score">
            <div className="stat-value">{userStats.highestScore}</div>
            <div className="stat-label">Highest Score</div>
          </div>
          <div className="stat-card average-score">
            <div className="stat-value">{userStats.averageScore}</div>
            <div className="stat-label">Average Score</div>
          </div>
          <div className="stat-card mini-tournament">
            <div className="stat-value">{userStats.miniTournamentHighScore}</div>
            <div className="stat-label">Mini Tournament Best</div>
          </div>
          <div className="stat-card grand-tournament">
            <div className="stat-value">{userStats.grandTournamentHighScore}</div>
            <div className="stat-label">Grand Tournament Best</div>
          </div>
          <div className={`stat-card improvement ${userStats.recentImprovement >= 0 ? 'positive' : 'negative'}`}>
            <div className="stat-value">
              {userStats.recentImprovement >= 0 ? '+' : ''}{userStats.recentImprovement}%
            </div>
            <div className="stat-label">Recent Improvement</div>
          </div>
        </div>
      ) : (
        <div className="no-stats-message">
          <p>Play some games to see your statistics here!</p>
          <Link to="/game" className="play-button">Play Now</Link>
        </div>
      )}
      
      {/* Detailed Score History */}
      <div className="score-history-section">
        <h2>Detailed Score History</h2>
        <ScoreHistory />
      </div>
      
      {/* Score Tips Section */}
      <div className="score-tips-section">
        <h2>Tips to Improve Your Score</h2>
        <div className="tips-container">
          <div className="tip-card">
            <div className="tip-number">1</div>
            <h3>Practice Consistently</h3>
            <p>Regular practice helps you develop muscle memory and improve reaction times.</p>
          </div>
          <div className="tip-card">
            <div className="tip-number">2</div>
            <h3>Study Obstacle Patterns</h3>
            <p>Learn to recognize patterns in how obstacles appear to anticipate and react faster.</p>
          </div>
          <div className="tip-card">
            <div className="tip-number">3</div>
            <h3>Use Boosters Strategically</h3>
            <p>Save your boosters for when you're having a particularly good run to maximize their value.</p>
          </div>
          <div className="tip-card">
            <div className="tip-number">4</div>
            <h3>Analyze Your Performance</h3>
            <p>Review your score history to identify patterns and areas for improvement.</p>
          </div>
        </div>
      </div>
      
      {/* Call to Action Section */}
      <div className="score-cta-section">
        <div className="cta-content">
          <h2>Ready to Beat Your High Score?</h2>
          <p>Jump back into the game and aim for the top of the leaderboard!</p>
          <Link to="/game" className="play-now-button">Play Now</Link>
        </div>
      </div>
    </div>
  );
};

export default ScoreHistoryPage;
