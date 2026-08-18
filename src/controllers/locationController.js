import { Location } from '../models/Location.js';

export async function saveLocation(req, res) {
  const { latitude, longitude, accuracy } = req.body || {};
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  const parsedAccuracy = Number(accuracy);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)
    || parsedLatitude < -90 || parsedLatitude > 90
    || parsedLongitude < -180 || parsedLongitude > 180) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  try {
    const savedLocation = await Location.create({
      location: { coordinates: [parsedLongitude, parsedLatitude] },
      ...(Number.isFinite(parsedAccuracy) ? { accuracy: parsedAccuracy } : {}),
    });

    return res.status(201).json({ success: true, location: savedLocation });
  } catch (error) {
    console.error('[LocationController] saveLocation error:', error);
    return res.status(500).json({ error: 'Could not save location' });
  }
}

function formatNominatimAddress(data) {
  if (!data) return '';
  const addr = data.address || {};

  const specific = addr.amenity || addr.building || addr.college || addr.university || addr.school || addr.hospital || addr.road || addr.suburb || addr.neighbourhood || addr.industrial || addr.residential;
  const city = addr.city || addr.town || addr.village || addr.city_district || addr.county || addr.municipality;
  const state = addr.state || addr.state_district;
  const country = addr.country;

  const parts = [specific, city, state, country].filter(Boolean);

  const uniqueParts = parts.filter((item, index) => 
    parts.findIndex(p => p.toLowerCase() === item.toLowerCase()) === index
  );

  if (uniqueParts.length >= 2) {
    return uniqueParts.join(', ');
  }

  if (data.display_name) {
    return data.display_name.split(', ').slice(0, 4).join(', ');
  }

  return 'Detected Location';
}

export async function reverseGeocode(req, res) {
  try {
    const lat = Number(req.query.lat || req.query.latitude);
    const lon = Number(req.query.lon || req.query.lng || req.query.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Valid latitude and longitude query parameters are required' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CivicFlow-AI/1.0 (Civic Complaint Portal)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim reverse geocoding HTTP error ${response.status}`);
    }

    const data = await response.json();
    const formattedAddress = formatNominatimAddress(data);

    return res.status(200).json({
      success: true,
      address: formattedAddress,
      latitude: lat,
      longitude: lon,
      raw: data,
    });
  } catch (error) {
    console.error('[LocationController] reverseGeocode error:', error);
    return res.status(500).json({ error: 'Reverse geocoding failed' });
  }
}
