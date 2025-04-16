// firebase/functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK
admin.initializeApp();

// Create Express app for API endpoints
const app = express();
app.use(cors);
app.use(express.json());

// Import function modules
const processWithdrawal = require('./payment/processWithdrawal');
const monitorTransactions = require('./payment/monitorTransactions');
const startTournament = require('./tournament/startTournament');
const endTournament = require('./tournament/endTournament');
const calculateRankings = require('./tournament/calculateRankings');
const distributePrizes = require('./tournament/distributePrizes');
const processReferrals = require('./referrals/processReferrals');
const validateReferrals = require('./referrals/validateReferrals');
const notifications = require('./notifications/sendNotifications');

// Response formatter
const formatResponse = (success, message, data = null) => ({ 
  success, message, data, timestamp: Date.now() 
});

// Error handler
const handleError = (res, error) => {
  console.error('Error:', error);
  return res.status(500).json(formatResponse(false, error.message || 'Internal server error'));
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(formatResponse(false, 'Unauthorized - No token provided'));
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json(formatResponse(false, 'Unauthorized - Invalid token'));
  }
};

// Admin verification middleware
const verifyAdmin = async (req, res, next) => {
  try {
    const adminDoc = await admin.firestore().collection('admins').doc(req.user.uid).get();
    if (!adminDoc.exists || adminDoc.data().admin !== true) {
      return res.status(403).json(formatResponse(false, 'Forbidden - Admin access required'));
    }
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(403).json(formatResponse(false, 'Forbidden - Admin verification failed'));
  }
};

// ===== PAYMENT ROUTES =====

