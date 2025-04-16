// firebase/functions/notifications/sendNotifications.js
const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Initialize Firebase Admin if not already initialized elsewhere
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Notification types for the application
 */
const NOTIFICATION_TYPES = {
  TOURNAMENT_START: 'tournament_start',
  TOURNAMENT_END: 'tournament_end',
  PRIZE_DISTRIBUTION: 'prize_distribution',
  WITHDRAWAL_STATUS: 'withdrawal_status',
  REFERRAL_REWARD: 'referral_reward',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  BOOSTER_EXPIRED: 'booster_expired',
  HIGH_SCORE_ACHIEVED: 'high_score_achieved',
  RANK_CHANGED: 'rank_changed'
};

/**
 * Send a notification to a specific user
 * @param {string} userId - User ID to send notification to
 * @param {string} type - Notification type from NOTIFICATION_TYPES
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data for the notification
 * @returns {Promise<Object>} Notification result
 */
exports.sendUserNotification = async (userId, type, title, message, data = {}) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!type || !Object.values(NOTIFICATION_TYPES).includes(type)) {
      throw new Error('Invalid notification type');
    }
    
    if (!title || !message) {
      throw new Error('Title and message are required');
    }

    console.log(`Sending ${type} notification to user ${userId}`);

    // Create notification document
    const notificationRef = db.collection('notifications').doc();
    const notificationData = {
      userId: userId,
      type: type,
      title: title,
      message: message,
      data: data,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await notificationRef.set(notificationData);
    
    // Try to send FCM push notification if user has a token
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        if (userData.fcmTokens && Object.keys(userData.fcmTokens).length > 0) {
          // User has FCM tokens, send push notification
          const tokens = Object.keys(userData.fcmTokens);
          
          const fcmMessage = {
            notification: {
              title: title,
              body: message
            },
            data: {
              type: type,
              ...data
            },
            tokens: tokens
          };
          
          // Send the message
          const fcmResponse = await admin.messaging().sendMulticast(fcmMessage);
          
          console.log(`FCM notification sent to ${fcmResponse.successCount} devices for user ${userId}`);
          
          // Handle failed tokens
          if (fcmResponse.failureCount > 0) {
            const failedTokens = [];
            fcmResponse.responses.forEach((resp, idx) => {
              if (!resp.success) {
                failedTokens.push(tokens[idx]);
              }
            });
            
            // Remove failed tokens
            if (failedTokens.length > 0) {
              const userRef = db.collection('users').doc(userId);
              const batch = db.batch();
              
              failedTokens.forEach(token => {
                batch.update(userRef, {
                  [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete()
                });
              });
              
              await batch.commit();
              console.log(`Removed ${failedTokens.length} invalid FCM tokens for user ${userId}`);
            }
          }
        }
      }
    } catch (fcmError) {
      console.error(`Error sending FCM notification to user ${userId}:`, fcmError);
      // Continue even if FCM fails - we've already stored the notification in Firestore
    }
    
    return {
      success: true,
      notificationId: notificationRef.id,
      userId: userId,
      type: type
    };
  } catch (error) {
    console.error('Error sending user notification:', error);
    throw error;
  }
};

/**
 * Send notifications to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {string} type - Notification type from NOTIFICATION_TYPES
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data for the notification
 * @returns {Promise<Object>} Notification result
 */
