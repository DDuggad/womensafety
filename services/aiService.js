const { GoogleGenAI } = require('@google/genai');

class AIService {
    constructor(apiKey) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    async evaluateLocationSafety(latitude, longitude) {
        try {
            const prompt = `
        Analyze the safety level of the location at latitude ${latitude}, longitude ${longitude}.
        Consider:
        - Time of day (current time is ${new Date().toLocaleTimeString()})
        - Population density
        - Availability of police stations
        - Availability of street cameras
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

            const response = await this.ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt
            });

            return response.text;
        } catch (error) {
            console.error('AI evaluation error:', error);
            throw error;
        }
    }

    async analyzeRouteSafety(routes, time) {
        // ...existing code for route safety analysis...
    }
}

module.exports = new AIService(process.env.GOOGLE_GEMINI_API_KEY);
