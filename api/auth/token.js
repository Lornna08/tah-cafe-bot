// Backend serverless function: exchanges OAuth code + PKCE verifier for an access token
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse body safely (Vercel may pass it as a string or object)
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }
    }
    if (!body) {
        // Fallback: read the raw stream
        try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            body = JSON.parse(Buffer.concat(chunks).toString());
        } catch (e) {
            return res.status(400).json({ error: 'Could not read body' });
        }
    }

    const { code, code_verifier, redirect_uri } = body || {};

    if (!code || !code_verifier || !redirect_uri) {
        return res.status(400).json({ error: 'Missing required parameters', received: Object.keys(body || {}) });
    }

    try {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: '33tsnYIuso2jECtp9ozke',
            code,
            code_verifier,
            redirect_uri,
        });

        const derivResponse = await fetch('https://auth.deriv.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        const text = await derivResponse.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            return res.status(502).json({ error: 'Deriv returned non-JSON', raw: text });
        }

        if (!derivResponse.ok) {
            return res.status(derivResponse.status).json({ error: 'Token exchange failed', details: data });
        }

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: 'Server error', message: err.message });
    }
}
