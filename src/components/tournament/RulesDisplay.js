// src/components/tournament/RulesDisplay.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import '../../styles/components/RulesDisplay.css';

/**
 * RulesDisplay Component
 * Displays tournament rules and requirements with interactive sections
 */
const RulesDisplay = ({ tournamentType }) => {
  const [expandedSection, setExpandedSection] = useState('participation');

  // Toggle section expansion
  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  // Check if section is expanded
  const isSectionExpanded = (section) => {
    return expandedSection === section;
  };

  return (
    <div className="rules-display">
      <h3 className="rules-title">Tournament Rules</h3>
      
      <div className="rules-accordion">
        {/* Participation Rules */}
        <div className="rules-section">
          <div 
            className={`rules-section-header ${isSectionExpanded('participation') ? 'expanded' : ''}`}
            onClick={() => toggleSection('participation')}
          >
            <h4>Participation Requirements</h4>
            <span className="toggle-icon">
              {isSectionExpanded('participation') ? '−' : '+'}
            </span>
          </div>
          
          {isSectionExpanded('participation') && (
            <div className="rules-section-content">
              <ul className="rules-list">
                <li>
                  <span className="rule-number">1</span>
                  <span className="rule-text">
                    To participate in the {tournamentType === 'mini' ? 'Mini Tournament' : 'Grand Tournament'}, 
                    every user must pay a one-time fee of {tournamentType === 'mini' ? '1 USDT' : '10 USDT'} (BEP20).
                  </span>
                </li>
                <li>
                  <span className="rule-number">2</span>
                  <span className="rule-text">
                    Users can only play the game after paying the tournament fee.
                  </span>
                </li>
                <li>
                  <span className="rule-number">3</span>
                  <span className="rule-text">
                    Payment must be made using BEP20 USDT to the official tournament wallet address: 
                    <code>0x67A845bC54Eb830b1d724fa183F429E02c1237D1</code>
                  </span>
                </li>
                <li>
                  <span className="rule-number">4</span>
                  <span className="rule-text">
                    Google account sign-up is required for registration.
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>
        
        {/* Ranking Rules */}
        <div className="rules-section">
          <div 
            className={`rules-section-header ${isSectionExpanded('ranking') ? 'expanded' : ''}`}
            onClick={() => toggleSection('ranking')}
          >
            <h4>Ranking System</h4>
            <span className="toggle-icon">
              {isSectionExpanded('ranking') ? '−' : '+'}
            </span>
          </div>
          
          {isSectionExpanded('ranking') && (
            <div className="rules-section-content">
              <ul className="rules-list">
                <li>
                  <span className="rule-number">1</span>
                  <span className="rule-text">
                    Tournament ranking is based on the highest score achieved during the tournament period.
                  </span>
                </li>
                <li>
                  <span className="rule-number">2</span>
                  <span className="rule-text">
                    Players can attempt multiple runs to improve their high score.
                  </span>
                </li>
                <li>
                  <span className="rule-number">3</span>
                  <span className="rule-text">
                    In case of a tie, the player who achieved the score first will be ranked higher.
                  </span>
                </li>
                <li>
                  <span className="rule-number">4</span>
                  <span className="rule-text">
                    A player's ranking in each tournament is independent. For example, a player could rank 1st in the Mini Tournament but 10th in the Grand Tournament.
                  </span>
                </li>
              </ul>
              
              <div className="ranking-example">
                <h5>Example:</h5>
                <p>
                  If Player A achieves a high score of 1500 (highest among all players) but didn't pay for the Grand Tournament, 
                  and Player B achieves a score of 1499 (second highest) and paid for both tournaments, then:
                </p>
                <ul>
                  <li>Player A will be ranked 1st in the Mini Tournament</li>
                  <li>Player B will be ranked 1st in the Grand Tournament and 2nd in the Mini Tournament</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
        {/* Boosters Rules (only for Grand Tournament) */}
        {tournamentType === 'grand' && (
          <div className="rules-section">
            <div 
              className={`rules-section-header ${isSectionExpanded('boosters') ? 'expanded' : ''}`}
              onClick={() => toggleSection('boosters')}
            >
              <h4>Boosters</h4>
              <span className="toggle-icon">
                {isSectionExpanded('boosters') ? '−' : '+'}
              </span>
            </div>
            
            {isSectionExpanded('boosters') && (
              <div className="rules-section-content">
                <p className="booster-note">
                  Boosters are available only for the Grand Tournament
                </p>
                
                <div className="boosters-list">
                  <div className="booster-item">
                    <div className="booster-header">
                      <span className="booster-name">Booster 1</span>
                      <span className="booster-price">10 USDT</span>
                    </div>
                    <p className="booster-description">
                      Double your high score for your next 10 matches. For example, if you score 1000, it will be automatically doubled to 2000.
                    </p>
                  </div>
                  
                  <div className="booster-item">
                    <div className="booster-header">
                      <span className="booster-name">Booster 2</span>
                      <span className="booster-price">50 USDT</span>
                    </div>
                    <p className="booster-description">
                      Double your high score for your next 100 matches.
                    </p>
                  </div>
                  
                  <div className="booster-item">
                    <div className="booster-header">
                      <span className="booster-name">Booster 3</span>
                      <span className="booster-price">100 USDT</span>
                    </div>
                    <p className="booster-description">
                      Double every game high score until the tournament ends.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Referral Rules */}
        <div className="rules-section">
          <div 
            className={`rules-section-header ${isSectionExpanded('referrals') ? 'expanded' : ''}`}
            onClick={() => toggleSection('referrals')}
          >
            <h4>Referral System</h4>
            <span className="toggle-icon">
              {isSectionExpanded('referrals') ? '−' : '+'}
            </span>
          </div>
          
          {isSectionExpanded('referrals') && (
            <div className="rules-section-content">
              <ul className="rules-list">
                <li>
                  <span className="rule-number">1</span>
                  <span className="rule-text">
                    Each valid referral earns you 1 USDT.
                  </span>
                </li>
                <li>
                  <span className="rule-number">2</span>
                  <span className="rule-text">
                    A referral is considered valid when the referred user registers using your referral code AND pays the fee for any tournament.
                  </span>
                </li>
                <li>
                  <span className="rule-number">3</span>
                  <span className="rule-text">
                    Referral balance will be transferred automatically after each tournament ends.
                  </span>
                </li>
                <li>
                  <span className="rule-number">4</span>
                  <span className="rule-text">
                    Referral balance must be greater than 10 USDT to be transferred to your main balance. If it's less than 10 USDT, it will be reset to zero after the tournament.
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>
        
        {/* Prize Distribution */}
        <div className="rules-section">
          <div 
            className={`rules-section-header ${isSectionExpanded('prizes') ? 'expanded' : ''}`}
            onClick={() => toggleSection('prizes')}
          >
            <h4>Prize Distribution</h4>
            <span className="toggle-icon">
              {isSectionExpanded('prizes') ? '−' : '+'}
            </span>
          </div>
          
          {isSectionExpanded('prizes') && (
            <div className="rules-section-content">
              <p>
                Prizes will be distributed within 72 hours after the tournament ends. All prizes will be sent to the user's balance on the platform.
              </p>
              <p>
                DINO tokens will be claimable after the official listing. USDT prizes can be withdrawn immediately after distribution.
              </p>
              <p>
                For detailed prize breakdown, please refer to the Prize Pool section.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="rules-footer">
        <p>The tournament organizers reserve the right to modify these rules at any time. Any changes will be announced on the platform.</p>
      </div>
    </div>
  );
};

RulesDisplay.propTypes = {
  tournamentType: PropTypes.oneOf(['mini', 'grand']).isRequired
};

export default RulesDisplay;
