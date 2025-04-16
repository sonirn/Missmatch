// src/config/tournament-config.js

// Tournament dates - calculate based on current date
const calculateTournamentDates = () => {
  const now = new Date();
  const startDate = new Date(now);
  
  // If we're past noon, start tomorrow, otherwise start today
  if (now.getHours() >= 12) {
    startDate.setDate(startDate.getDate() + 1);
  }
  
  // Set start time to midnight
  startDate.setHours(0, 0, 0, 0);
  
  // End date is 15 days after start date
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 15);
  
  return { startDate, endDate };
};

const { startDate, endDate } = calculateTournamentDates();

// Tournament Configuration
export const TOURNAMENTS = {
  MINI: {
    id: "mini-tournament",
    name: "Mini Tournament",
    description: "15-day tournament with a prize pool of 10,500 USDT + 1,050 DINO!",
    type: "mini",
    startDate: startDate,
    endDate: endDate,
    entryFee: 1, // 1 USDT
    totalPrizePool: {
      usdt: 10500,
      dino: 1050
    },
    rules: [
      "Entry fee: 1 USDT (BEP20)",
      "Tournament duration: 15 days",
      "Ranking is based on your highest score",
      "Prizes will be distributed within 48 hours after tournament ends"
    ],
    prizes: [
      { rank: 1, prize: { usdt: 1000, dino: 100 }, description: "Rank 1" },
      { rank: 2, prize: { usdt: 900, dino: 90 }, description: "Rank 2" },
      { rank: 3, prize: { usdt: 800, dino: 80 }, description: "Rank 3" },
      { rank: 4, prize: { usdt: 700, dino: 70 }, description: "Rank 4" },
      { rank: 5, prize: { usdt: 600, dino: 60 }, description: "Rank 5" },
      { rank: "6-10", prize: { usdt: 400, dino: 40 }, description: "Rank 6 to 10", count: 5 },
      { rank: "11-50", prize: { usdt: 100, dino: 10 }, description: "Rank 11 to 50", count: 40 },
      { rank: "51-100", prize: { usdt: 10, dino: 1 }, description: "Rank 51 to 100", count: 50 }
    ]
  },
  
  GRAND: {
    id: "grand-tournament",
    name: "Grand Tournament",
    description: "15-day tournament with a massive prize pool of 605,000 USDT + 60,500 DINO!",
    type: "grand",
    startDate: startDate,
    endDate: endDate,
    entryFee: 10, // 10 USDT
    totalPrizePool: {
      usdt: 605000,
      dino: 60500
    },
    rules: [
      "Entry fee: 10 USDT (BEP20)",
      "Tournament duration: 15 days",
      "Ranking is based on your highest score",
      "Boosters are available for purchase",
      "Prizes will be distributed within 48 hours after tournament ends"
    ],
    prizes: [
      { rank: 1, prize: { usdt: 100000, dino: 10000 }, description: "Rank 1" },
      { rank: 2, prize: { usdt: 90000, dino: 9000 }, description: "Rank 2" },
      { rank: 3, prize: { usdt: 80000, dino: 8000 }, description: "Rank 3" },
      { rank: 4, prize: { usdt: 70000, dino: 7000 }, description: "Rank 4" },
      { rank: 5, prize: { usdt: 60000, dino: 6000 }, description: "Rank 5" },
      { rank: "6-10", prize: { usdt: 30000, dino: 3000 }, description: "Rank 6 to 10", count: 5 },
      { rank: "11-50", prize: { usdt: 1000, dino: 100 }, description: "Rank 11 to 50", count: 40 },
      { rank: "51-100", prize: { usdt: 100, dino: 10 }, description: "Rank 51 to 100", count: 50 },
      { rank: "101-10000", prize: { usdt: 1, dino: 1 }, description: "Rank 101 to 10000", count: 9900 },
      { rank: "random", prize: { usdt: 100, dino: 10 }, description: "Random Lucky Winner", count: 1 }
    ],
    boosters: [
      {
        id: 1,
        name: "Booster 1",
        description: "Double your score for the next 10 games",
        price: 10, // 10 USDT
        effect: "2x score",
        duration: "10 games",
        multiplier: 2,
        games: 10
      },
      {
        id: 2,
        name: "Booster 2",
        description: "Double your score for the next 100 games",
        price: 50, // 50 USDT
        effect: "2x score",
        duration: "100 games",
        multiplier: 2,
        games: 100
      },
      {
        id: 3,
        name: "Booster 3",
        description: "Double your score for all games until the tournament ends",
        price: 100, // 100 USDT
        effect: "2x score",
        duration: "Until tournament end",
        multiplier: 2,
        games: null // Unlimited
      }
    ]
  }
};

