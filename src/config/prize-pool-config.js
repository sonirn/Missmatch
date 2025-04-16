// src/config/prize-pool-config.js

// Mini Tournament Prize Pool (Total: 10,500 USDT + 1,050 DINO)
export const miniTournamentPrizes = [
  { rank: 1, usdt: 1000, dino: 100 },
  { rank: 2, usdt: 900, dino: 90 },
  { rank: 3, usdt: 800, dino: 80 },
  { rank: 4, usdt: 700, dino: 70 },
  { rank: 5, usdt: 600, dino: 60 },
  { rank: "6-10", usdt: 400, dino: 40, isRange: true, count: 5 },
  { rank: "11-50", usdt: 100, dino: 10, isRange: true, count: 40 },
  { rank: "51-100", usdt: 10, dino: 1, isRange: true, count: 50 }
];

// Grand Tournament Prize Pool (Total: 605,000 USDT + 60,500 DINO)
export const grandTournamentPrizes = [
  { rank: 1, usdt: 100000, dino: 10000 },
  { rank: 2, usdt: 90000, dino: 9000 },
  { rank: 3, usdt: 80000, dino: 8000 },
  { rank: 4, usdt: 70000, dino: 7000 },
  { rank: 5, usdt: 60000, dino: 6000 },
  { rank: "6-10", usdt: 30000, dino: 3000, isRange: true, count: 5 },
  { rank: "11-50", usdt: 1000, dino: 100, isRange: true, count: 40 },
  { rank: "51-100", usdt: 100, dino: 10, isRange: true, count: 50 },
  { rank: "101-10000", usdt: 1, dino: 1, isRange: true, count: 9900 },
  { rank: "Random", usdt: 100, dino: 10, isSpecial: true }
];

// Calculate total prize pools
export const getTotalPrizePool = (tournamentType) => {
  const prizes = tournamentType === 'mini' ? miniTournamentPrizes : grandTournamentPrizes;
  
  return prizes.reduce((totals, prize) => {
    const count = prize.count || 1;
    return {
      usdt: totals.usdt + (prize.usdt * count),
      dino: totals.dino + (prize.dino * count)
    };
  }, { usdt: 0, dino: 0 });
};
