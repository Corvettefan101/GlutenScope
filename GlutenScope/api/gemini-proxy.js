// api/gemini-proxy.js

// This function acts as a proxy to the Gemini API, securing your API key.
// It receives requests from your frontend, makes the actual call to Gemini,
// and returns the response.

// Vercel functions use a standard Node.js (req, res) pattern for API routes.
export default async function handler(req, res) {
    // Set CORS headers to allow requests from your frontend domain
    // For development, '*' is fine. For production, replace '*' with your Vercel domain
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end(); // No content needed for preflight
    }

    // Get the Gemini API key from environment variables
    // IMPORTANT: Set this environment variable in your Vercel project settings!
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
        return res.status(500).json({ error: 'Gemini API key not configured.' });
    }

    // Parse the request body (expecting JSON from frontend)
    let requestBody;
    try {
        requestBody = req.body; // Vercel often parses JSON automatically for POST requests
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in request body.' });
    }

    if (!requestBody || !requestBody.prompt) {
        return res.status(400).json({ error: 'Missing "prompt" in request body.' });
    }

    const userPrompt = requestBody.prompt;
    const responseSchema = requestBody.responseSchema || {}; // Get schema if provided

    // Construct the payload for the Gemini API
    const geminiPayload = {
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    };

    // Define the Gemini API endpoint
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    try {
        // Use node-fetch to make the request to the Gemini API
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API responded with status ${geminiResponse.status}: ${errorText}`);
        }

        const geminiResult = await geminiResponse.json();

        // Return the Gemini API's response to the frontend
        // Vercel expects JSON directly from res.json()
        return res.status(200).json(geminiResult.candidates[0].content.parts[0].text);

    } catch (e) {
        console.error("Error calling Gemini API:", e.message);
        return res.status(500).json({ error: `Backend error: ${e.message}` });
    }
}
