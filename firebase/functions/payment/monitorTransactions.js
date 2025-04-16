// firebase/functions/payment/monitorTransactions.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized elsewhere
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Monitor new transactions
 * This function logs new transactions and can be extended for additional monitoring
 */
exports.monitorTransactions = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snapshot, context) => {
    const transactionId = context.params.transactionId;
    const transaction = snapshot.data();

    try {
      console.log(`New transaction created [${transactionId}]:`, {
        userId: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        timestamp: transaction.createdAt?.toDate() || 'Unknown'
      });

      // You can add additional monitoring logic here
      // For example, sending notifications or alerts for large transactions

      // For withdrawal transactions, log additional details
      if (transaction.type === 'withdrawal' && transaction.status === 'completed') {
        console.log(`Withdrawal transaction completed [${transactionId}]:`, {
          withdrawalId: transaction.withdrawalId,
          transactionHash: transaction.transactionHash,
          amount: Math.abs(transaction.amount)
        });
      }

      return null;
    } catch (error) {
      console.error(`Error monitoring transaction ${transactionId}:`, error);
      return null;
    }
  });

/**
 * This function would typically verify transactions on the blockchain
 * Since withdrawals are processed manually, this is a placeholder for future implementation
 */
exports.verifyTransactionHash = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to verify transactions'
    );
  }

  // Admin authorization check
  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can verify transactions'
    );
  }

  const { transactionHash } = data;
  
  if (!transactionHash) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Transaction hash is required'
    );
  }

  try {
    // This is a placeholder for actual blockchain verification
    // In a real implementation, you would query the blockchain to verify the transaction
    
    console.log(`Manual verification requested for transaction hash: ${transactionHash}`);
    
    return {
      success: true,
      message: 'Transaction hash format is valid. Manual verification required.',
      verified: false,
      note: 'This is a placeholder. Actual blockchain verification is not implemented.'
    };
  } catch (error) {
    console.error('Error verifying transaction hash:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
