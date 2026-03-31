// Tunisian Market Constants

// Tunis neighborhoods with coordinates
const NEIGHBORHOODS = [
  { name: 'Tunis Centre', lat: 36.8065, lon: 10.1815 },
  { name: 'La Marsa', lat: 36.8782, lon: 10.3247 },
  { name: 'Carthage', lat: 36.8528, lon: 10.3244 },
  { name: 'Sidi Bou Said', lat: 36.8710, lon: 10.3468 },
  { name: 'Gammarth', lat: 36.8950, lon: 10.2870 },
  { name: 'Ariana', lat: 36.8625, lon: 10.1956 },
  { name: 'Manouba', lat: 36.8100, lon: 10.1000 },
  { name: 'Ben Arous', lat: 36.7533, lon: 10.2283 },
  { name: 'Bardo', lat: 36.8100, lon: 10.1400 },
  { name: 'Manar', lat: 36.8350, lon: 10.1650 },
  { name: 'Menzah', lat: 36.8450, lon: 10.1850 },
  { name: 'Lac', lat: 36.8200, lon: 10.2400 }
];

// Budget ranges in TND
const BUDGET_RANGES = [
  { label: 'Low', min: 0, max: 30, description: 'Under 30 TND' },
  { label: 'Medium', min: 30, max: 80, description: '30-80 TND' },
  { label: 'High', min: 80, max: Infinity, description: 'Over 80 TND' }
];

// Activity types
const ACTIVITY_TYPES = [
  { id: 'coffee', emoji: '☕', label: 'Coffee/Café hangouts', osmTags: ['amenity=cafe', 'amenity=coffee_shop'] },
  { id: 'restaurant', emoji: '🍽️', label: 'Restaurant/Dining', osmTags: ['amenity=restaurant'] },
  { id: 'activities', emoji: '🎮', label: 'Activities (bowling, arcade, escape rooms)', osmTags: ['leisure=bowling_alley', 'leisure=amusement_arcade'] },
  { id: 'outdoor', emoji: '🌳', label: 'Outdoor (parks, walks, beaches)', osmTags: ['leisure=park', 'natural=beach', 'tourism=viewpoint'] },
  { id: 'social', emoji: '👥', label: 'Social/Group events', osmTags: ['amenity=community_centre', 'amenity=bar'] },
  { id: 'events', emoji: '🎬', label: 'Events (cinema, concerts, exhibitions)', osmTags: ['amenity=cinema', 'amenity=theatre', 'tourism=museum'] }
];

// Relationship intentions
const INTENTIONS = [
  { id: 'serious', label: 'Serious relationship' },
  { id: 'dating', label: 'Dating/Casual dating' },
  { id: 'friendship', label: 'Friendship' },
  { id: 'open', label: 'Open to anything' }
];

// Gender options
const GENDERS = ['male', 'female'];

// Report reasons
const REPORT_REASONS = [
  'inappropriate_behavior',
  'fake_profile',
  'harassment',
  'scam'
];

module.exports = {
  NEIGHBORHOODS,
  BUDGET_RANGES,
  ACTIVITY_TYPES,
  INTENTIONS,
  GENDERS,
  REPORT_REASONS
};
