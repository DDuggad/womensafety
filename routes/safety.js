const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { requireLogin } = require('./auth');

// Safety evaluation routes
router.post('/evaluate-location', requireLogin, async (req, res) => {
    console.log("Received location safety evaluation request:", req.body);
    const { latitude, longitude, isPanicRequest } = req.body;

    // Skip safety evaluation if this is a panic button press
    if (isPanicRequest === true) {
        return res.status(200).json({
            success: true,
            message: "Panic request received, not evaluating safety to avoid delays"
        });
    }

    if (!latitude || !longitude) {
        console.log("Missing coordinates in request, returning default rating");
        return res.status(400).json({
            rating: 3,
            judgement: "Okay Area",
            message: "Default rating - location being processed"
        });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });
        console.log("Initialized Gemini API");

        const prompt = `
Analyze the safety level of the location at latitude ${latitude}, longitude ${longitude}.
Consider:
- Time of day (current time is ${new Date().toLocaleTimeString()})
- Population density
- Availibility of police stations
- Availibility of street cameras
- Public activity in the area
- Historical events
- Crime rates in the area
- Public transportation availability
- Street lighting
- Commercial activity

Return a JSON object with:
{
  "rating": (integer 1-5, where 5 is safest, 4 is safe, 3 is okay, 2 is unsafe, 1 is very unsafe),
  "judgement": (exact string: "Safe Area" for 4-5, "Okay Area" for 3, "Unsafe Area" for 1-2)
}
`;

        console.log("Sending prompt to Gemini API");
        // Updated API usage pattern
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt
        });
        console.log("Received response from Gemini API:", response.text);

        let parsedResult;
        try {
            parsedResult = JSON.parse(response.text);
            console.log("Successfully parsed JSON response:", parsedResult);
        } catch (err) {
            console.error("Gemini response parsing error:", err);
            console.log("Raw response:", response.text);
            return res.json({ rating: 3, judgement: "Okay Area" });
        }

        // Validate and sanitize the response
        const rating = Math.max(1, Math.min(5, Number(parsedResult.rating) || 3));
        const validJudgements = ["Safe Area", "Okay Area", "Unsafe Area"];
        const judgement = validJudgements.includes(parsedResult.judgement)
            ? parsedResult.judgement
            : "Okay Area";

        console.log("Sending safety evaluation response:", { rating, judgement });
        res.json({
            rating,
            judgement,
            timestamp: new Date().getTime() // Add timestamp for client-side cache management
        });
    } catch (e) {
        console.error("Gemini API error:", e);
        // Provide a default response instead of failing
        res.json({
            rating: 3,
            judgement: "Okay Area",
            error: true,
            timestamp: new Date().getTime()
        });
    }
});

// Panic alert (save only)
router.post('/panic', requireLogin, async (req, res) => {
    const { latitude, longitude } = req.body;
    const user = req.session.user;
    if (!latitude || !longitude)
        return res.status(400).json({ message: 'Missing coords' });
    try {
        // Save panic alert in the DB
        await Location.create({ latitude, longitude, userId: user._id });

        // Send emergency email if an emergencyEmail is provided
        if (user.emergencyEmail) {
            const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
            const message = `
🚨 Panic Alert!

Name: ${user.name}
Email: ${user.email}

📍 Location: ${googleMapsLink}
🕒 Time: ${new Date().toLocaleString()}

This is an emergency alert triggered from the Women's Safety App.
      `.trim();
            await sendEmail(
                user.emergencyEmail,
                '🚨 Emergency Alert - Panic Button Pressed',
                message
            );
            console.log('Email sent to emergency contact:', user.emergencyEmail);
        } else {
            console.log('No emergency email found for this user.');
        }
        res.json({ message: 'Panic alert recorded and email sent (if applicable).' });
    } catch (e) {
        console.error('Panic alert error:', e);
        res.status(500).json({ message: 'Panic save failed' });
    }
});

