    // functions/gemini-proxy.js (Place this file inside a 'functions' directory in your project root)

    export async function onRequestPost({ request, env }) {
        // onRequestPost handles POST requests specifically for Cloudflare Pages Functions
        // request: The incoming Request object
        // env: An object containing environment variables (e.g., env.GEMINI_API_KEY)

        console.log("Cloudflare Function: Request received for /gemini-proxy"); // Add this log!
        console.log("Cloudflare Function: Request method:", request.method); // Add this log!

        // Set CORS headers for Cloudflare Pages.
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*', // IMPORTANT: Adjust for production to your actual domain, e.g., 'https://your-domain.pages.dev'
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight requests (OPTIONS method)
        if (request.method === 'OPTIONS') {
            console.log("Cloudflare Function: Handling OPTIONS preflight request."); // Log preflight
            return new Response(null, {
                status: 204, // No content needed for preflight
                headers: corsHeaders,
            });
        }

        // Get the Gemini API key from Cloudflare Pages environment variables
        // This will be configured in the Cloudflare Pages dashboard
        const geminiApiKey = env.GEMINI_API_KEY;

        if (!geminiApiKey) {
            console.error("Cloudflare Function: GEMINI_API_KEY is not configured."); // Log missing key
            return new Response(JSON.stringify({ error: 'Gemini API key not configured.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        let requestBody;
        try {
            requestBody = await request.json(); // Cloudflare Workers automatically parse JSON body
            console.log("Cloudflare Function: Request body parsed:", requestBody); // Log parsed body
        } catch (e) {
            console.error("Cloudflare Function: Error parsing request body:", e.message); // Log parsing error
            return new Response(JSON.stringify({ error: 'Invalid JSON in request body.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        if (!requestBody || !requestBody.prompt) {
            console.error("Cloudflare Function: Missing 'prompt' in request body."); // Log missing prompt
            return new Response(JSON.stringify({ error: 'Missing "prompt" in request body.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        const userPrompt = requestBody.prompt;
        const responseSchema = requestBody.responseSchema || {};

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
            // Make the request to the Gemini API
            const geminiResponse = await fetch(geminiApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiPayload)
            });

            if (!geminiResponse.ok) {
                const errorText = await geminiResponse.text();
                console.error(`Cloudflare Function: Gemini API responded with status ${geminiResponse.status}: ${errorText}`); // Log Gemini error
                throw new Error(`Gemini API responded with status ${geminiResponse.status}: ${errorText}`);
            }

            const geminiResult = await geminiResponse.json();

            // Return the Gemini API's response to the frontend
            // Cloudflare Workers expect a Response object
            return new Response(JSON.stringify(geminiResult.candidates[0].content.parts[0].text), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });

        } catch (e) {
            console.error("Cloudflare Function: Error calling Gemini API:", e.message); // Log fetch error
            return new Response(JSON.stringify({ error: `Backend error: ${e.message}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }
    }
    