exports.sendMultiUserNotification = async (userIds, type, title, message, data = {}) => {
  try {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('Valid array of user IDs is required');
    }
    
    if (!type || !Object.values(NOTIFICATION_TYPES).includes(type)) {
      throw new Error('Invalid notification type');
    }
    
    if (!title || !message) {
      throw new Error('Title and message are required');
    }

    console.log(`Sending ${type} notification to ${userIds.length} users`);

    // Use batched writes for efficiency
    const batch = db.batch();
    const notificationIds = [];
    
    // Create notification documents for each user
    for (const userId of userIds) {
      const notificationRef = db.collection('notifications').doc();
      notificationIds.push(notificationRef.id);
      
      batch.set(notificationRef, {
        userId: userId,
        type: type,
        title: title,
        message: message,
        data: data,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Commit the batch
    await batch.commit();
    
    // Try to send FCM push notifications
    try {
      // Get FCM tokens for all users
      const usersSnapshot = await db.collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', userIds)
        .get();
      
      const tokensByUser = {};
      const allTokens = [];
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmTokens && Object.keys(userData.fcmTokens).length > 0) {
          const userTokens = Object.keys(userData.fcmTokens);
          tokensByUser[doc.id] = userTokens;
          allTokens.push(...userTokens);
        }
      });
      
      if (allTokens.length > 0) {
        // Send multicast message (up to 500 tokens per call)
        const fcmMessage = {
          notification: {
            title: title,
            body: message
          },
          data: {
            type: type,
            ...data
          }
        };
        
        // Split tokens into chunks of 500 (FCM limit)
        const tokenChunks = [];
        for (let i = 0; i < allTokens.length; i += 500) {
          tokenChunks.push(allTokens.slice(i, i + 500));
        }
        
        // Send to each chunk
        for (const tokens of tokenChunks) {
          const fcmResponse = await admin.messaging().sendMulticast({
            ...fcmMessage,
            tokens: tokens
          });
          
          console.log(`FCM notification sent to ${fcmResponse.successCount} devices`);
          
          // Handle failed tokens (could be optimized for large numbers of users)
          if (fcmResponse.failureCount > 0) {
            const failedTokens = [];
            fcmResponse.responses.forEach((resp, idx) => {
              if (!resp.success) {
                failedTokens.push(tokens[idx]);
              }
            });
            
            // Remove failed tokens (would need to map back to users)
            if (failedTokens.length > 0) {
              console.log(`${failedTokens.length} FCM tokens failed. Token cleanup skipped for bulk notifications.`);
            }
          }
        }
      }
    } catch (fcmError) {
      console.error('Error sending FCM notifications:', fcmError);
      // Continue even if FCM fails - we've already stored the notifications in Firestore
    }
    
    return {
      success: true,
      notificationIds: notificationIds,
      userCount: userIds.length
    };
  } catch (error) {
    console.error('Error sending multi-user notification:', error);
    throw error;
  }
};

/**
 * Send a notification to all users
 * @param {string} type - Notification type from NOTIFICATION_TYPES
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data for the notification
 * @returns {Promise<Object>} Notification result
 */
exports.sendGlobalNotification = async (type, title, message, data = {}) => {
  try {
    if (!type || !Object.values(NOTIFICATION_TYPES).includes(type)) {
      throw new Error('Invalid notification type');
    }
    
    if (!title || !message) {
      throw new Error('Title and message are required');
    }

    console.log(`Sending global ${type} notification`);

    // Create a global notification record
    const globalNotificationRef = db.collection('globalNotifications').doc();
    await globalNotificationRef.set({
      type: type,
      title: title,
      message: message,
      data: data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Send FCM topic message
    try {
      const fcmMessage = {
        notification: {
          title: title,
          body: message
        },
        data: {
          type: type,
          ...data
        },
        topic: 'all_users' // Assuming users are subscribed to this topic
      };
      
      await admin.messaging().send(fcmMessage);
      console.log('FCM topic notification sent successfully');
    } catch (fcmError) {
      console.error('Error sending FCM topic notification:', fcmError);
      // Continue even if FCM fails - we've already stored the global notification
    }
    
    return {
      success: true,
      notificationId: globalNotificationRef.id,
      type: type
    };
  } catch (error) {
    console.error('Error sending global notification:', error);
    throw error;
  }
};

/**
 * Send tournament start notification to all eligible users
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} Notification result
 */
exports.sendTournamentStartNotification = async (tournamentType) => {
  try {
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error('Invalid tournament type');
    }

    // Get tournament settings
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    
    if (!settingsDoc.exists) {
      throw new Error('Tournament settings not found');
    }
    
    const settings = settingsDoc.data();
    const tournamentName = tournamentType === 'mini' ? 'Mini Tournament' : 'Grand Tournament';
    const prizePool = settings[`${tournamentType}PrizePoolUsdt`] || 0;
    
    // Create notification content
    const title = `${tournamentName} Has Started!`;
    const message = `The ${tournamentName} has officially begun! Compete for a share of the ${prizePool} USDT prize pool. Good luck!`;
    const data = {
      tournamentType: tournamentType,
      prizePool: prizePool
    };
    
    // Send as global notification
    return await exports.sendGlobalNotification(
      NOTIFICATION_TYPES.TOURNAMENT_START,
      title,
      message,
      data
    );
  } catch (error) {
    console.error(`Error sending tournament start notification for ${tournamentType}:`, error);
    throw error;
  }
};

/**
 * Send tournament end notification to all participants
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} Notification result
 */
exports.sendTournamentEndNotification = async (tournamentType) => {
  try {
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error('Invalid tournament type');
    }

    // Get tournament settings
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    
    if (!settingsDoc.exists) {
      throw new Error('Tournament settings not found');
    }
    
    const settings = settingsDoc.data();
    const tournamentName = tournamentType === 'mini' ? 'Mini Tournament' : 'Grand Tournament';
    
    // Create notification content
    const title = `${tournamentName} Has Ended`;
    const message = `The ${tournamentName} has officially ended. Prize distribution will begin shortly. Thank you for participating!`;
    const data = {
      tournamentType: tournamentType
    };
    
    // Send as global notification
    return await exports.sendGlobalNotification(
      NOTIFICATION_TYPES.TOURNAMENT_END,
      title,
      message,
      data
    );
  } catch (error) {
    console.error(`Error sending tournament end notification for ${tournamentType}:`, error);
    throw error;
  }
};