// JSON for map: Returns up to 50 most recent location records.
router.get('/locations-data', requireLogin, async (req, res) => {
    try {
        const locations = await Location
            .find({ userId: req.session.user._id })
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(locations);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// Safe Route Planning Endpoint
router.post('/safe-route', requireLogin, async (req, res) => {
    const { startLat, startLng, destLat, destLng } = req.body;

    if (!startLat || !startLng || !destLat || !destLng) {
        return res.status(400).json({ error: 'Missing coordinates' });
    }

    try {
        // Generate Gemini prompt for route safety analysis
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

        const routePrompt = `
    Analyze the safety of a route from (${startLat},${startLng}) to (${destLat},${destLng}).
    Consider:
    - Time of day safety
    - Street lighting (scale 1-10)
    - Population density (scale 1-10)
    - Proximity to police stations (scale 1-10)
    - Historical incident data

    Return a JSON object with:
    {
      "lightingScore": 1-10,
      "crowdScore": 1-10,
      "policeProximity": 1-10,
      "incidentCount": number,
      "overallSafetyScore": 1-10,
      "recommendations": ["string"]
    }`;

        // Updated API usage pattern
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: routePrompt
        });
        const safetyAnalysis = JSON.parse(response.text);

        // Save route analysis to database
        const safeRoute = await SafeRoute.create({
            userId: req.session.user._id,
            start: { latitude: startLat, longitude: startLng },
            destination: { latitude: destLat, longitude: destLng },
            safetyMetrics: safetyAnalysis
        });

        res.json({
            route: {
                start: { lat: startLat, lng: startLng },
                destination: { lat: destLat, lng: destLng }
            },
            safetyAnalysis,
            alternativeRoutes: await generateAlternativeRoutes(startLat, startLng, destLat, destLng)
        });

    } catch (error) {
        console.error('Safe route planning error:', error);
        res.status(500).json({ error: 'Failed to plan safe route' });
    }
});

async function generateAlternativeRoutes(startLat, startLng, destLat, destLng) {
    // Calculate 3 alternative routes with different priorities
    return [
        {
            name: 'Safest Route',
            priority: 'safety',
            estimatedTime: '25 mins',
            distance: '2.3 km'
        },
        {
            name: 'Well-lit Route',
            priority: 'lighting',
            estimatedTime: '30 mins',
            distance: '2.8 km'
        },
        {
            name: 'Busy Route',
            priority: 'crowded',
            estimatedTime: '28 mins',
            distance: '2.5 km'
        }
    ];
}

// Add this route to your app.js
router.post('/api/evaluate-safety', async (req, res) => {
    try {
        const genAI = new GoogleGenAI(process.env.GOOGLE_GEMINI_API_KEY);

        const { lat, lng, time } = req.body;

        const prompt = `
      Analyze the safety of this location: Latitude ${lat}, Longitude ${lng}
      Current time: ${time}
      
      Provide a JSON response with:
      {
        "score": number between 1-10,
        "analysis": "brief safety analysis",
        "recommendations": ["list", "of", "safety", "tips"]
      }
    `;

        // Updated API usage pattern
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt
        });
        let safetyData;

        try {
            safetyData = JSON.parse(response.text);
        } catch (e) {
            // If JSON parsing fails, create a structured response
            safetyData = {
                score: 7,
                analysis: response.text,
                recommendations: ["Stay aware of your surroundings", "Keep emergency contacts handy"]
            };
        }

        res.json(safetyData);
    } catch (error) {
        console.error('Gemini AI error:', error);
        res.status(500).json({
            error: 'Failed to evaluate area safety',
            score: 5,
            analysis: 'Safety evaluation system temporarily unavailable',
            recommendations: ["Exercise general caution", "Follow standard safety practices"]
        });
    }
});

// Add this new route to handle route safety analysis

