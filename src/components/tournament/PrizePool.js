// src/components/tournament/PrizePool.js
import React from 'react';
import PropTypes from 'prop-types';
import { miniTournamentPrizes, grandTournamentPrizes, getTotalPrizePool } from '../../config/prize-pool-config';
import '../../styles/components/PrizePool.css';

/**
 * PrizePool Component
 * Displays the prize distribution for a specific tournament type
 */
const PrizePool = ({ tournamentType }) => {
  const prizes = tournamentType === 'mini' ? miniTournamentPrizes : grandTournamentPrizes;
  const totalPrizePool = getTotalPrizePool(tournamentType);
  
  // Format number with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <div className="prize-pool">
      <div className="prize-pool-header">
        <h3>{tournamentType === 'mini' ? 'Mini Tournament' : 'Grand Tournament'} Prize Pool</h3>
        <div className="prize-pool-total">
          <span className="total-amount">{formatNumber(totalPrizePool.usdt)} USDT</span>
          <span className="plus">+</span>
          <span className="total-amount">{formatNumber(totalPrizePool.dino)} DINO</span>
        </div>
      </div>

      <div className="prize-table-container">
        <table className="prize-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>USDT Prize</th>
              <th>DINO Prize</th>
            </tr>
          </thead>
          <tbody>
            {prizes.map((prize, index) => (
              <tr key={index} className={prize.isSpecial ? 'special-prize' : ''}>
                <td className="rank-cell">
                  {prize.isRange ? (
                    <span className="rank-range">{prize.rank}</span>
                  ) : prize.isSpecial ? (
                    <span className="special-rank">{prize.rank}</span>
                  ) : (
                    <span className={`rank-badge rank-${prize.rank}`}>{prize.rank}</span>
                  )}
                </td>
                <td className="prize-usdt">{formatNumber(prize.usdt)} USDT</td>
                <td className="prize-dino">{formatNumber(prize.dino)} DINO</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prize-pool-notes">
        <p>All prizes will be distributed within 72 hours after the tournament ends.</p>
        <p>DINO tokens will be claimable after the official listing.</p>
      </div>
    </div>
  );
};

PrizePool.propTypes = {
  tournamentType: PropTypes.oneOf(['mini', 'grand']).isRequired
};

export default PrizePool;