// Get pending withdrawals (admin only)
app.get('/pendingWithdrawals', authenticate, verifyAdmin, async (req, res) => {
  try {
    const result = await processWithdrawal.getPendingWithdrawals();
    return res.status(200).json(formatResponse(true, 'Pending withdrawals retrieved', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Process a withdrawal (admin only)
app.post('/processWithdrawal', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { withdrawalId, action, transactionHash, notes } = req.body;
    
    const result = await processWithdrawal.processWithdrawal(
      withdrawalId, action, req.user.uid, transactionHash, notes
    );
    
    // Send notification to user
    if (result.success) {
      try {
        const withdrawalDoc = await admin.firestore().collection('withdrawals').doc(withdrawalId).get();
        if (withdrawalDoc.exists) {
          const withdrawalData = withdrawalDoc.data();
          await notifications.sendWithdrawalStatusNotification(
            withdrawalData.userId,
            withdrawalId,
            action === 'approve' ? 'completed' : 'rejected',
            withdrawalData.amount,
            notes
          );
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }
    
    return res.status(200).json(formatResponse(true, result.message, result.data));
  } catch (error) {
    return handleError(res, error);
  }
});

// User withdrawal history
app.get('/userWithdrawalHistory', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const result = await processWithdrawal.getUserWithdrawalHistory(req.user.uid, limit);
    return res.status(200).json(formatResponse(true, 'Withdrawal history retrieved', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// ===== TOURNAMENT ROUTES =====

// Initialize tournament (admin only)
app.post('/initializeTournament', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { tournamentType, config } = req.body;
    const result = await startTournament.initializeTournament(tournamentType, config);
    return res.status(200).json(formatResponse(true, 'Tournament initialized', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Start tournament (admin only)
app.post('/startTournament', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { tournamentType } = req.body;
    const result = await startTournament.startTournament(tournamentType);
    
    // Send notification
    try {
      await notifications.sendTournamentStartNotification(tournamentType);
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }
    
    return res.status(200).json(formatResponse(true, 'Tournament started', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// End tournament (admin only)
app.post('/endTournament', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { tournamentType, distributePrizesImmediately } = req.body;
    const result = await endTournament.endTournament(tournamentType, distributePrizesImmediately);
    
    // Send notification
    try {
      await notifications.sendTournamentEndNotification(tournamentType);
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }
    
    return res.status(200).json(formatResponse(true, 'Tournament ended', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Tournament status
app.get('/tournamentStatus/:tournamentType', async (req, res) => {
  try {
    const result = await startTournament.getTournamentStatus(req.params.tournamentType);
    return res.status(200).json(formatResponse(true, 'Tournament status retrieved', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Tournament rankings
app.get('/tournamentRankings/:tournamentType', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const result = await calculateRankings.getTournamentRankings(req.params.tournamentType, limit);
    return res.status(200).json(formatResponse(true, 'Tournament rankings retrieved', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// User rank
app.get('/userRank/:tournamentType', authenticate, async (req, res) => {
  try {
    const result = await calculateRankings.getUserRank(req.user.uid, req.params.tournamentType);
    return res.status(200).json(formatResponse(true, 'User rank retrieved', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Distribute prizes (admin only)
app.post('/distributePrizes', authenticate, verifyAdmin, async (req, res) => {
  try {
    const result = await distributePrizes.distributePrizes(req.body.tournamentType);
    return res.status(200).json(formatResponse(true, 'Prizes distributed', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// ===== REFERRAL ROUTES =====

// Generate referral code
app.post('/generateReferralCode', authenticate, async (req, res) => {
  try {
    const result = await validateReferrals.generateReferralCode(req.user.uid);
    return res.status(200).json(formatResponse(true, 'Referral code generated', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Apply referral code
app.post('/applyReferralCode', authenticate, async (req, res) => {
  try {
    const result = await validateReferrals.applyReferralCode(req.body.code, req.user.uid);
    return res.status(200).json(formatResponse(true, 'Referral code applied', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Referral stats
app.get('/referralStats', authenticate, async (req, res) => {
  try {
    const result = await processReferrals.getReferralStats(req.user.uid);
    return res.status(200).json(formatResponse(true, 'Referral stats retrieved', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Referral list
app.get('/referralList', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const result = await processReferrals.getReferralList(req.user.uid, limit);
    return res.status(200).json(formatResponse(true, 'Referral list retrieved', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// ===== NOTIFICATION ROUTES =====

// User notifications
app.get('/userNotifications', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const unreadOnly = req.query.unreadOnly === 'true';
    const result = await notifications.getUserNotifications(req.user.uid, limit, unreadOnly);
    return res.status(200).json(formatResponse(true, 'User notifications retrieved', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Mark notification as read
app.post('/markNotificationRead', authenticate, async (req, res) => {
  try {
    const result = await notifications.markNotificationAsRead(req.user.uid, req.body.notificationId);
    return res.status(200).json(formatResponse(true, 'Notification marked as read', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Register FCM token
app.post('/registerFCMToken', authenticate, async (req, res) => {
  try {
    const result = await notifications.registerFCMToken(req.user.uid, req.body.token);
    return res.status(200).json(formatResponse(true, 'FCM token registered', result));
  } catch (error) {
    return handleError(res, error);
  }
});

// Test endpoint
app.get('/hello', (req, res) => {
  return res.status(200).json(formatResponse(true, 'Firebase Functions are working!'));
});

// Export the Express API
exports.api = functions.https.onRequest(app);

// ===== CALLABLE FUNCTIONS =====

// Process Withdrawal Callable
exports.processWithdrawalCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Admin check
  const adminDoc = await admin.firestore().collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    const { withdrawalId, action, transactionHash, notes } = data;
    const result = await processWithdrawal.processWithdrawal(
      withdrawalId, action, context.auth.uid, transactionHash, notes
    );
    
    // Send notification
    if (result.success) {
      try {
        const withdrawalDoc = await admin.firestore().collection('withdrawals').doc(withdrawalId).get();
        if (withdrawalDoc.exists) {
          await notifications.sendWithdrawalStatusNotification(
            withdrawalDoc.data().userId,
            withdrawalId,
            action === 'approve' ? 'completed' : 'rejected',
            withdrawalDoc.data().amount,
            notes
          );
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Function error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Internal error');
  }
});

// Tournament Rankings Callable
exports.getTournamentRankingsCallable = functions.https.onCall(async (data, context) => {
  try {
    const { tournamentType, limit } = data;
    return await calculateRankings.getTournamentRankings(tournamentType, limit || 100);
  } catch (error) {
    console.error('Function error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Internal error');
  }
});

// User Rank Callable
exports.getUserRankCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  
  try {
    return await calculateRankings.getUserRank(context.auth.uid, data.tournamentType);
  } catch (error) {
    console.error('Function error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Internal error');
  }
});

// Referral Code Callable
exports.generateReferralCodeCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  
  try {
    return await validateReferrals.generateReferralCode(context.auth.uid);
  } catch (error) {
    console.error('Function error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Internal error');
  }
});

// ===== SCHEDULED FUNCTIONS =====

// Auto-start tournaments
exports.scheduledTournamentStarter = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async (context) => {
    try {
      return await startTournament.scheduledTournamentStarter();
    } catch (error) {
      console.error('Scheduled function error:', error);
      return null;
    }
  });

// Auto-end tournaments
exports.scheduledTournamentEnder = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async (context) => {
    try {
      return await endTournament.scheduledTournamentEnder();
    } catch (error) {
      console.error('Scheduled function error:', error);
      return null;
    }
  });

// ===== FIRESTORE TRIGGERS =====

// Monitor transactions
exports.monitorTransactions = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate((snapshot, context) => {
    return monitorTransactions.monitorTransactions(snapshot, context);
  });

// Process referral when user pays for tournament
exports.processReferralOnPayment = functions.firestore
  .document('payments/{paymentId}')
  .onCreate(async (snapshot, context) => {
    try {
      const payment = snapshot.data();
      if (payment.type === 'tournament_entry' && payment.status === 'completed') {
        const result = await processReferrals.processReferralReward(
          payment.userId, 
          payment.tournamentType
        );
        
        // Send notification if referral was processed
        if (result.processed && result.referrerId) {
          await notifications.sendReferralRewardNotification(
            result.referrerId,
            payment.userId,
            result.rewardAmount
          );
        }
      }
      return null;
    } catch (error) {
      console.error('Function error:', error);
      return null;
    }
  });
