// src/utils/formatters.js

/**
 * Utility functions for formatting various data types in the tournament application
 */

/**
 * Format a number as currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USDT')
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USDT', decimals = 2) => {
  if (amount === null || amount === undefined) return '-';
  
  // Handle different currencies
  switch (currency) {
    case 'USDT':
    case 'DINO':
      return `${Number(amount).toFixed(decimals)} ${currency}`;
    case 'USD':
      return `$${Number(amount).toFixed(decimals)}`;
    default:
      return `${Number(amount).toFixed(decimals)} ${currency}`;
  }
};

/**
 * Format a large number with thousands separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format a date to a readable string
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '-';
  
  const {
    includeTime = false,
    includeSeconds = false,
    useRelative = false,
    shortMonth = false
  } = options;
  
  // Convert to Date object if needed
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  // Use relative time if requested
  if (useRelative) {
    return formatRelativeTime(dateObj);
  }
  
  // Format options
  const monthFormat = shortMonth ? 'short' : 'long';
  
  // Basic date formatting
  let formatted = `${dateObj.getDate()} ${dateObj.toLocaleString('en-US', { month: monthFormat })} ${dateObj.getFullYear()}`;
  
  // Add time if requested
  if (includeTime) {
    const timeFormat = includeSeconds ? 
      dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 
      dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    formatted += ` at ${timeFormat}`;
  }
  
  return formatted;
};

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * @param {Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '-';
  
  // Convert to Date object if needed
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSec = Math.floor(diffMs / 1000);
  
  // Future date
  if (diffSec < 0) {
    const absDiffSec = Math.abs(diffSec);
    
    if (absDiffSec < 60) return 'in a few seconds';
    if (absDiffSec < 3600) return `in ${Math.floor(absDiffSec / 60)} minute(s)`;
    if (absDiffSec < 86400) return `in ${Math.floor(absDiffSec / 3600)} hour(s)`;
    if (absDiffSec < 2592000) return `in ${Math.floor(absDiffSec / 86400)} day(s)`;
    if (absDiffSec < 31536000) return `in ${Math.floor(absDiffSec / 2592000)} month(s)`;
    return `in ${Math.floor(absDiffSec / 31536000)} year(s)`;
  }
  
  // Past date
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minute(s) ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hour(s) ago`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)} day(s) ago`;
  if (diffSec < 31536000) return `${Math.floor(diffSec / 2592000)} month(s) ago`;
  return `${Math.floor(diffSec / 31536000)} year(s) ago`;
};

/**
 * Format a wallet address by truncating the middle
 * @param {string} address - Wallet address to format
 * @param {number} startChars - Number of starting characters to show (default: 6)
 * @param {number} endChars - Number of ending characters to show (default: 4)
 * @returns {string} Formatted address
 */
export const formatAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return '-';
  
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
};

/**
 * Format a transaction hash by truncating the middle
 * @param {string} hash - Transaction hash to format
 * @param {number} startChars - Number of starting characters to show (default: 10)
 * @param {number} endChars - Number of ending characters to show (default: 10)
 * @returns {string} Formatted hash
 */
export const formatTransactionHash = (hash, startChars = 10, endChars = 10) => {
  if (!hash) return '-';
  
  if (hash.length <= startChars + endChars) {
    return hash;
  }
  
  return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`;
};

/**
 * Format a status string for display
 * @param {string} status - Status to format
 * @returns {string} Formatted status
 */
export const formatStatus = (status) => {
  if (!status) return '-';
  
  // Capitalize first letter and replace underscores with spaces
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
};

/**
 * Format a score with commas and optional suffix
 * @param {number} score - Score to format
 * @param {boolean} abbreviated - Whether to abbreviate large scores (default: false)
 * @returns {string} Formatted score
 */
export const formatScore = (score, abbreviated = false) => {
  if (score === null || score === undefined) return '-';
  
  if (!abbreviated) {
    return formatNumber(score);
  }
  
  // Abbreviate large scores
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  
  return score.toString();
};

/**
 * Format a tournament type for display
 * @param {string} type - Tournament type ('mini' or 'grand')
 * @returns {string} Formatted tournament type
 */
export const formatTournamentType = (type) => {
  if (type === 'mini') return 'Mini Tournament';
  if (type === 'grand') return 'Grand Tournament';
  return type;
};

/**
 * Format a booster type for display
 * @param {string} type - Booster type
 * @returns {string} Formatted booster type
 */
export const formatBoosterType = (type) => {
  switch (type) {
    case 'booster1':
      return 'Score Doubler (10 Games)';
    case 'booster2':
      return 'Score Doubler (100 Games)';
    case 'booster3':
      return 'Score Doubler (Unlimited)';
    default:
      return type;
  }
};

/**
 * Format a countdown timer
 * @param {Date|string|number} endDate - End date for countdown
 * @returns {string} Formatted countdown
 */
export const formatCountdown = (endDate) => {
  if (!endDate) return '-';
  
  // Convert to Date object if needed
  const endDateObj = endDate instanceof Date ? endDate : new Date(endDate);
  
  // Check if date is valid
  if (isNaN(endDateObj.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffMs = endDateObj - now;
  
  // If already passed
  if (diffMs <= 0) {
    return 'Ended';
  }
  
  // Calculate days, hours, minutes, seconds
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  // Format the countdown
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  
  return `${seconds}s`;
};
