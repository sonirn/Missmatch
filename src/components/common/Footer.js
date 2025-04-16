// src/components/common/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import { SPONSORS, DINO_COIN } from '../../config/tournament-config';
import '../../styles/components/Footer.css';

/**
 * Footer Component
 * 
 * Displays website information, sponsors, and important links.
 * Uses tournament configuration for dynamic content.
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main footer content */}
        <div className="footer-content">
          {/* Company/Brand info */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img 
                src="/assets/images/logo.png" 
                alt="Dino Tournament" 
                className="footer-logo-img"
              />
              <span className="footer-logo-text">Dino Tournament</span>
            </Link>
            <p className="footer-description">
              Compete in our Chrome Dinosaur Game Tournament for a chance to win from a prize pool of 
              615,500 USDT and 61,550 DINO coins!
            </p>
          </div>

          {/* Tournament links */}
          <div className="footer-links">
            <h3 className="footer-heading">Tournaments</h3>
            <ul className="footer-link-list">
              <li>
                <Link to="/tournaments" className="footer-link">
                  Mini Tournament
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="footer-link">
                  Grand Tournament
                </Link>
              </li>
              <li>
                <Link to="/boosters" className="footer-link">
                  Boosters
                </Link>
              </li>
              <li>
                <Link to="/history" className="footer-link">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Account links */}
          <div className="footer-links">
            <h3 className="footer-heading">Account</h3>
            <ul className="footer-link-list">
              <li>
                <Link to="/profile" className="footer-link">
                  Profile
                </Link>
              </li>
              <li>
                <Link to="/wallet" className="footer-link">
                  Wallet
                </Link>
              </li>
              <li>
                <Link to="/referrals" className="footer-link">
                  Referrals
                </Link>
              </li>
              <li>
                <Link to="/history" className="footer-link">
                  Score History
                </Link>
              </li>
            </ul>
          </div>

          {/* DINO Coin info */}
          <div className="footer-dino">
            <h3 className="footer-heading">{DINO_COIN.name}</h3>
            <div className="footer-dino-info">
              <img 
                src={DINO_COIN.logo} 
                alt={DINO_COIN.name} 
                className="footer-dino-logo"
              />
              <div className="footer-dino-details">
                <p className="footer-dino-description">
                  {DINO_COIN.description}
                </p>
                <p className="footer-dino-status">
                  Status: <span>{DINO_COIN.status}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sponsors section */}
        <div className="footer-sponsors">
          <h3 className="footer-heading">Sponsored By</h3>
          <div className="footer-sponsors-list">
            {SPONSORS.map(sponsor => (
              <a 
                key={sponsor.id}
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-sponsor"
              >
                <img 
                  src={sponsor.logo} 
                  alt={sponsor.name} 
                  className="footer-sponsor-logo"
                />
              </a>
            ))}
          </div>
        </div>

        {/* Social links */}
        <div className="footer-social">
          <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <i className="fab fa-twitter"></i>
          </a>
          <a href="https://telegram.org/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <i className="fab fa-telegram"></i>
          </a>
          <a href="https://discord.com/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <i className="fab fa-discord"></i>
          </a>
          <a href="https://medium.com/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <i className="fab fa-medium"></i>
          </a>
        </div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {currentYear} Dino Tournament. All rights reserved.
          </p>
          <div className="footer-legal">
            <Link to="/terms" className="footer-legal-link">Terms of Service</Link>
            <Link to="/privacy" className="footer-legal-link">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
