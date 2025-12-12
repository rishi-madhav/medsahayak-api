export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return res.status(200).json({
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: data.results[0].formatted_address
      });
    } else {
      return res.status(404).json({ error: 'Location not found' });
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return res.status(500).json({ error: 'Geocoding failed' });
  }
}
