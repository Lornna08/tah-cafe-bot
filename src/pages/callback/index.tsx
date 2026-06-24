import { useEffect, useState } from 'react';

const CallbackPage = () => {
    const [status, setStatus] = useState('Completing login...');

    useEffect(() => {
        const run = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            const error = params.get('error');

            if (error) {
                setStatus('Login was cancelled or failed.');
                return;
            }

            const storedState = sessionStorage.getItem('oauth_state');
            const codeVerifier = sessionStorage.getItem('pkcgit add -Ae_code_verifier');

            if (!code || !state || state !== storedState || !codeVerifier) {
                setStatus('Login failed: invalid state. Please try again.');
                return;
            }

            try {
                const res = await fetch('/api/auth/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        code_verifier: codeVerifier,
                        redirect_uri: `${window.location.origin}/callback`,
                    }),
                });

                const data = await res.json();

                if (!res.ok || !data.access_token) {
                    // eslint-disable-next-line no-console
                    console.error('Token exchange failed:', data);
                    setStatus('Login failed during token exchange. Check console.');
                    return;
                }

                localStorage.setItem('tah_access_token', data.access_token);
                sessionStorage.removeItem('pkce_code_verifier');
                sessionStorage.removeItem('oauth_state');

                // eslint-disable-next-line no-console
                console.log('Access token received:', data.access_token);
                setStatus('Login successful! Token received. (Next: connect to API)');

                // For now, send back to home after a moment so we can see it worked
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Callback error:', err);
                setStatus('Login failed. Please try again.');
            }
        };

        run();
    }, []);

    return (
        <div
            style={{
                display: 'flex',
                height: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
            }}
        >
            {status}
        </div>
    );
};

export default CallbackPage;
