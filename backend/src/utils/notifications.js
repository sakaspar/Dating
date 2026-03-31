/**
 * Push Notification Service (OneSignal)
 *
 * Wraps the OneSignal REST API for sending push notifications.
 * Sends to specific users via their OneSignal player IDs stored in user profiles.
 *
 * Notification types:
 * - New match
 * - New message
 * - Date proposal received
 * - Proposal accepted/declined/modified
 * - Group join request / approval
 */

const OneSignal = require('onesignal-node');

let client = null;

/**
 * Initialize OneSignal client
 */
function getClient() {
  if (client) return client;

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;

  if (!appId || !apiKey) {
    console.warn('⚠️ OneSignal credentials not configured. Push notifications disabled.');
    return null;
  }

  client = new OneSignal.Client({
    app: { appId, appAuthKey: apiKey }
  });

  return client;
}

/**
 * Send a push notification to specific users
 * @param {string[]} externalUserIds - OneSignal external user IDs (our user IDs)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 * @returns {Promise<object|null>} - OneSignal response or null if disabled
 */
async function sendToUsers(externalUserIds, title, body, data = {}) {
  const osClient = getClient();
  if (!osClient) return null;

  if (!externalUserIds || externalUserIds.length === 0) return null;

  try {
    const notification = {
      contents: { en: body },
      headings: { en: title },
      include_external_user_ids: externalUserIds,
      data,
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      android_channel_id: data.channelId || 'default'
    };

    const response = await osClient.createNotification(notification);
    console.log(`🔔 Push sent to ${externalUserIds.length} user(s): ${title}`);
    return response.body;
  } catch (err) {
    console.error('OneSignal push error:', err.message || err);
    return null;
  }
}

// -------------------------------------------------------
// Convenience functions for specific notification types
// -------------------------------------------------------

/**
 * New match notification
 */
async function notifyNewMatch(userIds, matchId, otherUserName) {
  return sendToUsers(userIds, 'New Match! 🎉', `You matched with ${otherUserName}!`, {
    type: 'new_match',
    matchId,
    channelId: 'matches'
  });
}

/**
 * New message notification
 */
async function notifyNewMessage(recipientId, senderName, matchId, preview) {
  const truncated = preview.length > 50 ? preview.substring(0, 47) + '...' : preview;
  return sendToUsers([recipientId], senderName, truncated, {
    type: 'new_message',
    matchId,
    channelId: 'messages'
  });
}

/**
 * Date proposal received
 */
async function notifyProposalReceived(recipientId, proposerName, matchId, proposalId, activityLabel) {
  return sendToUsers([recipientId], 'New Date Proposal! 💝', `${proposerName} suggested: ${activityLabel}`, {
    type: 'proposal_received',
    matchId,
    proposalId,
    channelId: 'proposals'
  });
}

/**
 * Proposal accepted
 */
async function notifyProposalAccepted(proposerId, acceptedByName, matchId, proposalId) {
  return sendToUsers([proposerId], 'Proposal Accepted! 🎊', `${acceptedByName} accepted your date plan!`, {
    type: 'proposal_accepted',
    matchId,
    proposalId,
    channelId: 'proposals'
  });
}

/**
 * Proposal declined
 */
async function notifyProposalDeclined(proposerId, declinedByName, matchId, proposalId) {
  return sendToUsers([proposerId], 'Proposal Update', `${declinedByName} declined your date plan.`, {
    type: 'proposal_declined',
    matchId,
    proposalId,
    channelId: 'proposals'
  });
}

/**
 * Proposal modified (counter-proposal)
 */
async function notifyProposalModified(proposerId, modifiedByName, matchId, proposalId) {
  return sendToUsers([proposerId], 'Counter-Proposal! 🔄', `${modifiedByName} suggested changes to your plan.`, {
    type: 'proposal_modified',
    matchId,
    proposalId,
    channelId: 'proposals'
  });
}

/**
 * Group join request (to group creator)
 */
async function notifyGroupJoinRequest(creatorId, userName, groupId, groupTitle) {
  return sendToUsers([creatorId], 'Join Request 👥', `${userName} wants to join "${groupTitle}"`, {
    type: 'group_join_request',
    groupId,
    channelId: 'groups'
  });
}

/**
 * Group join approved (to the user who requested)
 */
async function notifyGroupApproved(userId, groupTitle, groupId) {
  return sendToUsers([userId], 'Group Request Approved! ✅', `You can now join "${groupTitle}"`, {
    type: 'group_approved',
    groupId,
    channelId: 'groups'
  });
}

module.exports = {
  sendToUsers,
  notifyNewMatch,
  notifyNewMessage,
  notifyProposalReceived,
  notifyProposalAccepted,
  notifyProposalDeclined,
  notifyProposalModified,
  notifyGroupJoinRequest,
  notifyGroupApproved
};
