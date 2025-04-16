// src/config/constants.js

// Wallet Configuration
export const WALLET_CONFIG = {
  // The wallet address that will receive tournament fees and booster purchases
  RECEIVING_ADDRESS: "0x67A845bC54Eb830b1d724fa183F429E02c1237D1",
  
  // Blockchain network details
  NETWORK: {
    name: "Binance Smart Chain",
    chainId: 56, // BSC Mainnet
    rpcUrl: "https://bsc-dataseed.binance.org/",
    blockExplorerUrl: "https://bscscan.com/",
    currencySymbol: "BNB",
    tokenType: "BEP20"
  },
  
  // USDT token contract on BSC
  TOKEN_CONTRACT: "0x55d398326f99059fF775485246999027B3197955", // USDT on BSC
  
  // Minimum confirmations required for a transaction to be considered valid
  MIN_CONFIRMATIONS: 6
};

// Tournament Configuration
export const TOURNAMENT_CONFIG = {
  // Duration of tournaments in days
  DURATION_DAYS: 15,
  
  // Entry fees
  ENTRY_FEES: {
    MINI: 1, // 1 USDT
    GRAND: 10 // 10 USDT
  },
  
  // Minimum withdrawable amount
  MIN_WITHDRAWAL: 10, // 10 USDT
};

// Booster Configuration
export const BOOSTER_CONFIG = {
  TYPES: [
    {
      id: 1,
      name: "Booster 1",
      price: 10, // 10 USDT
      effect: "2x score for 10 games",
      games: 10,
      multiplier: 2
    },
    {
      id: 2,
      name: "Booster 2",
      price: 50, // 50 USDT
      effect: "2x score for 100 games",
      games: 100,
      multiplier: 2
    },
    {
      id: 3,
      name: "Booster 3",
      price: 100, // 100 USDT
      effect: "2x score for unlimited games until tournament end",
      games: null, // Unlimited
      multiplier: 2
    }
  ]
};

// Referral System Configuration
export const REFERRAL_CONFIG = {
  REWARD: 1, // 1 USDT per valid referral
  MIN_PAYOUT: 10, // Minimum 10 USDT to transfer to main balance
  RULES: [
    "Each valid referral earns 1 USDT",
    "A referral is valid when the referred user pays for any tournament",
    "Referral balance will be transferred automatically after each tournament ends",
    "Minimum 10 USDT required to transfer to main balance",
    "If referral balance is less than 10 USDT, it becomes zero after tournament"
  ]
};

// Game Configuration
export const GAME_CONFIG = {
  // Initial game speed
  INITIAL_SPEED: 6,
  
  // Speed increment as game progresses
  SPEED_INCREMENT: 0.001,
  
  // Maximum game speed
  MAX_SPEED: 13,
  
  // Score multiplier per frame
  SCORE_MULTIPLIER: 0.1
};

// API Endpoints (if needed for external services)
export const API_ENDPOINTS = {
  BLOCKCHAIN_API: "https://api.bscscan.com/api",
  PRICE_FEED: "https://api.binance.com/api/v3/ticker/price"
};

// UI Constants
export const UI_CONSTANTS = {
  // Theme colors
  COLORS: {
    PRIMARY: "#4CAF50", // Green
    SECONDARY: "#FFC107", // Amber
    ACCENT: "#F44336", // Red
    BACKGROUND: "#F5F5F5", // Light grey
    TEXT: "#212121", // Dark grey
    TEXT_LIGHT: "#757575" // Medium grey
  },
  
  // Animation durations
  ANIMATIONS: {
    SHORT: 200, // ms
    MEDIUM: 500, // ms
    LONG: 1000 // ms
  },
  
  // Breakpoints for responsive design
  BREAKPOINTS: {
    MOBILE: 480,
    TABLET: 768,
    DESKTOP: 1024,
    LARGE_DESKTOP: 1440
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  AUTH: {
    SIGN_IN_FAILED: "Failed to sign in with Google. Please try again.",
    SESSION_EXPIRED: "Your session has expired. Please sign in again."
  },
  PAYMENT: {
    VERIFICATION_FAILED: "Payment verification failed. Please check your transaction and try again.",
    INSUFFICIENT_FUNDS: "Insufficient funds to complete this transaction."
  },
  TOURNAMENT: {
    REGISTRATION_FAILED: "Failed to register for tournament. Please try again.",
    ALREADY_REGISTERED: "You are already registered for this tournament."
  },
  GAME: {
    LOAD_FAILED: "Failed to load game. Please refresh the page and try again."
  },
  REFERRAL: {
    INVALID_CODE: "Invalid referral code. Please check and try again.",
    ALREADY_REFERRED: "You have already used a referral code."
  }
};

// Success Messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    SIGN_IN_SUCCESS: "Successfully signed in!",
  },
  PAYMENT: {
    VERIFICATION_SUCCESS: "Payment verified successfully!",
    WITHDRAWAL_INITIATED: "Withdrawal initiated successfully!"
  },
  TOURNAMENT: {
    REGISTRATION_SUCCESS: "Successfully registered for the tournament!",
  },
  REFERRAL: {
    CODE_APPLIED: "Referral code applied successfully!",
    REWARD_RECEIVED: "Referral reward received!"
  },
  BOOSTER: {
    PURCHASE_SUCCESS: "Booster purchased successfully!"
  }
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_USER: "dino_tournament_user",
  GAME_SETTINGS: "dino_game_settings",
  REFERRAL_CODE: "dino_referral_code"
};

// Export all constants as a single object
export default {
  WALLET_CONFIG,
  TOURNAMENT_CONFIG,
  BOOSTER_CONFIG,
  REFERRAL_CONFIG,
  GAME_CONFIG,
  API_ENDPOINTS,
  UI_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS
};