/**
 * Send prize distribution notifications to winners
 * @param {string} tournamentType - 'mini' or 'grand'
 * @returns {Promise<Object>} Notification result
 */
exports.sendPrizeDistributionNotifications = async (tournamentType) => {
  try {
    if (!['mini', 'grand'].includes(tournamentType)) {
      throw new Error('Invalid tournament type');
    }

    // Get prize distribution data
    const distributionDoc = await db.collection('prizeDistributions').doc(tournamentType).get();
    
    if (!distributionDoc.exists) {
      throw new Error(`Prize distribution for ${tournamentType} tournament not found`);
    }
    
    const distributionData = distributionDoc.data();
    const distributions = distributionData.distributions || [];
    const tournamentName = tournamentType === 'mini' ? 'Mini Tournament' : 'Grand Tournament';
    
    // Send notifications to all winners
    const notificationPromises = [];
    
    for (const winner of distributions) {
      const userId = winner.userId;
      const rank = winner.rank;
      const prize = winner.prize;
      const prizeType = winner.prizeType || 'rank';
      
      let title, message;
      
      if (prizeType === 'random') {
        title = `You Won a Random Prize in the ${tournamentName}!`;
        message = `Congratulations! You've won a random prize of ${prize.usdt} USDT and ${prize.dino} DINO in the ${tournamentName}!`;
      } else {
        title = `You Won a Prize in the ${tournamentName}!`;
        message = `Congratulations on achieving Rank ${rank}! You've won ${prize.usdt} USDT and ${prize.dino} DINO in the ${tournamentName}.`;
      }
      
      const data = {
        tournamentType: tournamentType,
        rank: rank,
        prize: prize,
        prizeType: prizeType
      };
      
      notificationPromises.push(
        exports.sendUserNotification(
          userId,
          NOTIFICATION_TYPES.PRIZE_DISTRIBUTION,
          title,
          message,
          data
        )
      );
    }
    
    // Wait for all notifications to be sent
    await Promise.all(notificationPromises);
    
    // Send global notification about prize distribution
    await exports.sendGlobalNotification(
      NOTIFICATION_TYPES.PRIZE_DISTRIBUTION,
      `${tournamentName} Prizes Distributed`,
      `Prizes for the ${tournamentName} have been distributed to all winners. Check your wallet balance!`,
      { tournamentType: tournamentType }
    );
    
    return {
      success: true,
      notificationsSent: notificationPromises.length
    };
  } catch (error) {
    console.error(`Error sending prize distribution notifications for ${tournamentType}:`, error);
    throw error;
  }
};

/**
 * Send withdrawal status notification
 * @param {string} userId - User ID
 * @param {string} withdrawalId - Withdrawal ID
 * @param {string} status - Withdrawal status ('completed' or 'rejected')
 * @param {string} notes - Optional notes about the withdrawal
 * @returns {Promise<Object>} Notification result
 */
