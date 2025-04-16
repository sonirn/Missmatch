// src/components/tournament/TournamentTimer.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow, differenceInSeconds, format } from 'date-fns';
import '../../styles/components/TournamentTimer.css';

/**
 * TournamentTimer Component
 * Displays a countdown timer for active tournaments
 * Shows appropriate messages for upcoming or completed tournaments
 */
const TournamentTimer = ({ tournament }) => {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [timerMessage, setTimerMessage] = useState('');
  
  useEffect(() => {
    if (!tournament) return;
    
    // Convert Firestore timestamp to JS Date if necessary
    const startDate = tournament.startDate?.seconds 
      ? new Date(tournament.startDate.seconds * 1000) 
      : new Date(tournament.startDate);
      
    const endDate = tournament.endDate?.seconds 
      ? new Date(tournament.endDate.seconds * 1000) 
      : new Date(tournament.endDate);
    
    const now = new Date();
    
    // Set appropriate timer message based on tournament status
    if (tournament.status === 'upcoming') {
      setTimerMessage(`Tournament starts ${formatDistanceToNow(startDate, { addSuffix: true })}`);
    } else if (tournament.status === 'completed') {
      setTimerMessage('Tournament has ended');
    } else if (tournament.status === 'active') {
      // For active tournaments, set up the countdown timer
      const updateTimer = () => {
        const now = new Date();
        
        if (now >= endDate) {
          setTimerMessage('Tournament has ended');
          clearInterval(timerInterval);
          return;
        }
        
        const secondsRemaining = differenceInSeconds(endDate, now);
        
        const days = Math.floor(secondsRemaining / (24 * 60 * 60));
        const hours = Math.floor((secondsRemaining % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((secondsRemaining % (60 * 60)) / 60);
        const seconds = Math.floor(secondsRemaining % 60);
        
        setTimeRemaining({ days, hours, minutes, seconds });
      };
      
      // Update timer immediately and then every second
      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
      
      // Clean up interval on unmount
      return () => clearInterval(timerInterval);
    }
  }, [tournament]);
  
  // Format dates for display
  const formatDate = (date) => {
    if (!date) return '';
    
    const jsDate = date?.seconds 
      ? new Date(date.seconds * 1000) 
      : new Date(date);
      
    return format(jsDate, 'MMM d, yyyy h:mm a');
  };
  
  if (!tournament) {
    return null;
  }
  
  // Render different UI based on tournament status
  if (tournament.status === 'upcoming' || tournament.status === 'completed') {
    return (
      <div className={`tournament-timer ${tournament.status}`}>
        <div className="timer-message">{timerMessage}</div>
        <div className="tournament-dates">
          <div className="date-item">
            <span className="date-label">Start:</span>
            <span className="date-value">{formatDate(tournament.startDate)}</span>
          </div>
          <div className="date-item">
            <span className="date-label">End:</span>
            <span className="date-value">{formatDate(tournament.endDate)}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Render countdown timer for active tournaments
  return (
    <div className="tournament-timer active">
      <div className="timer-header">Tournament Ends In:</div>
      <div className="countdown-timer">
        <div className="timer-unit">
          <div className="timer-value">{timeRemaining.days}</div>
          <div className="timer-label">Days</div>
        </div>
        <div className="timer-separator">:</div>
        <div className="timer-unit">
          <div className="timer-value">{timeRemaining.hours.toString().padStart(2, '0')}</div>
          <div className="timer-label">Hours</div>
        </div>
        <div className="timer-separator">:</div>
        <div className="timer-unit">
          <div className="timer-value">{timeRemaining.minutes.toString().padStart(2, '0')}</div>
          <div className="timer-label">Mins</div>
        </div>
        <div className="timer-separator">:</div>
        <div className="timer-unit">
          <div className="timer-value">{timeRemaining.seconds.toString().padStart(2, '0')}</div>
          <div className="timer-label">Secs</div>
        </div>
      </div>
      <div className="tournament-dates">
        <div className="date-item">
          <span className="date-label">Started:</span>
          <span className="date-value">{formatDate(tournament.startDate)}</span>
        </div>
        <div className="date-item">
          <span className="date-label">Ends:</span>
          <span className="date-value">{formatDate(tournament.endDate)}</span>
        </div>
      </div>
    </div>
  );
};

TournamentTimer.propTypes = {
  tournament: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.oneOf(['upcoming', 'active', 'completed']).isRequired,
    startDate: PropTypes.oneOfType([
      PropTypes.object, // Firestore timestamp
      PropTypes.string, // ISO string
      PropTypes.number  // Unix timestamp
    ]).isRequired,
    endDate: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.string,
      PropTypes.number
    ]).isRequired
  })
};

export default TournamentTimer;
