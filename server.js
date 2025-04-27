/**
 * server.js - Main server file for Dinosaur Game Tournament
 * This server handles API endpoints, authentication, and game functionality
 */

// Import required dependencies
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // Try to load from file first
  serviceAccount = require('./firebase-service-account.json');
} catch (error) {
  // Fall back to environment variables if file not found
  console.log('Firebase service account file not found, using environment variables');
  serviceAccount = {
    "type": process.env.FIREBASE_TYPE,
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": process.env.FIREBASE_AUTH_URI,
    "token_uri": process.env.FIREBASE_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
  };
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

// Initialize Firestore database
const db = admin.firestore();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Apply security middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://www.googleapis.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
    },
  },
}));

// Apply rate limiting to API endpoints to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Apply middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined')); // Logging

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// API Endpoints

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tournament Endpoints

// Get tournament details
app.get('/api/tournaments', async (req, res) => {
  try {
    const tournamentsRef = db.collection('tournaments');
    const snapshot = await tournamentsRef.get();
    
    const tournaments = [];
    snapshot.forEach(doc => {
      tournaments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get tournament leaderboard
app.get('/api/tournaments/:tournamentId/leaderboard', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { limit = 100 } = req.query;
    
    const scoresRef = db.collection('scores')
      .where('tournamentId', '==', tournamentId)
      .orderBy('finalScore', 'desc')
      .limit(parseInt(limit));
    
    const snapshot = await scoresRef.get();
    
    const leaderboard = [];
    snapshot.forEach(doc => {
      leaderboard.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Score submission endpoint
app.post('/api/scores/submit', authenticateUser, async (req, res) => {
  try {
    const { score, tournamentId, gameMetadata } = req.body;
    const userId = req.user.uid;
    
    // Validate score
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Invalid score format' });
    }
    
    // Verify user has paid for tournament entry
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Check which tournament the user has paid for
    const tournamentType = tournamentId === 'mini' ? 'miniTournamentPaid' : 'grandTournamentPaid';
    
    if (!userData[tournamentType]) {
      return res.status(403).json({ error: 'User has not paid for this tournament' });
    }
    
    // Apply booster if active
    let finalScore = score;
    let boosterApplied = false;
    let boosterType = null;
    
    if (userData.activeBooster && tournamentId === 'grand') {
      boosterApplied = true;
      boosterType = userData.activeBooster.type;
      finalScore = score * 2; // Double score with booster
      
      // Update booster usage
      if (userData.activeBooster.type === 'booster1' || userData.activeBooster.type === 'booster2') {
        const remainingUses = userData.activeBooster.remainingUses - 1;
        
        if (remainingUses <= 0) {
          await db.collection('users').doc(userId).update({
            activeBooster: admin.firestore.FieldValue.delete()
          });
        } else {
          await db.collection('users').doc(userId).update({
            'activeBooster.remainingUses': remainingUses
          });
        }
      }
    }
    
    // Record validated score
    const scoreRef = await db.collection('scores').add({
      userId,
      displayName: userData.displayName,
      tournamentId,
      rawScore: score,
      finalScore,
      boosterApplied,
      boosterType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      gameMetadata
    });
    
    // Update user's high score if this is higher
    if (finalScore > (userData.highScore || 0)) {
      await db.collection('users').doc(userId).update({
        highScore: finalScore,
        lastHighScoreTimestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.status(201).json({ 
      success: true, 
      scoreId: scoreRef.id,
      finalScore,
      boosterApplied,
      boosterType
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Payment verification endpoint
app.post('/api/payments/verify', authenticateUser, async (req, res) => {
  try {
    const { txHash, amount, tournamentType } = req.body;
    const userId = req.user.uid;
    
    // Validate input
    if (!txHash || !amount || !tournamentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify the transaction (normally would check blockchain here)
    // For this example, we'll simulate the verification
    
    // Check if payment already processed
    const existingPayment = await db.collection('payments')
      .where('txHash', '==', txHash)
      .get();
    
    if (!existingPayment.empty) {
      return res.status(400).json({ error: 'Transaction already processed' });
    }
    
    // Validate payment amount for tournament type
    const expectedAmount = tournamentType === 'mini' ? 1 : 10;
    if (Number(amount) !== expectedAmount) {
      return res.status(400).json({ 
        error: `Invalid payment amount. Expected ${expectedAmount} USDT for ${tournamentType} tournament`
      });
    }
    
    // Record payment in database
    await db.collection('payments').doc(txHash).set({
      userId,
      txHash,
      amount,
      tournamentType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      verified: true
    });
    
    // Update user's tournament eligibility
    await db.collection('users').doc(userId).update({
      [`${tournamentType}TournamentPaid`]: true
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Booster purchase endpoint
app.post('/api/boosters/purchase', authenticateUser, async (req, res) => {
  try {
    const { boosterType, txHash } = req.body;
    const userId = req.user.uid;
    
    // Validate input
    if (!boosterType || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify user has paid for grand tournament
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData.grandTournamentPaid) {
      return res.status(403).json({ error: 'User has not paid for grand tournament' });
    }
    
    // Define booster based on type
    let booster;
    switch (boosterType) {
      case 'booster1':
        booster = { type: 'booster1', remainingUses: 10 };
        break;
      case 'booster2':
        booster = { type: 'booster2', remainingUses: 100 };
        break;
      case 'booster3':
        booster = { 
          type: 'booster3', 
          expiryDate: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          )
        };
        break;
      default:
        return res.status(400).json({ error: 'Invalid booster type' });
    }
    
    // Update user's active booster
    await db.collection('users').doc(userId).update({
      activeBooster: booster,
      boosterPurchases: admin.firestore.FieldValue.arrayUnion({
        type: boosterType,
        txHash,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })
    });
    
    res.status(200).json({ success: true, booster });
  } catch (error) {
    console.error('Error purchasing booster:', error);
    res.status(500).json({ error: 'Failed to purchase booster' });
  }
});

// Referral system endpoint
app.post('/api/referrals/validate', authenticateUser, async (req, res) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user.uid;
    
    if (!referralCode) {
      return res.status(400).json({ error: 'Missing referral code' });
    }
    
    // Find the referrer
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('referralCode', '==', referralCode).limit(1).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }
    
    const referrerId = snapshot.docs[0].id;
    
    // Prevent self-referrals
    if (referrerId === userId) {
      return res.status(400).json({ error: 'Cannot use your own referral code' });
    }
    
    // Record the referral
    await db.collection('referrals').add({
      referrerId,
      referredId: userId,
      status: 'pending', // Will be updated to 'valid' after payment
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update user document
    await db.collection('users').doc(userId).update({
      referredBy: referrerId
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error validating referral:', error);
    res.status(500).json({ error: 'Failed to validate referral' });
  }
});

// User profile endpoint
app.get('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Remove sensitive data
    delete userData.paymentInfo;
    
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Serve the main app on all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Dinosaur Game Tournament server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // Export for testing purposes