exports.sendWithdrawalStatusNotification = async (userId, withdrawalId, status, notes = '') => {
  try {
    if (!userId || !withdrawalId || !status) {
      throw new Error('User ID, withdrawal ID, and status are required');
    }
    
    if (!['completed', 'rejected'].includes(status)) {
      throw new Error('Invalid withdrawal status');
    }

    // Get withdrawal details
    const withdrawalDoc = await db.collection('withdrawals').doc(withdrawalId).get();
    
    if (!withdrawalDoc.exists) {
      throw new Error(`Withdrawal ${withdrawalId} not found`);
    }
    
    const withdrawalData = withdrawalDoc.data();
    const amount = withdrawalData.amount;
    const currency = withdrawalData.currency || 'USDT';
    
    // Create notification content
    let title, message;
    
    if (status === 'completed') {
      title = 'Withdrawal Completed';
      message = `Your withdrawal of ${amount} ${currency} has been processed successfully.`;
      if (notes) {
        message += ` Note: ${notes}`;
      }
    } else {
      title = 'Withdrawal Rejected';
      message = `Your withdrawal of ${amount} ${currency} has been rejected. The funds have been returned to your wallet.`;
      if (notes) {
        message += ` Reason: ${notes}`;
      }
    }
    
    const data = {
      withdrawalId: withdrawalId,
      status: status,
      amount: amount,
      currency: currency,
      notes: notes
    };
    
    // Send notification
    return await exports.sendUserNotification(
      userId,
      NOTIFICATION_TYPES.WITHDRAWAL_STATUS,
      title,
      message,
      data
    );
  } catch (error) {
    console.error('Error sending withdrawal status notification:', error);
    throw error;
  }
};

/**
 * Send referral reward notification
 * @param {string} userId - User ID who received the reward
 * @param {string} referredUserId - User ID who was referred
 * @param {number} amount - Reward amount
 * @returns {Promise<Object>} Notification result
 */
exports.sendReferralRewardNotification = async (userId, referredUserId, amount) => {
  try {
    if (!userId || !referredUserId || !amount) {
      throw new Error('User ID, referred user ID, and amount are required');
    }

    // Get referred user's display name
    let referredUserName = 'someone';
    try {
      const referredUserDoc = await db.collection('users').doc(referredUserId).get();
      if (referredUserDoc.exists) {
        const referredUserData = referredUserDoc.data();
        referredUserName = referredUserData.displayName || 'someone';
      }
    } catch (userError) {
      console.error(`Error getting referred user ${referredUserId}:`, userError);
      // Continue with default name
    }
    
    // Create notification content
    const title = 'Referral Reward Received';
    const message = `You earned ${amount} USDT from your referral of ${referredUserName}. This amount has been added to your referral balance.`;
    const data = {
      referredUserId: referredUserId,
      amount: amount
    };
    
    // Send notification
    return await exports.sendUserNotification(
      userId,
      NOTIFICATION_TYPES.REFERRAL_REWARD,
      title,
      message,
      data
    );
  } catch (error) {
    console.error('Error sending referral reward notification:', error);
    throw error;
  }
};

/**
 * Send high score notification
 * @param {string} userId - User ID
 * @param {number} score - New high score
 * @param {boolean} isBoosterApplied - Whether a booster was applied
 * @returns {Promise<Object>} Notification result
 */
exports.sendHighScoreNotification = async (userId, score, isBoosterApplied = false) => {
  try {
    if (!userId || !score) {
      throw new Error('User ID and score are required');
    }

    // Create notification content
    const title = 'New High Score!';
    let message = `Congratulations! You've achieved a new high score of ${score}.`;
    if (isBoosterApplied) {
      message += ' (Booster applied)';
    }
    
    const data = {
      score: score,
      isBoosterApplied: isBoosterApplied
    };
    
    // Send notification
    return await exports.sendUserNotification(
      userId,
      NOTIFICATION_TYPES.HIGH_SCORE_ACHIEVED,
      title,
      message,
      data
    );
  } catch (error) {
    console.error('Error sending high score notification:', error);
    throw error;
  }
};

/**
 * Send rank change notification
 * @param {string} userId - User ID
 * @param {string} tournamentType - 'mini' or 'grand'
 * @param {number} oldRank - Previous rank
 * @param {number} newRank - New rank
 * @returns {Promise<Object>} Notification result
 */
exports.sendRankChangeNotification = async (userId, tournamentType, oldRank, newRank) => {
  try {
    if (!userId || !['mini', 'grand'].includes(tournamentType) || !oldRank || !newRank) {
      throw new Error('User ID, tournament type, old rank, and new rank are required');
    }

    // Only send notification if rank improved
    if (newRank >= oldRank) {
      return {
        success: false,
        message: 'Rank did not improve'
      };
    }

    const tournamentName = tournamentType === 'mini' ? 'Mini Tournament' : 'Grand Tournament';
    
    // Create notification content
    const title = 'Rank Improved!';
    const message = `Your rank in the ${tournamentName} has improved from ${oldRank} to ${newRank}!`;
    const data = {
      tournamentType: tournamentType,
      oldRank: oldRank,
      newRank: newRank
    };
    
    // Send notification
    return await exports.sendUserNotification(
      userId,
      NOTIFICATION_TYPES.RANK_CHANGED,
      title,
      message,
      data
    );
  } catch (error) {
    console.error('Error sending rank change notification:', error);
    throw error;
  }
};

