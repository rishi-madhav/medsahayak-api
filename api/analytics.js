export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, eventType, metadata } = req.body;

    // Log analytics event
    const event = {
      userId: userId || 'anonymous',
      eventType,
      metadata,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']
    };

    // In production, you'd save this to Firebase or analytics service
    // For now, just log it
    console.log('Analytics event:', JSON.stringify(event));

    return res.status(200).json({ 
      success: true,
      eventId: Date.now().toString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ 
      error: 'Failed to log analytics',
      details: error.message 
    });
  }
}
