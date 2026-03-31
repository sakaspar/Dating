/**
 * Test Data Generator
 *
 * Generates 75 fake user profiles with:
 * - Varied locations across Tunis neighborhoods
 * - Ages 18-35
 * - Activity preferences
 * - Some mutual swipes/matches
 * - A few proposals and groups
 *
 * Usage: node src/scripts/generate-test-data.js
 */

const { getDB } = require('../utils/db');
const { NEIGHBORHOODS, ACTIVITY_TYPES, INTENTIONS } = require('../utils/constants');
const bcrypt = require('bcrypt');
const path = require('path');

const db = getDB();

// Tunisian first names
const MALE_NAMES = [
  'Ahmed', 'Mohamed', 'Youssef', 'Omar', 'Amine', 'Karim', 'Hamza', 'Sami',
  'Nabil', 'Tarek', 'Fares', 'Rami', 'Aymen', 'Mehdi', 'Walid', 'Sofiane',
  'Bilel', 'Chaker', 'Houssem', 'Seif', 'Aziz', 'Rached', 'Ali', 'Malek',
  'Zied', 'Bassem', 'Riadh', 'Khalil', 'Nader', 'Anis'
];

const FEMALE_NAMES = [
  'Amira', 'Nour', 'Sarra', 'Ines', 'Yasmine', 'Amina', 'Mariem', 'Rania',
  'Fatma', 'Salma', 'Hana', 'Nesrine', 'Imen', 'Dorra', 'Syrine', 'Mayssa',
  'Lina', 'Ghada', 'Asma', 'Emna', 'Nesma', 'Sana', 'Nadia', 'Hela',
  'Olfa', 'Thouraya', 'Hajer', 'Mouna', 'Rim', 'Sirine'
];

const INTERESTS_POOL = [
  'photography', 'music', 'sports', 'travel', 'cooking', 'reading',
  'gaming', 'fitness', 'art', 'fashion', 'tech', 'cinema',
  'hiking', 'dancing', 'yoga', 'football', 'swimming', 'coding',
  'writing', 'volunteering'
];

