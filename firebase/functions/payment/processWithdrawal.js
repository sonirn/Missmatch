// firebase/functions/payment/processWithdrawal.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin if not already initialized elsewhere
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Process a withdrawal request (admin only)
 * This function allows administrators to approve or reject withdrawal requests
 */
exports.processWithdrawal = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to process withdrawals'
    );
  }

  // Admin authorization check
  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can process withdrawals'
    );
  }

  // Input validation
  const { withdrawalId, action, transactionHash, notes } = data;
  
  if (!withdrawalId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Withdrawal ID is required'
    );
  }
  
  if (!action || !['approve', 'reject'].includes(action)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Action must be either "approve" or "reject"'
    );
  }
  
  if (action === 'approve' && !transactionHash) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Transaction hash is required for approval'
    );
  }

  try {
    // Get withdrawal document
    const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Withdrawal request not found'
      );
    }

    const withdrawalData = withdrawalDoc.data();

    // Check if withdrawal is already processed
    if (withdrawalData.status !== 'pending') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Withdrawal is already ${withdrawalData.status}`
      );
    }

    // Start a batch transaction
    const batch = db.batch();

    if (action === 'approve') {
      // Update withdrawal status to completed
      batch.update(withdrawalRef, {
        status: 'completed',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        processedBy: context.auth.uid,
        transactionHash,
        notes: notes || ''
      });

      // Create transaction record
      const transactionRef = db.collection('transactions').doc();
      batch.set(transactionRef, {
        userId: withdrawalData.userId,
        type: 'withdrawal',
        amount: -withdrawalData.amount, // Negative for outgoing funds
        currency: withdrawalData.currency || 'USDT',
        description: `Withdrawal of ${withdrawalData.amount} USDT to ${withdrawalData.address.substring(0, 6)}...${withdrawalData.address.substring(withdrawalData.address.length - 4)}`,
        status: 'completed',
        withdrawalId,
        transactionHash,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else if (action === 'reject') {
      // Update withdrawal status to rejected
      batch.update(withdrawalRef, {
        status: 'rejected',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        processedBy: context.auth.uid,
        notes: notes || ''
      });

      // Refund the amount to user's wallet balance
      const userRef = db.collection('users').doc(withdrawalData.userId);
      batch.update(userRef, {
        walletBalance: admin.firestore.FieldValue.increment(withdrawalData.amount)
      });

      // Create transaction record for refund
      const transactionRef = db.collection('transactions').doc();
      batch.set(transactionRef, {
        userId: withdrawalData.userId,
        type: 'withdrawal_refund',
        amount: withdrawalData.amount,
        currency: withdrawalData.currency || 'USDT',
        description: 'Withdrawal request rejected - funds returned to wallet',
        status: 'completed',
        withdrawalId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Commit the batch
    await batch.commit();

    return {
      success: true,
      message: `Withdrawal ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    };
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get pending withdrawals (admin only)
 * This function returns a list of all pending withdrawal requests
 */
exports.getPendingWithdrawals = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to view pending withdrawals'
    );
  }

  // Admin authorization check
  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can view pending withdrawals'
    );
  }

  try {
    // Query for pending withdrawals
    const withdrawalsSnapshot = await db.collection('withdrawals')
      .where('status', '==', 'pending')
      .orderBy('requestedAt', 'asc')
      .get();

    // Format the response
    const pendingWithdrawals = [];
    
    for (const doc of withdrawalsSnapshot.docs) {
      const data = doc.data();
      
      // Get user information
      const userDoc = await db.collection('users').doc(data.userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      
      pendingWithdrawals.push({
        id: doc.id,
        userId: data.userId,
        userEmail: userData?.email || 'Unknown',
        userName: userData?.displayName || 'Unknown',
        amount: data.amount,
        currency: data.currency || 'USDT',
        network: data.network || 'BEP20',
        address: data.address,
        requestedAt: data.requestedAt?.toDate() || null,
        status: data.status
      });
    }

    return {
      success: true,
      count: pendingWithdrawals.length,
      withdrawals: pendingWithdrawals
    };
  } catch (error) {
    console.error('Error fetching pending withdrawals:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get withdrawal history for the current user
 * This function returns the withdrawal history for the authenticated user
 */
exports.getUserWithdrawalHistory = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to view your withdrawal history'
    );
  }

  try {
    // Get limit from data (default to 10)
    const limit = data?.limit || 10;
    
    // Query for user's withdrawals
    const withdrawalsSnapshot = await db.collection('withdrawals')
      .where('userId', '==', context.auth.uid)
      .orderBy('requestedAt', 'desc')
      .limit(limit)
      .get();

    // Format the response
    const withdrawals = withdrawalsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        amount: data.amount,
        currency: data.currency || 'USDT',
        network: data.network || 'BEP20',
        address: data.address,
        requestedAt: data.requestedAt?.toDate() || null,
        processedAt: data.processedAt?.toDate() || null,
        status: data.status,
        transactionHash: data.transactionHash || null
      };
    });

    return {
      success: true,
      count: withdrawals.length,
      withdrawals
    };
  } catch (error) {
    console.error('Error fetching user withdrawal history:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