// Sponsors Configuration
export const SPONSORS = [
  {
    id: "kucoin",
    name: "KuCoin",
    logo: "/assets/images/sponsors/kucoin.png",
    website: "https://www.kucoin.com/"
  },
  {
    id: "pancakeswap",
    name: "PancakeSwap",
    logo: "/assets/images/sponsors/pancakeswap.png",
    website: "https://pancakeswap.finance/"
  }
];

// Referral System Configuration
export const REFERRAL_SYSTEM = {
  rewardPerReferral: 1, // 1 USDT
  minimumPayout: 10, // 10 USDT
  rules: [
    "Earn 1 USDT for each valid referral",
    "A referral is valid when the referred user pays for any tournament",
    "Referral balance will be transferred automatically after each tournament ends",
    "Minimum 10 USDT required to transfer to main balance",
    "If referral balance is less than 10 USDT, it will be reset to zero after tournament"
  ]
};

// Dino Coin Information
export const DINO_COIN = {
  name: "Dino Coin",
  symbol: "DINO",
  description: "Dino Coin is the native cryptocurrency for the Dino Tournament platform. Listing coming soon!",
  logo: "/assets/images/dino-coin.png",
  totalSupply: "100,000,000 DINO",
  status: "Pre-listing"
};

// Calculate total prizes for verification
const calculateTotalPrizes = () => {
  let miniTotalUSDT = 0;
  let miniTotalDINO = 0;
  let grandTotalUSDT = 0;
  let grandTotalDINO = 0;
  
  // Calculate Mini Tournament totals
  TOURNAMENTS.MINI.prizes.forEach(prize => {
    const count = prize.count || 1;
    miniTotalUSDT += prize.prize.usdt * count;
    miniTotalDINO += prize.prize.dino * count;
  });
  
  // Calculate Grand Tournament totals
  TOURNAMENTS.GRAND.prizes.forEach(prize => {
    const count = prize.count || 1;
    grandTotalUSDT += prize.prize.usdt * count;
    grandTotalDINO += prize.prize.dino * count;
  });
  
  return {
    mini: { usdt: miniTotalUSDT, dino: miniTotalDINO },
    grand: { usdt: grandTotalUSDT, dino: grandTotalDINO }
  };
};

// Verify prize pool totals match the specified amounts
const verifyPrizePools = () => {
  const calculatedTotals = calculateTotalPrizes();
  
  // Check if calculated totals match the specified prize pools
  const miniMatch = 
    calculatedTotals.mini.usdt === TOURNAMENTS.MINI.totalPrizePool.usdt && 
    calculatedTotals.mini.dino === TOURNAMENTS.MINI.totalPrizePool.dino;
  
  const grandMatch = 
    calculatedTotals.grand.usdt === TOURNAMENTS.GRAND.totalPrizePool.usdt && 
    calculatedTotals.grand.dino === TOURNAMENTS.GRAND.totalPrizePool.dino;
  
  if (!miniMatch) {
    console.warn("Mini Tournament prize pool mismatch:", {
      specified: TOURNAMENTS.MINI.totalPrizePool,
      calculated: calculatedTotals.mini
    });
  }
  
  if (!grandMatch) {
    console.warn("Grand Tournament prize pool mismatch:", {
      specified: TOURNAMENTS.GRAND.totalPrizePool,
      calculated: calculatedTotals.grand
    });
  }
  
  return { miniMatch, grandMatch };
};

// Perform verification in development mode
if (process.env.NODE_ENV === 'development') {
  verifyPrizePools();
}

// Export all tournament configurations
export default {
  TOURNAMENTS,
  SPONSORS,
  REFERRAL_SYSTEM,
  DINO_COIN,
  calculateTournamentDates
};
