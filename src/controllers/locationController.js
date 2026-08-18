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
