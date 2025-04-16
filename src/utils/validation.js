// src/utils/validation.js

/**
 * Utility functions for validating various inputs in the tournament application
 */

/**
 * Validates a BEP20 wallet address
 * @param {string} address - The wallet address to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateBEP20Address = (address) => {
  if (!address) {
    return { isValid: false, error: 'Wallet address is required' };
  }
  
  // Check if it's a valid BEP20 address (0x followed by 40 hex characters)
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
  return {
    isValid,
    error: isValid ? null : 'Please enter a valid BEP20 wallet address'
  };
};

/**
 * Validates an email address
 * @param {string} email - The email address to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email address is required' };
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailPattern.test(email);
  return {
    isValid,
    error: isValid ? null : 'Please enter a valid email address'
  };
};

/**
 * Validates a withdrawal amount
 * @param {string|number} amount - The amount to validate
 * @param {number} maxAmount - Maximum allowed amount (user's balance)
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateWithdrawalAmount = (amount, maxAmount) => {
  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if it's a valid number
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }
  
  // Check if it's positive
  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than zero' };
  }
  
  // Check if it's within balance
  if (numAmount > maxAmount) {
    return { isValid: false, error: 'Amount exceeds your available balance' };
  }
  
  // Check if it has too many decimal places (USDT typically allows 6)
  const decimalPlaces = countDecimalPlaces(numAmount);
  if (decimalPlaces > 6) {
    return { isValid: false, error: 'Amount cannot have more than 6 decimal places' };
  }
  
  return { isValid: true, error: null };
};

/**
 * Count the number of decimal places in a number
 * @param {number} num - Number to check
 * @returns {number} Number of decimal places
 */
export const countDecimalPlaces = (num) => {
  if (Math.floor(num) === num) return 0;
  return num.toString().split('.')[1]?.length || 0;
};

/**
 * Validates a referral code
 * @param {string} code - The referral code to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateReferralCode = (code) => {
  if (!code) {
    return { isValid: false, error: 'Referral code is required' };
  }
  
  // Referral codes are 8 characters alphanumeric (uppercase)
  const isValid = /^[A-Z0-9]{8}$/.test(code);
  return {
    isValid,
    error: isValid ? null : 'Please enter a valid referral code (8 alphanumeric characters)'
  };
};

/**
 * Validates a tournament type
 * @param {string} type - The tournament type to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateTournamentType = (type) => {
  if (!type) {
    return { isValid: false, error: 'Tournament type is required' };
  }
  
  const isValid = type === 'mini' || type === 'grand';
  return {
    isValid,
    error: isValid ? null : 'Invalid tournament type. Must be "mini" or "grand"'
  };
};

/**
 * Validates a booster type
 * @param {string} type - The booster type to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateBoosterType = (type) => {
  if (!type) {
    return { isValid: false, error: 'Booster type is required' };
  }
  
  const isValid = ['booster1', 'booster2', 'booster3'].includes(type);
  return {
    isValid,
    error: isValid ? null : 'Invalid booster type. Must be "booster1", "booster2", or "booster3"'
  };
};

/**
 * Validates a game score
 * @param {number} score - The score to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateScore = (score) => {
  if (score === undefined || score === null) {
    return { isValid: false, error: 'Score is required' };
  }
  
  // Score must be a number and non-negative
  const isValid = typeof score === 'number' && !isNaN(score) && score >= 0;
  return {
    isValid,
    error: isValid ? null : 'Score must be a non-negative number'
  };
};

/**
 * Validates a display name
 * @param {string} name - The display name to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateDisplayName = (name) => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Display name cannot be empty' };
  }
  
  if (name.length < 3) {
    return { isValid: false, error: 'Display name must be at least 3 characters' };
  }
  
  if (name.length > 30) {
    return { isValid: false, error: 'Display name cannot exceed 30 characters' };
  }
  
  // Check for inappropriate content (basic filter)
  const inappropriateTerms = ['admin', 'moderator', 'staff', 'support'];
  if (inappropriateTerms.some(term => name.toLowerCase().includes(term))) {
    return { isValid: false, error: 'Display name contains inappropriate terms' };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validates a payment amount for a specific purpose
 * @param {number} amount - Amount to validate
 * @param {string} purpose - Purpose of payment ('mini', 'grand', 'booster1', 'booster2', 'booster3')
 * @returns {Object} Validation result with isValid and error properties
 */
export const validatePaymentAmount = (amount, purpose) => {
  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if it's a valid number
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }
  
  let expectedAmount;
  let purposeName;
  
  switch (purpose) {
    case 'mini':
      expectedAmount = 1;
      purposeName = 'Mini Tournament entry';
      break;
    case 'grand':
      expectedAmount = 10;
      purposeName = 'Grand Tournament entry';
      break;
    case 'booster1':
      expectedAmount = 10;
      purposeName = 'Booster 1';
      break;
    case 'booster2':
      expectedAmount = 50;
      purposeName = 'Booster 2';
      break;
    case 'booster3':
      expectedAmount = 100;
      purposeName = 'Booster 3';
      break;
    default:
      return { isValid: false, error: 'Invalid payment purpose' };
  }
  
  const isValid = numAmount === expectedAmount;
  return {
    isValid,
    error: isValid ? null : `Payment amount for ${purposeName} must be exactly ${expectedAmount} USDT`
  };
};

/**
 * Validates a transaction hash
 * @param {string} hash - Transaction hash to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateTransactionHash = (hash) => {
  if (!hash) {
    return { isValid: false, error: 'Transaction hash is required' };
  }
  
  // Transaction hashes are 0x followed by 64 hex characters
  const isValid = /^0x[a-fA-F0-9]{64}$/.test(hash);
  return {
    isValid,
    error: isValid ? null : 'Invalid transaction hash format'
  };
};

/**
 * Validates a complete form
 * @param {Object} formData - Form data object
 * @param {Object} validationRules - Validation rules for each field
 * @returns {Object} Validation results with isValid and errors
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  for (const field in validationRules) {
    if (Object.prototype.hasOwnProperty.call(validationRules, field)) {
      const value = formData[field];
      const rules = validationRules[field];
      
      // Skip validation if field is not required and empty
      if (!rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        continue;
      }
      
      // Required check
      if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        errors[field] = rules.errorMessages?.required || `${field} is required`;
        isValid = false;
        continue;
      }
      
      // Min length check
      if (rules.minLength !== undefined && typeof value === 'string' && value.length < rules.minLength) {
        errors[field] = rules.errorMessages?.minLength || 
          `${field} must be at least ${rules.minLength} characters`;
        isValid = false;
        continue;
      }
      
      // Max length check
      if (rules.maxLength !== undefined && typeof value === 'string' && value.length > rules.maxLength) {
        errors[field] = rules.errorMessages?.maxLength || 
          `${field} cannot exceed ${rules.maxLength} characters`;
        isValid = false;
        continue;
      }
      
      // Pattern check
      if (rules.pattern && !rules.pattern.test(value)) {
        errors[field] = rules.errorMessages?.pattern || `${field} is in an invalid format`;
        isValid = false;
        continue;
      }
      
      // Custom validation
      if (rules.validate && typeof rules.validate === 'function') {
        const customValidation = rules.validate(value, formData);
        if (!customValidation.isValid) {
          errors[field] = customValidation.error;
          isValid = false;
        }
      }
    }
  }
  
  return { isValid, errors };
};