const BIOS = [
  'Coffee enthusiast looking for new places to explore.',
  'Love outdoor adventures and good conversations.',
  'Foodie who knows all the best spots in Tunis.',
  'Always up for trying something new.',
  'Let\'s discover Tunis together!',
  'Big fan of cozy cafés and sunset walks.',
  'Here to find someone who shares my energy.',
  'Simple person who enjoys good company.',
  'Weekend hiker, weekday coder.',
  'Looking for real connections, not just chats.',
  'Life is too short for boring dates.',
  'Tell me about your favorite restaurant.',
  'Art lover and occasional painter.',
  'Let\'s grab coffee and see where it goes.',
  'Sports fanatic, especially football.',
  'Music makes everything better.',
  'I know the best escape rooms in Tunis.',
  'Beach walks > Everything else.',
  'Looking for my partner in crime.',
  'Good vibes only.',
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSubset(arr, min, max) {
  const count = randomBetween(min, Math.min(max, arr.length));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Add slight random offset to coordinates (±500m)
function jitterCoord(lat, lon, maxKm = 0.5) {
  const latOffset = (Math.random() - 0.5) * (maxKm / 111);
  const lonOffset = (Math.random() - 0.5) * (maxKm / (111 * Math.cos(lat * Math.PI / 180)));
  return {
    lat: parseFloat((lat + latOffset).toFixed(6)),
    lon: parseFloat((lon + lonOffset).toFixed(6))
  };
}

async function generateUsers(count = 75) {
  console.log(`\n🔧 Generating ${count} test users...`);
  const hashedPassword = await bcrypt.hash('Test1234!', 10);
  const userIds = [];
  const created = { male: 0, female: 0 };

  for (let i = 0; i < count; i++) {
    const gender = i < Math.floor(count / 2) ? 'male' : 'female';
    const names = gender === 'male' ? MALE_NAMES : FEMALE_NAMES;
    const name = names[i % names.length];
    const age = randomBetween(18, 35);

    const neighborhood = randomFrom(NEIGHBORHOODS);
    const coords = jitterCoord(neighborhood.lat, neighborhood.lon);

    const activities = randomSubset(ACTIVITY_TYPES, 2, 4).map(a => a.id);
    const interests = randomSubset(INTERESTS_POOL, 2, 5);
    const intention = randomFrom(INTENTIONS).id;

    const email = `${name.toLowerCase()}${i}@test.doukhou.tn`;

    const user = {
      email,
      password: hashedPassword,
      name,
      age,
      gender,
      latitude: coords.lat,
      longitude: coords.lon,
      city: 'Tunis',
      neighborhood: neighborhood.name,
      bio: randomFrom(BIOS),
      photos: [],
      activities,
      interests,
      intention,
      preferences: {
        ageRangeMin: Math.max(18, age - 8),
        ageRangeMax: Math.min(50, age + 8),
        genderPreference: gender === 'male' ? 'female' : 'male',
        maxDistance: randomBetween(10, 50),
        activities: randomSubset(ACTIVITY_TYPES, 2, 4).map(a => a.id),
        interests: randomSubset(INTERESTS_POOL, 2, 4)
      },
      verified: Math.random() > 0.3, // 70% verified
      blocked: [],
      createdAt: new Date(Date.now() - randomBetween(0, 30 * 24 * 60 * 60 * 1000)).toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await db.create('users', user);
    userIds.push(saved.id);
    created[gender]++;

    // Add to email index
    await db.addToIndex('user_by_email', email, saved.id);

    if ((i + 1) % 25 === 0) {
      console.log(`  📝 Created ${i + 1}/${count} users...`);
    }
  }

  console.log(`✅ Created ${count} users (${created.male} male, ${created.female} female)`);
  return userIds;
}

async function generateSwipes(userIds) {
  console.log('\n🔧 Generating swipes & matches...');
  const maleIds = [];
  const femaleIds = [];

  // Re-read to determine gender
  for (const id of userIds) {
    const user = await db.read('users', id);
    if (user.gender === 'male') maleIds.push(id);
    else femaleIds.push(id);
  }

  let swipeCount = 0;
  const allSwipes = {}; // userId → { targetId: action }

  // Phase 1: Generate all swipes
  for (const userId of userIds) {
    const user = await db.read('users', userId);
    const oppositeGender = user.gender === 'male' ? femaleIds : maleIds;
    const targets = randomSubset(oppositeGender, 15, Math.min(30, oppositeGender.length));

    const swiped = {};
    allSwipes[userId] = {};

    for (const targetId of targets) {
      const action = Math.random() > 0.4 ? 'like' : 'pass'; // 60% like rate
      swiped[targetId] = {
        action,
        timestamp: new Date(Date.now() - randomBetween(0, 20 * 24 * 60 * 60 * 1000)).toISOString()
      };
      allSwipes[userId][targetId] = action;
      swipeCount++;
    }

    await db.create('swipes', { id: `${userId}_swipes`, userId, swiped });
  }

  // Phase 2: Find mutual likes → create matches
  let matchCount = 0;
  const matchIds = [];
  const seen = new Set();

  for (const userId of userIds) {
    for (const [targetId, action] of Object.entries(allSwipes[userId] || {})) {
      if (action !== 'like') continue;

      const key = [userId, targetId].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);

      if (allSwipes[targetId] && allSwipes[targetId][userId] === 'like') {
        const matchId = db.generateId();
        const match = await db.create('matches', {
          id: matchId,
          users: [userId, targetId].sort(),
          user1Id: userId,
          user2Id: targetId,
          matchedAt: new Date().toISOString()
        });
        matchIds.push(match.id);
        matchCount++;
      }
    }
  }

  console.log(`✅ Created ${swipeCount} swipes, ${matchCount} matches`);
  return matchIds;
}

async function generateProposals(matchIds) {
  console.log('\n🔧 Generating date proposals...');
  let count = 0;

  // Create proposals for ~40% of matches
  const proposalMatches = randomSubset(matchIds, Math.floor(matchIds.length * 0.4), matchIds.length);

  for (const matchId of proposalMatches) {
    const match = await db.read('matches', matchId);
    if (!match) continue;

    const activities = randomSubset(ACTIVITY_TYPES, 1, 2);
    const neighborhood = randomFrom(NEIGHBORHOODS);
    const futureDate = new Date(Date.now() + randomBetween(1, 14) * 24 * 60 * 60 * 1000);

    const proposal = await db.create('proposals', {
      matchId,
      fromUserId: match.user1Id,
      toUserId: match.user2Id,
      activityType: activities[0].id,
      date: futureDate.toISOString().split('T')[0],
      time: `${randomBetween(10, 20)}:${Math.random() > 0.5 ? '00' : '30'}`,
      neighborhood: neighborhood.name,
      budgetRange: randomFrom(['Low', 'Medium', 'High']),
      suggestedPlace: `${neighborhood.name} ${randomFrom(['Café', 'Restaurant', 'Park'])}`,
      notes: Math.random() > 0.5 ? 'Looking forward to it!' : '',
      status: randomFrom(['pending', 'accepted', 'declined', 'pending', 'accepted']),
      history: [],
      createdAt: new Date().toISOString()
    });
    count++;
  }

  console.log(`✅ Created ${count} proposals`);
  return count;
}

async function generateGroups(userIds) {
  console.log('\n🔧 Generating group activities...');
  const groupTitles = [
    'Weekend Coffee Run', 'Board Game Night', 'Beach Volleyball',
    'Movie Marathon', 'Hiking in Boukornine', 'Cooking Class',
    'Escape Room Challenge', 'Photography Walk', 'Sunset Picnic',
    'Book Club Meetup'
  ];

  let count = 0;
  for (const title of groupTitles) {
    const creator = randomFrom(userIds);
    const neighborhood = randomFrom(NEIGHBORHOODS);
    const activity = randomFrom(ACTIVITY_TYPES);
    const futureDate = new Date(Date.now() + randomBetween(1, 21) * 24 * 60 * 60 * 1000);

    await db.create('groups', {
      creatorId: creator,
      activityType: activity.id,
      title,
      description: `Join us for ${activity.label.toLowerCase()} in ${neighborhood.name}!`,
      date: futureDate.toISOString().split('T')[0],
      time: `${randomBetween(14, 19)}:00`,
      location: neighborhood.name,
      latitude: neighborhood.lat,
      longitude: neighborhood.lon,
      currentSize: randomBetween(2, 4),
      lookingFor: randomBetween(1, 4),
      visibility: Math.random() > 0.2 ? 'public' : 'friends',
      ageRangeMin: 18,
      ageRangeMax: 35,
      genderPreference: 'both',
      members: [{ userId: creator, status: 'approved', joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString()
    });
    count++;
  }

  console.log(`✅ Created ${count} group activities`);
}

async function main() {
  console.log('🚀 Doukhou Test Data Generator');
  console.log('================================\n');

  const startTime = Date.now();

  try {
    // 1. Generate 75 users
    const userIds = await generateUsers(75);

    // 2. Generate swipes and matches
    const matchIds = await generateSwipes(userIds);

    // 3. Generate proposals for some matches
    await generateProposals(matchIds);

    // 4. Generate group activities
    await generateGroups(userIds);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n================================`);
    console.log(`✅ Done in ${elapsed}s`);
    console.log(`📊 Summary:`);
    console.log(`   - 75 users`);
    console.log(`   - Swipes & matches`);
    console.log(`   - Date proposals`);
    console.log(`   - 10 group activities`);
    console.log(`\n🔑 All test users have password: Test1234!`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
