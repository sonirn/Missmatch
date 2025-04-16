// src/utils/errorHandler.js

/**
 * Utility functions for handling errors in the tournament application
 */

/**
 * Log an error to the console and optionally send it to a server
 * @param {Error} error - The error object
 * @param {string} context - Context or location where the error occurred
 */
export const logError = (error, context = '') => {
  console.error(`Error in ${context}:`, error);

  // Example: Send error details to a remote logging server
  // This can be enabled in production
  /*
  fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    })
  }).catch(err => console.error('Error sending log:', err));
  */
};

/**
 * Get a user-friendly message for common blockchain errors
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export const getBlockchainErrorMessage = (error) => {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('user denied') || errorMessage.includes('user rejected')) {
    return 'Transaction was rejected by the user.';
  }

  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds to complete the transaction.';
  }

  if (errorMessage.includes('gas') && errorMessage.includes('limit')) {
    return 'Transaction could not be completed due to gas limit issues.';
  }

  if (errorMessage.includes('nonce')) {
    return 'Transaction error: Nonce too high. Please try again.';
  }

  if (errorMessage.includes('connect') || errorMessage.includes('network')) {
    return 'Network connection error. Please check your internet connection or try again later.';
  }

  if (errorMessage.includes('binance') || errorMessage.includes('bsc')) {
    return 'Please make sure you are connected to the Binance Smart Chain network.';
  }

  return 'An unexpected error occurred with the blockchain transaction. Please try again later.';
};

/**
 * Handle an error by logging it and returning a user-friendly message
 * @param {Error} error - The error object
 * @param {string} context - Context or location where the error occurred
 * @returns {string} User-friendly error message
 */
export const handleError = (error, context = '') => {
  logError(error, context);

  // Check if it's a blockchain-related error
  if (error.message && (
      error.message.includes('ethereum') || 
      error.message.includes('MetaMask') ||
      error.message.includes('wallet') ||
      error.message.includes('transaction') ||
      error.message.includes('gas') ||
      error.message.includes('network') ||
      error.message.includes('chain')
    )) {
    return getBlockchainErrorMessage(error);
  }

  // General application errors
  if (error.message.includes('auth') || error.message.includes('login')) {
    return 'Authentication error. Please try logging in again.';
  }

  if (error.message.includes('permission') || error.message.includes('access')) {
    return 'You do not have permission to perform this action.';
  }

  if (error.message.includes('not found') || error.message.includes('404')) {
    return 'The requested resource was not found.';
  }

  if (error.message.includes('timeout') || error.message.includes('timed out')) {
    return 'The request timed out. Please check your internet connection and try again.';
  }

  // Default message for other errors
  return 'An unexpected error occurred. Please try again later.';
};

/**
 * Handle async errors in React components
 * @param {Function} asyncFunction - Async function to execute
 * @param {Function} setError - State setter for error message
 * @param {Function} setLoading - State setter for loading state
 * @param {string} context - Context for error logging
 * @returns {Function} Wrapped function that handles errors
 */
export const handleAsyncError = (asyncFunction, setError, setLoading, context = '') => {
  return async (...args) => {
    try {
      if (setLoading) setLoading(true);
      if (setError) setError(null);
      
      return await asyncFunction(...args);
    } catch (error) {
      const errorMessage = handleError(error, context);
      if (setError) setError(errorMessage);
      return null;
    } finally {
      if (setLoading) setLoading(false);
    }
  };
};

/**
 * Validate form inputs and return any errors
 * @param {Object} inputs - Form inputs to validate
 * @param {Object} validationRules - Validation rules for each input
 * @returns {Object} Object containing any validation errors
 */
export const validateForm = (inputs, validationRules) => {
  const errors = {};
  
  Object.keys(validationRules).forEach(field => {
    const value = inputs[field];
    const rules = validationRules[field];
    
    // Required field validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors[field] = rules.requiredMessage || `${field} is required`;
      return;
    }
    
    // Skip other validations if field is empty and not required
    if (!value && !rules.required) {
      return;
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.patternMessage || `${field} is invalid`;
    }
    
    // Min/max validation for numbers
    if (rules.min !== undefined && value < rules.min) {
      errors[field] = rules.minMessage || `${field} must be at least ${rules.min}`;
    }
    
    if (rules.max !== undefined && value > rules.max) {
      errors[field] = rules.maxMessage || `${field} must be at most ${rules.max}`;
    }
    
    // Length validation for strings
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors[field] = rules.minLengthMessage || `${field} must be at least ${rules.minLength} characters`;
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors[field] = rules.maxLengthMessage || `${field} cannot exceed ${rules.maxLength} characters`;
      }
    }
    
    // Custom validation
    if (rules.custom && typeof rules.custom === 'function') {
      const customError = rules.custom(value, inputs);
      if (customError) {
        errors[field] = customError;
      }
    }
  });
  
  return errors;
};
