export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { latitude, longitude, severity, address } = req.body;

  // NEW: If address is provided, geocode it first
  if (address) {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_KEY}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
      const location = geocodeData.results[0].geometry.location;
      return res.status(200).json({
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: geocodeData.results[0].formatted_address
      });
    } else {
      return res.status(404).json({ error: 'Location not found' });
    }
  }

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    // Determine search query based on severity
    let query = 'hospital';
    if (severity === 'emergency' || severity === 'high') {
      query = 'emergency hospital trauma center';
    } else if (severity === 'medium') {
      query = 'hospital community health centre';
    } else {
      query = 'primary health centre clinic';
    }

    // Google Places API call
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=10000&keyword=${encodeURIComponent(query)}&key=${process.env.GOOGLE_MAPS_KEY}`;

    const response = await fetch(placesUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    // Process results
    const facilities = (data.results || []).slice(0, 10).map(place => {
      // Calculate distance (Haversine formula)
      const R = 6371; // Earth radius in km
      const dLat = (place.geometry.location.lat - latitude) * Math.PI / 180;
      const dLon = (place.geometry.location.lng - longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(place.geometry.location.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      return {
        name: place.name,
        address: place.vicinity || 'Address not available',
        rating: place.rating || 0,
        distance: distance.toFixed(1) + ' km',
        location: place.geometry.location,
        placeId: place.place_id
      };
    });

    // Sort by distance
    facilities.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    return res.status(200).json({ 
      facilities,
      count: facilities.length 
    });

  } catch (error) {
    console.error('Maps API error:', error);
    return res.status(500).json({ 
      error: 'Failed to find facilities',
      details: error.message 
    });
  }
}
