// Uses the access token to fetch accounts and get an authenticated WebSocket URL
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            body = null;
        }
    }
    if (!body) {
        try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            body = JSON.parse(Buffer.concat(chunks).toString());
        } catch (e) {
            return res.status(400).json({ error: 'Could not read body' });
        }
    }

    const { access_token } = body || {};
    if (!access_token) {
        return res.status(400).json({ error: 'Missing access_token' });
    }

    try {
        // Step 1: Fetch the user's accounts using the Bearer token
        const accountsRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
            method: 'GET',
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const accountsText = await accountsRes.text();
        let accountsData;
        try {
            accountsData = JSON.parse(accountsText);
        } catch (e) {
            accountsData = accountsText;
        }

        if (!accountsRes.ok) {
            return res.status(accountsRes.status).json({
                step: 'fetch_accounts',
                error: 'Failed to fetch accounts',
                status: accountsRes.status,
                details: accountsData,
            });
        }

        // Return the accounts data so we can see its shape (discovery step)
        return res.status(200).json({
            step: 'accounts_fetched',
            accounts: accountsData,
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error', message: err.message });
    }
}
