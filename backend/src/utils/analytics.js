/**
 * Analytics Tracking Module
 *
 * Tracks daily metrics in /data/analytics/daily_{date}.json:
 * - DAU (daily active users)
 * - New registrations
 * - Matches created
 * - Proposals created / accepted (conversion rate)
 * - Messages sent
 * - Group activities created
 * - Avg time from match to first proposal
 *
 * Usage:
 *   const { track, getDaily, getRange } = require('../utils/analytics');
 *   track('match');      // increment match counter
 *   track('user');       // increment new user counter
 *   track('message');    // increment message counter
 */

const { getDB } = require('../utils/db');

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Track an event (increments the relevant counter for today)
 * @param {'user'|'match'|'proposal'|'proposal_accepted'|'message'|'group'|'login'} event
 * @param {object} meta - Optional metadata (e.g., { matchId, proposalId, timestamp })
 */
async function track(event, meta = {}) {
  const db = getDB();
  const date = getToday();
  const analyticsId = `daily_${date}`;

  // Load or create today's analytics file
  let daily = await db.read('analytics', analyticsId);
  if (!daily) {
    daily = await db.create('analytics', {
      id: analyticsId,
      date,
      // Counters
      newUsers: 0,
      logins: 0,
      dau: 0,
      dauUserIds: [],
      matchesCreated: 0,
      proposalsCreated: 0,
      proposalsAccepted: 0,
      messagesSent: 0,
      groupsCreated: 0,
      // Timing
      matchToProposalTimes: [], // array of durations in minutes
      avgMatchToProposalMinutes: null
    });
  }

  // Increment counters based on event type
  switch (event) {
    case 'user':
      daily.newUsers = (daily.newUsers || 0) + 1;
      break;

    case 'login':
      daily.logins = (daily.logins || 0) + 1;
      // Track DAU
      if (meta.userId) {
        const dauIds = daily.dauUserIds || [];
        if (!dauIds.includes(meta.userId)) {
          dauIds.push(meta.userId);
          daily.dauUserIds = dauIds;
          daily.dau = dauIds.length;
        }
      }
      break;

    case 'match':
      daily.matchesCreated = (daily.matchesCreated || 0) + 1;
      break;

    case 'proposal':
      daily.proposalsCreated = (daily.proposalsCreated || 0) + 1;
      // Track match-to-proposal time if both timestamps provided
      if (meta.matchCreatedAt && meta.proposalCreatedAt) {
        const matchTime = new Date(meta.matchCreatedAt).getTime();
        const proposalTime = new Date(meta.proposalCreatedAt).getTime();
        const diffMinutes = Math.round((proposalTime - matchTime) / (1000 * 60));
        if (diffMinutes >= 0) {
          const times = daily.matchToProposalTimes || [];
          times.push(diffMinutes);
          daily.matchToProposalTimes = times;
          daily.avgMatchToProposalMinutes = Math.round(
            times.reduce((a, b) => a + b, 0) / times.length
          );
        }
      }
      break;

    case 'proposal_accepted':
      daily.proposalsAccepted = (daily.proposalsAccepted || 0) + 1;
      break;

    case 'message':
      daily.messagesSent = (daily.messagesSent || 0) + 1;
      break;

    case 'group':
      daily.groupsCreated = (daily.groupsCreated || 0) + 1;
      break;

    default:
      console.warn(`Unknown analytics event: ${event}`);
      return;
  }

  // Update the file
  await db.update('analytics', analyticsId, daily);
}

/**
 * Get analytics for a specific date
 * @param {string} date - YYYY-MM-DD format
 */
async function getDaily(date) {
  const db = getDB();
  const analyticsId = `daily_${date}`;
  const daily = await db.read('analytics', analyticsId);
  if (!daily) return null;

  // Compute conversion rate
  const conversionRate = daily.proposalsCreated > 0
    ? Math.round((daily.proposalsAccepted / daily.proposalsCreated) * 100)
    : 0;

  return {
    date: daily.date,
    newUsers: daily.newUsers || 0,
    logins: daily.logins || 0,
    dau: daily.dau || 0,
    matchesCreated: daily.matchesCreated || 0,
    proposalsCreated: daily.proposalsCreated || 0,
    proposalsAccepted: daily.proposalsAccepted || 0,
    proposalConversionRate: `${conversionRate}%`,
    messagesSent: daily.messagesSent || 0,
    groupsCreated: daily.groupsCreated || 0,
    avgMatchToProposalMinutes: daily.avgMatchToProposalMinutes
  };
}

/**
 * Get analytics for a date range
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
async function getRange(startDate, endDate) {
  const db = getDB();
  const allAnalytics = await db.list('analytics');

  const filtered = allAnalytics.filter(a => {
    if (!a.date) return false;
    return a.date >= startDate && a.date <= endDate;
  });

  // Sort by date
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  // Compute totals
  const totals = {
    newUsers: 0,
    logins: 0,
    matchesCreated: 0,
    proposalsCreated: 0,
    proposalsAccepted: 0,
    messagesSent: 0,
    groupsCreated: 0,
    matchToProposalTimes: []
  };

  for (const day of filtered) {
    totals.newUsers += day.newUsers || 0;
    totals.logins += day.logins || 0;
    totals.matchesCreated += day.matchesCreated || 0;
    totals.proposalsCreated += day.proposalsCreated || 0;
    totals.proposalsAccepted += day.proposalsAccepted || 0;
    totals.messagesSent += day.messagesSent || 0;
    totals.groupsCreated += day.groupsCreated || 0;
    if (day.matchToProposalTimes?.length) {
      totals.matchToProposalTimes.push(...day.matchToProposalTimes);
    }
  }

  const avgTime = totals.matchToProposalTimes.length > 0
    ? Math.round(totals.matchToProposalTimes.reduce((a, b) => a + b, 0) / totals.matchToProposalTimes.length)
    : null;

  const conversionRate = totals.proposalsCreated > 0
    ? Math.round((totals.proposalsAccepted / totals.proposalsCreated) * 100)
    : 0;

  return {
    period: { start: startDate, end: endDate },
    days: filtered.map(d => ({
      date: d.date,
      dau: d.dau || 0,
      newUsers: d.newUsers || 0,
      matchesCreated: d.matchesCreated || 0,
      proposalsCreated: d.proposalsCreated || 0,
      proposalsAccepted: d.proposalsAccepted || 0,
      messagesSent: d.messagesSent || 0,
      groupsCreated: d.groupsCreated || 0
    })),
    totals: {
      ...totals,
      matchToProposalTimes: undefined,
      avgMatchToProposalMinutes: avgTime,
      proposalConversionRate: `${conversionRate}%`
    }
  };
}

module.exports = { track, getDaily, getRange };