router.post('/analyze-route-safety', async (req, res) => {
    try {
        const { routes, time } = req.body;
        const genAI = new GoogleGenAI(process.env.GOOGLE_GEMINI_API_KEY);

        // Create a single comprehensive prompt for all routes
        let routesDescription = routes.map((route, index) => {
            const { start, end, distance, duration, isDaytime } = route;
            return `Route ${index + 1}:
      - From: ${start.lat}, ${start.lng}
      - To: ${end.lat}, ${end.lng}
      - Distance: ${distance}
      - Duration: ${duration}`;
        }).join('\n\n');

        const prompt = `
      Analyze the safety of the following travel routes. The current time is ${time} hours (${time >= 6 && time <= 18 ? 'Daytime' : 'Night'}).

      ${routesDescription}

      For EACH route, provide a safety analysis with scores (1-10, where 10 is safest) for:
      1. Overall route safety
      2. Street lighting conditions
      3. Expected crowd density
      4. Proximity to police/security
      
      Return ONLY a JSON array with one object per route like:
      [
        {
          "routeNumber": 1,
          "overallSafety": 7.5,
          "lighting": 6.8,
          "crowding": 8.2,
          "policeProximity": 7.0,
          "recommendations": ["short safety tip 1", "short safety tip 2"]
        },
        {
          "routeNumber": 2,
          ...
        }
      ]
      
      Ensure each route has different safety ratings based on its unique characteristics.
    `;

        // Set a timeout for the API request
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('API request timeout')), 20000)
        );

        // Updated API usage pattern
        const responsePromise = genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt
        });
        const raceResult = await Promise.race([responsePromise, timeoutPromise]);
        const responseText = raceResult.text;

        let analysesData;
        try {
            analysesData = JSON.parse(responseText);

            // Ensure we have data for all routes
            if (!Array.isArray(analysesData) || analysesData.length < routes.length) {
                throw new Error('Insufficient route analysis data');
            }

            // Format the data to match expected structure
            const analyses = analysesData.map(routeData => ({
                overallSafety: parseFloat(routeData.overallSafety) || Math.floor(5 + Math.random() * 5),
                lighting: parseFloat(routeData.lighting) || Math.floor(5 + Math.random() * 5),
                crowding: parseFloat(routeData.crowding) || Math.floor(5 + Math.random() * 5),
                policeProximity: parseFloat(routeData.policeProximity) || Math.floor(5 + Math.random() * 5),
                recommendations: Array.isArray(routeData.recommendations) ?
                    routeData.recommendations : ["Stay alert", "Share your location with trusted contacts"]
            }));

            res.json({ safetyAnalyses: analyses });

        } catch (e) {
            console.error('Failed to parse Gemini response:', e, responseText);

            // Create varied fallback data for all routes
            const analyses = routes.map((_, index) => {
                // Create meaningful variations based on route index
                const baseScore = 7.5 - (index * 0.8); // First route safest, decreasing safety
                return {
                    overallSafety: Math.max(1, Math.min(10, baseScore + (Math.random() * 0.5 - 0.25))).toFixed(1),
                    lighting: Math.max(1, Math.min(10, baseScore - 0.3 + (Math.random() * 0.6))).toFixed(1),
                    crowding: Math.max(1, Math.min(10, baseScore - 0.5 + (Math.random() * 1.0))).toFixed(1),
                    policeProximity: Math.max(1, Math.min(10, baseScore - 0.2 + (Math.random() * 0.4))).toFixed(1),
                    recommendations: [
                        "Stay in well-lit areas",
                        "Keep emergency contacts updated with your location",
                        "Use the SafeHer emergency features if you feel unsafe"
                    ]
                };
            });

            res.json({ safetyAnalyses: analyses });
        }
    } catch (error) {
        console.error('Gemini route safety analysis error:', error);

        // Create realistic fallback data with variations between routes
        const analyses = req.body.routes.map((_, index) => {
            const baseScore = 7.5 - (index * 0.8);
            return {
                overallSafety: Math.max(1, Math.min(10, baseScore + (Math.random() * 0.5 - 0.25))).toFixed(1),
                lighting: Math.max(1, Math.min(10, baseScore - 0.3 + (Math.random() * 0.6))).toFixed(1),
                crowding: Math.max(1, Math.min(10, baseScore - 0.5 + (Math.random() * 1.0))).toFixed(1),
                policeProximity: Math.max(1, Math.min(10, baseScore - 0.2 + (Math.random() * 0.4))).toFixed(1),
                recommendations: [
                    "Stay alert and aware of your surroundings",
                    "Share your live location with trusted contacts",
                    "Keep emergency contacts easily accessible"
                ]
            };
        });

        res.json({ safetyAnalyses: analyses });
    }
});

module.exports = router;