/**
 * Send booster expiration notification
 * @param {string} userId - User ID
 * @param {string} boosterType - Booster type ('booster1', 'booster2', 'booster3')
 * @returns {Promise<Object>} Notification result
 */
exports.sendBoosterExpirationNotification = async (userId, boosterType) => {
  try {
    if (!userId || !boosterType) {
      throw new Error('User ID and booster type are required');
    }

    let boosterName;
    switch (boosterType) {
      case 'booster1':
        boosterName = 'Score Doubler (10 Games)';
        break;
      case 'booster2':
        boosterName = 'Score Doubler (100 Games)';
        break;
      case 'booster3':
        boosterName = 'Score Doubler (Unlimited)';
        break;
      default:
        boosterName = boosterType;
    }
    
    // Create notification content
    const title = 'Booster Expired';
    const message = `Your ${boosterName} booster has expired. Purchase a new booster to continue boosting your scores!`;
    const data = {
      boosterType: boosterType
    };
    
    // Send notification
    return await exports.sendUserNotification(
      userId,
      NOTIFICATION_TYPES.BOOSTER_EXPIRED,
      title,
      message,
      data
    );
  } catch (error) {
    console.error('Error sending booster expiration notification:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Result
 */
exports.markNotificationAsRead = async (userId, notificationId) => {
  try {
    if (!userId || !notificationId) {
      throw new Error('User ID and notification ID are required');
    }

    // Get notification document
    const notificationRef = db.collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists) {
      throw new Error('Notification not found');
    }
    
    const notificationData = notificationDoc.data();
    
    // Check if notification belongs to user
    if (notificationData.userId !== userId) {
      throw new Error('Notification does not belong to user');
    }
    
    // Update notification
    await notificationRef.update({
      read: true,
      readAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      notificationId: notificationId
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Get user notifications
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of notifications to return
 * @param {boolean} unreadOnly - Whether to return only unread notifications
 * @returns {Promise<Object>} User notifications
 */
exports.getUserNotifications = async (userId, limit = 20, unreadOnly = false) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Create query
    let query = db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');
    
    if (unreadOnly) {
      query = query.where('read', '==', false);
    }
    
    query = query.limit(limit);
    
    // Execute query
    const notificationsSnapshot = await query.get();
    
    if (notificationsSnapshot.empty) {
      return {
        success: true,
        notifications: [],
        count: 0
      };
    }
    
    // Format notifications
    const notifications = [];
    
    notificationsSnapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        read: data.read,
        createdAt: data.createdAt?.toDate() || null,
        readAt: data.readAt?.toDate() || null
      });
    });
    
    return {
      success: true,
      notifications: notifications,
      count: notifications.length
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Register FCM token for a user
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @returns {Promise<Object>} Registration result
 */
exports.registerFCMToken = async (userId, token) => {
  try {
    if (!userId || !token) {
      throw new Error('User ID and token are required');
    }

    // Update user document
    await db.collection('users').doc(userId).update({
      [`fcmTokens.${token}`]: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      userId: userId,
      token: token
    };
  } catch (error) {
    console.error('Error registering FCM token:', error);
    throw error;
  }
};

/**
 * Unregister FCM token for a user
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @returns {Promise<Object>} Unregistration result
 */
exports.unregisterFCMToken = async (userId, token) => {
  try {
    if (!userId || !token) {
      throw new Error('User ID and token are required');
    }

    // Update user document
    await db.collection('users').doc(userId).update({
      [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete()
    });
    
    return {
      success: true,
      userId: userId,
      token: token
    };
  } catch (error) {
    console.error('Error unregistering FCM token:', error);
    throw error;
  }
};

/**
 * Subscribe a user to the all_users topic for global notifications
 * @param {string} token - FCM token
 * @returns {Promise<Object>} Subscription result
 */
exports.subscribeToAllUsersTopic = async (token) => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }

    // Subscribe to topic
    await admin.messaging().subscribeToTopic(token, 'all_users');
    
    return {
      success: true,
      token: token,
      topic: 'all_users'
    };
  } catch (error) {
    console.error('Error subscribing to all_users topic:', error);
    throw error;
  }
};

// Export notification types for use in other modules
exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
