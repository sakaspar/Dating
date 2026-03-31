/**
 * OpenStreetMap Utility Module
 *
 * Free APIs (no auth needed):
 * - Overpass API: Search for places by type near coordinates
 * - Nominatim: Geocoding (address ↔ coordinates)
 *
 * Rate-limited to respect OSM fair use policy.
 */

const https = require('https');
const http = require('http');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// Respect OSM rate limits: max 1 request/sec for Nominatim
let lastNominatimRequest = 0;
const NOMINATIM_MIN_INTERVAL_MS = 1100;

/**
 * Make an HTTPS/HTTP GET request and return parsed JSON
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Doukhou Dating App/1.0 (doukhou@example.com)' // OSM requires UA
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Rate-limited Nominatim request
 */
async function nominatimFetch(url) {
  const now = Date.now();
  const elapsed = now - lastNominatimRequest;
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, NOMINATIM_MIN_INTERVAL_MS - elapsed));
  }
  lastNominatimRequest = Date.now();
  return fetchJSON(url);
}

/**
 * Search for places near a location using Overpass API
 *
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {string[]} osmTags - OSM tags to search (e.g., ['amenity=cafe', 'amenity=restaurant'])
 * @param {number} radiusKm - Search radius in km (default 5)
 * @param {number} limit - Max results (default 10)
 * @returns {Promise<Array<{name, type, lat, lon, address, osmId}>>}
 */
async function searchPlaces(lat, lon, osmTags, radiusKm = 5, limit = 10) {
  const radiusM = Math.round(radiusKm * 1000);

  // Build Overpass QL query for each tag
  const tagQueries = osmTags.map(tag => {
    const [key, value] = tag.split('=');
    return `node["${key}"="${value}"](around:${radiusM},${lat},${lon});`;
  }).join('\n');

  const query = `
[out:json][timeout:10];
(
${tagQueries}
);
out body;
`;

  try {
    const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;
    const result = await fetchJSON(url);

    if (!result.elements || result.elements.length === 0) {
      return [];
    }

    // Process and deduplicate by name
    const seen = new Set();
    const places = [];

    for (const el of result.elements) {
      const name = el.tags?.name;
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      // Build address from OSM tags
      const addr = el.tags || {};
      const addressParts = [
        addr['addr:street'],
        addr['addr:housenumber'],
        addr['addr:city'] || addr['addr:town'] || addr['addr:village']
      ].filter(Boolean);

      places.push({
        name,
        type: el.tags?.amenity || el.tags?.leisure || el.tags?.tourism || 'place',
        lat: el.lat,
        lon: el.lon,
        address: addressParts.length > 0 ? addressParts.join(', ') : null,
        osmId: el.id
      });

      if (places.length >= limit) break;
    }

    return places;
  } catch (err) {
    console.error('Overpass API error:', err.message);
    return [];
  }
}

/**
 * Reverse geocode coordinates to address using Nominatim
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string|null>} Formatted address
 */
async function reverseGeocode(lat, lon) {
  try {
    const url = `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const result = await nominatimFetch(url);
    return result.display_name || null;
  } catch (err) {
    console.error('Nominatim reverse geocode error:', err.message);
    return null;
  }
}

/**
 * Search for a place by name using Nominatim
 *
 * @param {string} query - Place name to search
 * @param {number} lat - Bias latitude (optional)
 * @param {number} lon - Bias longitude (optional)
 * @returns {Promise<Array<{name, lat, lon, address}>>}
 */
async function searchPlace(query, lat, lon) {
  try {
    let url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    if (lat && lon) {
      url += `&viewbox=${lon - 0.1},${lat + 0.1},${lon + 0.1},${lat - 0.1}&bounded=1`;
    }
    const results = await nominatimFetch(url);
    return results.map(r => ({
      name: r.display_name?.split(',')[0] || r.name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      address: r.display_name,
      type: r.type
    }));
  } catch (err) {
    console.error('Nominatim search error:', err.message);
    return [];
  }
}

module.exports = {
  searchPlaces,
  reverseGeocode,
  searchPlace
};
