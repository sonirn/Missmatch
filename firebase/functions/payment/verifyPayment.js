// firebase/functions/payment/verifyPayment.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Web3 = require('web3');

// Get configuration from Firebase environment or use default
const RECEIVING_ADDRESS = functions.config().payment?.address || "0x67A845bC54Eb830b1d724fa183F429E02c1237D1";

/**
 * Verify a payment transaction on the blockchain
 * Validates the transaction hash, recipient address, amount, and confirmation status
 */
exports.verifyPayment = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { userId, tournamentType, boosterType, txHash, amount } = data;
  
  // Ensure userId matches authenticated user
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'User ID does not match authenticated user');
  }
  
  // Ensure txHash is provided
  if (!txHash) {
    return { success: false, message: "Transaction hash is required" };
  }
  
  // Connect to BSC network
  const web3 = new Web3('https://bsc-dataseed.binance.org/');
  
  try {
    // Check if transaction already processed to prevent double registration
    const db = admin.firestore();
    const paymentsRef = db.collection('payments');
    const existingPayments = await paymentsRef
      .where('txHash', '==', txHash)
      .where('status', '==', 'verified')
      .get();
    
    if (!existingPayments.empty) {
      return { success: false, message: "This transaction has already been processed" };
    }
    
    // Get transaction details
    const tx = await web3.eth.getTransaction(txHash);
    
    if (!tx) {
      return { success: false, message: "Transaction not found on the blockchain" };
    }
    
    // Verify transaction recipient
    if (tx.to.toLowerCase() !== RECEIVING_ADDRESS.toLowerCase()) {
      return { success: false, message: "Payment was sent to an incorrect address" };
    }
    
    // Determine required amount based on tournament type or booster type
    let requiredAmount;
    if (tournamentType) {
      requiredAmount = tournamentType === "mini" ? 
        web3.utils.toWei('1', 'ether') : 
        web3.utils.toWei('10', 'ether');
    } else if (boosterType) {
      if (boosterType === "booster1") {
        requiredAmount = web3.utils.toWei('10', 'ether');
      } else if (boosterType === "booster2") {
        requiredAmount = web3.utils.toWei('50', 'ether');
      } else if (boosterType === "booster3") {
        requiredAmount = web3.utils.toWei('100', 'ether');
      } else {
        return { success: false, message: "Invalid booster type" };
      }
    } else if (amount) {
      // If specific amount is provided, use that
      requiredAmount = web3.utils.toWei(amount.toString(), 'ether');
    } else {
      return { success: false, message: "Unable to determine required payment amount" };
    }
    
    // Verify amount is sufficient
    if (web3.utils.toBN(tx.value).lt(web3.utils.toBN(requiredAmount))) {
      return { 
        success: false, 
        message: "Insufficient payment amount. Please send the correct amount." 
      };
    }
    
    // Check if transaction is confirmed
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    if (!receipt) {
      return { success: false, message: "Transaction is still pending. Please try again later." };
    }
    
    if (!receipt.status) {
      return { success: false, message: "Transaction failed on the blockchain" };
    }
    
    // All verifications passed
    return { 
      success: true, 
      message: "Payment verified successfully",
      transaction: {
        hash: txHash,
        from: tx.from,
        to: tx.to,
        value: web3.utils.fromWei(tx.value, 'ether'),
        blockNumber: tx.blockNumber
      }
    };
  } catch (error) {
    console.error("Error verifying payment:", error);
    return { success: false, message: "Failed to verify payment. Please try again later." };
  }
});
