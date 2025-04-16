// src/components/common/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from './Button';
import '../../styles/components/Navbar.css';

/**
 * Navbar Component
 * 
 * Provides navigation links and handles authentication state.
 * Includes responsive design with mobile menu.
 */
const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll events to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo and brand */}
        <Link to="/" className="navbar-logo">
          <img 
            src="/assets/images/logo.png" 
            alt="Dino Tournament" 
            className="navbar-logo-img"
          />
          <span className="navbar-logo-text">Dino Tournament</span>
        </Link>

        {/* Mobile menu button */}
        <div className="navbar-mobile-toggle" onClick={toggleMenu}>
          <span className={`navbar-mobile-icon ${isOpen ? 'open' : ''}`}></span>
        </div>

        {/* Navigation links */}
        <div className={`navbar-menu ${isOpen ? 'navbar-menu-active' : ''}`}>
          {user ? (
            <>
              {/* Navigation links for authenticated users */}
              <div className="navbar-links">
                <Link 
                  to="/game" 
                  className={`navbar-link ${location.pathname === '/game' ? 'active' : ''}`}
                >
                  Game
                </Link>
                <Link 
                  to="/tournaments" 
                  className={`navbar-link ${location.pathname === '/tournaments' ? 'active' : ''}`}
                >
                  Tournaments
                </Link>
                <Link 
                  to="/history" 
                  className={`navbar-link ${location.pathname === '/history' ? 'active' : ''}`}
                >
                  Score History
                </Link>
                <Link 
                  to="/boosters" 
                  className={`navbar-link ${location.pathname === '/boosters' ? 'active' : ''}`}
                >
                  Boosters
                </Link>
                <Link 
                  to="/referrals" 
                  className={`navbar-link ${location.pathname === '/referrals' ? 'active' : ''}`}
                >
                  Referrals
                </Link>
              </div>

              {/* User profile and wallet */}
              <div className="navbar-user">
                <Link to="/wallet" className="navbar-wallet">
                  <i className="fas fa-wallet"></i>
                  <span>Wallet</span>
                </Link>
                <div className="navbar-profile-dropdown">
                  <div className="navbar-profile-trigger">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="navbar-avatar" />
                    ) : (
                      <div className="navbar-avatar-placeholder">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <span className="navbar-username">
                      {user.displayName || 'User'}
                    </span>
                    <i className="fas fa-chevron-down"></i>
                  </div>
                  <div className="navbar-dropdown-menu">
                    <Link to="/profile" className="navbar-dropdown-item">
                      <i className="fas fa-user"></i> Profile
                    </Link>
                    <div className="navbar-dropdown-divider"></div>
                    <button onClick={handleSignOut} className="navbar-dropdown-item navbar-signout">
                      <i className="fas fa-sign-out-alt"></i> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Navigation links for non-authenticated users
            <div className="navbar-auth">
              <Button 
                to="/" 
                variant="primary" 
                className="navbar-sign-in"
              >
                Sign In with Google
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
