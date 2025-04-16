// src/config/payment-config.js

/**
 * Payment Configuration
 * Centralized configuration for all payment-related settings
 */
export const PAYMENT_CONFIG = {
  // Receiving wallet address (BEP20)
  RECEIVING_ADDRESS: process.env.REACT_APP_RECEIVING_ADDRESS || "0x67A845bC54Eb830b1d724fa183F429E02c1237D1",
  
  // Supported network
  NETWORK: "BEP20",
  
  // Entry fees for tournaments (in USDT)
  ENTRY_FEES: {
    mini: 1,    // 1 USDT for mini tournament
    grand: 10   // 10 USDT for grand tournament
  },
  
  // Booster prices (in USDT)
  BOOSTER_PRICES: {
    booster1: 10,  // 10 USDT
    booster2: 50,  // 50 USDT
    booster3: 100  // 100 USDT
  },
  
  // Get entry fee for a specific tournament type
  getEntryFee: function(tournamentType) {
    return this.ENTRY_FEES[tournamentType] || 0;
  },
  
  // Get booster price
  getBoosterPrice: function(boosterType) {
    return this.BOOSTER_PRICES[boosterType] || 0;
  }
};
