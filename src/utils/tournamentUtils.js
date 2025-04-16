// src/utils/tournamentUtils.js

/**
 * Calculate prize amount based on rank and tournament type
  * @param {number} rank - Player's rank
   * @param {string} tournamentType - 'mini' or 'grand'
    * @returns {Object} Object containing USDT and DINO prize amounts
     */
     export const getPrizeForRank = (rank, tournamentType) => {
       if (!rank) return { usdt: 0, dino: 0 };
         
           let usdt = 0;
             let dino = 0;
               
                 if (tournamentType === 'mini') {
                     if (rank === 1) {
                           usdt = 1000;
                                 dino = 100;
                                     } else if (rank === 2) {
                                           usdt = 900;
                                                 dino = 90;
                                                     } else if (rank === 3) {
                                                           usdt = 800;
                                                                 dino = 80;
                                                                     } else if (rank === 4) {
                                                                           usdt = 700;
                                                                                 dino = 70;
                                                                                     } else if (rank === 5) {
                                                                                           usdt = 600;
                                                                                                 dino = 60;
                                                                                                     } else if (rank >= 6 && rank <= 10) {
                                                                                                           usdt = 400;
                                                                                                                 dino = 40;
                                                                                                                     } else if (rank >= 11 && rank <= 50) {
                                                                                                                           usdt = 100;
                                                                                                                                 dino = 10;
                                                                                                                                     } else if (rank >= 51 && rank <= 100) {
                                                                                                                                           usdt = 10;
                                                                                                                                                 dino = 1;
                                                                                                                                                     }
                                                                                                                                                       } else if (tournamentType === 'grand') {
                                                                                                                                                           if (rank === 1) {
                                                                                                                                                                 usdt = 100000;
                                                                                                                                                                       dino = 10000;
                                                                                                                                                                           } else if (rank === 2) {
                                                                                                                                                                                 usdt = 90000;
                                                                                                                                                                                       dino = 9000;
                                                                                                                                                                                           } else if (rank === 3) {
                                                                                                                                                                                                 usdt = 80000;
                                                                                                                                                                                                       dino = 8000;
                                                                                                                                                                                                           } else if (rank === 4) {
                                                                                                                                                                                                                 usdt = 70000;
                                                                                                                                                                                                                       dino = 7000;
                                                                                                                                                                                                                           } else if (rank === 5) {
                                                                                                                                                                                                                                 usdt = 60000;
                                                                                                                                                                                                                                       dino = 6000;
                                                                                                                                                                                                                                           } else if (rank >= 6 && rank <= 10) {
                                                                                                                                                                                                                                                 usdt = 30000;
                                                                                                                                                                                                                                                       dino = 3000;
                                                                                                                                                                                                                                                           } else if (rank >= 11 && rank <= 50) {
                                                                                                                                                                                                                                                                 usdt = 1000;
                                                                                                                                                                                                                                                                       dino = 100;
                                                                                                                                                                                                                                                                           } else if (rank >= 51 && rank <= 100) {
                                                                                                                                                                                                                                                                                 usdt = 100;
                                                                                                                                                                                                                                                                                       dino = 10;
                                                                                                                                                                                                                                                                                           } else if (rank >= 101 && rank <= 10000) {
                                                                                                                                                                                                                                                                                                 usdt = 1;
                                                                                                                                                                                                                                                                                                       dino = 1;
                                                                                                                                                                                                                                                                                                           }
                                                                                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                                                                   // Handle random user prize (this would typically be handled separately)
                                                                                                                                                                                                                                                                                                                       // Not implemented here as it requires a different mechanism
                                                                                                                                                                                                                                                                                                                         }
                                                                                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                                                                                             return { usdt, dino };
                                                                                                                                                                                                                                                                                                                             };
                                                                                                                                                                                                                                                                                                                             