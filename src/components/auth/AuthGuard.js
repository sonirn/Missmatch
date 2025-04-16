// src/components/auth/AuthGuard.js
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../common/Loader';
import { STORAGE_KEYS } from '../../config/constants';

/**
 * AuthGuard Component
  * 
   * Protects routes that require authentication.
    * Redirects unauthenticated users to the home page.
     * Displays a loading indicator while checking authentication.
      */
      const AuthGuard = () => {
        const { user, loading } = useAuth();
          const location = useLocation();

            // Store the current location in localStorage if the user is not authenticated
              // This allows redirecting back after login
                if (!user && !loading) {
                    localStorage.setItem(STORAGE_KEYS.AUTH_USER, location.pathname);
                      }

                        // Show loader while checking authentication
                          if (loading) {
                              return (
                                    <div className="auth-guard-loading">
                                            <Loader fullPage text="Checking authentication..." />
                                                  </div>
                                                      );
                                                        }

                                                          // If user is not authenticated, redirect to home page
                                                            if (!user) {
                                                                return <Navigate to="/" state={{ from: location.pathname }} replace />;
                                                                  }

                                                                    // If user is authenticated, render the protected route
                                                                      return <Outlet />;
                                                                      };

                                                                      export default AuthGuard;
                                                                      