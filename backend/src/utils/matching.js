/**
 * Matching Algorithm
 * 
 * Smart matching with weighted scoring:
 * - Shared activities (highest weight: 30pts)
 * - Shared interests (15pts)
 * - Intention compatibility (15pts)
 * - Distance proximity (15pts)
 * - Profile completeness (15pts)
 * - Recent activity (10pts)
 */

const { getDB } = require('./db');

const db = getDB();

// Weights for scoring
const WEIGHTS = {
  SHARED_ACTIVITIES: 30,
  SHARED_INTERESTS: 15,
  INTENTION_COMPAT: 15,
  DISTANCE: 15,
  PROFILE_COMPLETENESS: 15,
  RECENT_ACTIVITY: 10
};

// Intention compatibility matrix
const INTENTION_COMPAT = {
  serious: { serious: 1.0, dating: 0.6, open: 0.4, friendship: 0.2 },
  dating: { serious: 0.6, dating: 1.0, open: 0.8, friendship: 0.4 },
  open: { serious: 0.4, dating: 0.8, open: 1.0, friendship: 0.6 },
  friendship: { serious: 0.2, dating: 0.4, open: 0.6, friendship: 1.0 }
};

/**
 * Calculate compatibility score between two users (0-100)
 */
function calculateScore(currentUser, candidate, distance) {
  let score = 0;

  // 1. Shared activities (0-30)
  const sharedActivities = (currentUser.activities || []).filter(
    a => (candidate.activities || []).includes(a)
  );
  const maxActivities = Math.max(currentUser.activities?.length || 1, 1);
  score += (sharedActivities.length / maxActivities) * WEIGHTS.SHARED_ACTIVITIES;

  // 2. Shared interests (0-15)
  const sharedInterests = (currentUser.interests || []).filter(
    i => (candidate.interests || []).includes(i)
  );
  const maxInterests = Math.max(currentUser.interests?.length || 1, 1);
  score += (sharedInterests.length / maxInterests) * WEIGHTS.SHARED_INTERESTS;

  // 3. Intention compatibility (0-15)
  const userIntention = currentUser.intention || 'open';
  const candidateIntention = candidate.intention || 'open';
  const compat = INTENTION_COMPAT[userIntention]?.[candidateIntention] || 0.5;
  score += compat * WEIGHTS.INTENTION_COMPAT;

  // 4. Distance (0-15, closer = better, max 50km)
  const maxDistance = currentUser.maxDistance || 50;
  if (distance <= maxDistance) {
    score += (1 - distance / maxDistance) * WEIGHTS.DISTANCE;
  }

  // 5. Profile completeness (0-15)
  const completeness = calculateProfileCompleteness(candidate);
  score += completeness * WEIGHTS.PROFILE_COMPLETENESS;

  // 6. Recent activity (0-10)
  const daysSinceActive = getDaysSinceActive(candidate.lastActive);
  if (daysSinceActive <= 1) score += WEIGHTS.RECENT_ACTIVITY;
  else if (daysSinceActive <= 7) score += WEIGHTS.RECENT_ACTIVITY * 0.5;
  else if (daysSinceActive <= 30) score += WEIGHTS.RECENT_ACTIVITY * 0.2;

  return Math.round(score * 100) / 100;
}

function calculateProfileCompleteness(user) {
  let completeness = 0;
  const checks = [
    user.name, user.age, user.gender,
    user.latitude, user.longitude,
    user.bio, user.intention,
    user.photos?.length >= 3,
    user.activities?.length >= 2
  ];
  checks.forEach(c => { if (c) completeness += 1 / checks.length; });
  return completeness;
}

function getDaysSinceActive(lastActive) {
  if (!lastActive) return 999;
  const diff = Date.now() - new Date(lastActive).getTime();
  return diff / (1000 * 60 * 60 * 24);
}

/**
 * Get potential matches for a user
 * @param {string} userId - The user requesting matches
 * @returns {Promise<Array>} - Top 20 potential matches sorted by score
 */
async function getMatches(userId) {
  const currentUser = await db.read('users', userId);
  if (!currentUser) throw new Error('User not found');

  if (!currentUser.latitude || !currentUser.longitude) {
    throw new Error('Please set your location to get matches');
  }

  // Get all users within 50km radius
  const maxDistance = currentUser.maxDistance || 50;
  const nearbyUsers = await db.findWithinRadius(
    'users', currentUser.latitude, currentUser.longitude,
    maxDistance + 10, 'latitude', 'longitude' // +10km buffer
  );

  // Get existing swipes to filter out
  const swipes = await db.read('swipes', `${userId}_swipes`) || { swiped: {} };
  const swipedIds = new Set(Object.keys(swipes.swiped || {}));

  // Filter candidates
  const candidates = nearbyUsers.filter(candidate => {
    // Skip self
    if (candidate.id === userId) return false;
    // Skip already swiped
    if (swipedIds.has(candidate.id)) return false;
    // Skip inactive (not active in 30 days)
    if (getDaysSinceActive(candidate.lastActive) > 30) return false;
    // Skip incomplete profiles
    if (!candidate.profileComplete) return false;
    // Skip blocked users
    if (currentUser.blockedUsers?.includes(candidate.id)) return false;
    if (candidate.blockedUsers?.includes(userId)) return false;

    // Gender preference check
    if (currentUser.genderPreference && currentUser.genderPreference !== 'both') {
      if (candidate.gender !== currentUser.genderPreference) return false;
    }

    // Age range check
    if (currentUser.ageRangeMin && candidate.age < currentUser.ageRangeMin) return false;
    if (currentUser.ageRangeMax && candidate.age > currentUser.ageRangeMax) return false;

    // Distance check (already filtered by findWithinRadius but double check)
    if (candidate._distance > maxDistance) return false;

    return true;
  });

  // Score and sort
  const scored = candidates.map(candidate => ({
    ...candidate,
    _score: calculateScore(currentUser, candidate, candidate._distance),
    _distance: Math.round(candidate._distance * 10) / 10,
    _sharedActivities: (currentUser.activities || []).filter(
      a => (candidate.activities || []).includes(a)
    )
  }));

  // Sort by score descending, return top 20
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 20).map(({ password, ...user }) => user);
}

module.exports = { getMatches, calculateScore, calculateProfileCompleteness };
