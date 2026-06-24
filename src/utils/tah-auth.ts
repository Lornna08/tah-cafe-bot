// TAH Cafe custom OAuth (PKCE) helper

const CLIENT_ID = '33tsnYIuso2jECtp9ozke';
const AUTH_ENDPOINT = 'https://auth.deriv.com/oauth2/auth';

// Generate a random code_verifier (43-128 chars)
function generateCodeVerifier(): string {
    const array = crypto.getRandomValues(new Uint8Array(64));
    return Array.from(array)
        .map(v => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[v % 66])
        .join('');
}

// Derive the code_challenge from the verifier (SHA-256, base64url)
async function generateCodeChallenge(verifier: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Generate a random state string for CSRF protection
function generateState(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16))).reduce(
        (s, b) => s + b.toString(16).padStart(2, '0'),
        ''
    );
}

// Start the login flow: build the URL and redirect the user to Deriv
export async function startTahLogin(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store verifier + state so the callback can use them
    sessionStorage.setItem('pkce_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_state', state);

    const redirectUri = `${window.location.origin}/callback`;

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'trade account_manage',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
}
