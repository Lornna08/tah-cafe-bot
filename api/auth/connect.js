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
        // Step 1: Fetch the user's accounts
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
            return res
                .status(accountsRes.status)
                .json({ step: 'fetch_accounts', error: 'Failed to fetch accounts', details: accountsData });
        }

        // Pick an account (prefer real, else first)
        const list = accountsData?.data || [];
        const chosen = list.find(a => a.account_type === 'real') || list[0];
        if (!chosen) {
            return res.status(400).json({ step: 'pick_account', error: 'No account found', accounts: accountsData });
        }

        // Step 2: Call the OTP endpoint to get an authenticated WebSocket URL
        const otpRes = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${chosen.account_id}/otp`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
        const otpText = await otpRes.text();
        let otpData;
        try {
            otpData = JSON.parse(otpText);
        } catch (e) {
            otpData = otpText;
        }

        return res.status(200).json({
            step: 'otp_attempted',
            chosen_account: chosen,
            otp_status: otpRes.status,
            otp_response: otpData,
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error', message: err.message });
    }
}
