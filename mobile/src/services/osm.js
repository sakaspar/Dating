/**
 * OpenStreetMap Service
 *
 * - Nominatim geocoding/search (free, 1 req/sec)
 * - Distance calculation (Haversine)
 * - Place type mapping for Overpass queries
 */

// Respect Nominatim rate limit: 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // ms

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Doukhou/1.0 (doukhou.com)',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`OSM API error: ${response.status}`);
  }

  return response.json();
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';

const osmService = {
  /**
   * Search for places by query string
   * Returns array of { id, displayName, lat, lon, type }
   */
  async search(query, options = {}) {
    if (!query || query.trim().length < 2) return [];

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: options.limit || 5,
      addressdetails: 1,
      countrycodes: 'tn', // Tunisia only
    });

    if (options.viewbox) {
      params.set('viewbox', options.viewbox);
      params.set('bounded', 1);
    }

    try {
      const results = await rateLimitedFetch(`${NOMINATIM_BASE}/search?${params}`);
      return results.map(r => ({
        id: r.place_id,
        displayName: r.display_name,
        name: r.name || r.display_name.split(',')[0],
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        type: r.type,
        category: r.class,
      }));
    } catch (err) {
      console.error('Nominatim search error:', err);
      return [];
    }
  },

  /**
   * Reverse geocode lat/lon to address
   */
  async reverseGeocode(lat, lon) {
    try {
      const params = new URLSearchParams({
        lat,
        lon,
        format: 'json',
        addressdetails: 1,
      });
      const result = await rateLimitedFetch(`${NOMINATIM_BASE}/reverse?${params}`);
      return {
        displayName: result.display_name,
        name: result.name || result.address?.road || result.address?.neighbourhood,
        address: result.address,
      };
    } catch (err) {
      console.error('Reverse geocode error:', err);
      return null;
    }
  },

  /**
   * Find nearby places by type using Overpass API
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude
   * @param {string} type - cafe, restaurant, park, etc.
   * @param {number} radius - Search radius in meters (default 2000)
   */
  async findNearby(lat, lon, type, radius = 2000) {
    const overpassTags = {
      cafe: 'amenity=cafe',
      restaurant: 'amenity=restaurant',
      park: 'leisure=park',
      cinema: 'amenity=cinema',
      mall: 'shop=mall',
      museum: 'tourism=museum',
      beach: 'natural=beach',
      bar: 'amenity=bar',
      fast_food: 'amenity=fast_food',
      gym: 'leisure=fitness_centre',
      bowling: 'leisure=bowling_alley',
      theatre: 'amenity=theatre',
    };

    const tag = overpassTags[type] || `amenity=${type}`;
    const [tagKey, tagValue] = tag.split('=');

    const query = `
      [out:json][timeout:10];
      (
        node["${tagKey}"="${tagValue}"](around:${radius},${lat},${lon});
        way["${tagKey}"="${tagValue}"](around:${radius},${lat},${lon});
      );
      out center 10;
    `;

    try {
      const response = await fetch(OVERPASS_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.elements || []).map(el => ({
        id: el.id,
        name: el.tags?.name || 'Unnamed',
        lat: el.lat || el.center?.lat,
        lon: el.lon || el.center?.lon,
        type: el.tags?.[tagKey] || type,
        address: [
          el.tags?.['addr:street'],
          el.tags?.['addr:housenumber'],
          el.tags?.['addr:city'],
        ].filter(Boolean).join(', ') || null,
        cuisine: el.tags?.cuisine || null,
        openingHours: el.tags?.opening_hours || null,
      })).filter(p => p.lat && p.lon);
    } catch (err) {
      console.error('Overpass search error:', err);
      return [];
    }
  },

  /**
   * Calculate distance between two points (Haversine)
   * Returns distance in km
   */
  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  },

  toRad(deg) {
    return deg * (Math.PI / 180);
  },

  /**
   * Get OSM tile URL for react-native-maps
   * Uses standard OSM tile server
   */
  getTileUrl() {
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  },

  /**
   * Default map region for Tunis
   */
  getTunisRegion() {
    return {
      latitude: 36.8065,
      longitude: 10.1815,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  },
};

export default osmService;
