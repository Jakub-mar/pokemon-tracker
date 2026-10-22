import { NextResponse } from 'next/server';
import { createAuthSession } from '@/lib/auth-session-store';
import { setAuthCookie } from '@/lib/auth-server';
import { getGoogleRedirectUri } from '@/lib/google-oauth';
import { findOrCreateGoogleUser } from '@/lib/user-store';

const GOOGLE_STATE_COOKIE = 'pokemon-tracker-google-state';

type GoogleTokenResponse = {
  access_token?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function redirectToLogin(redirectUri: string, error: string) {
  return NextResponse.redirect(new URL(`/login?googleError=${error}`, redirectUri));
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getGoogleRedirectUri(request.url);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?googleError=not-configured', request.url));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const returnedState = requestUrl.searchParams.get('state');
  const expectedState = request.headers
    .get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${GOOGLE_STATE_COOKIE}=`))
    ?.slice(GOOGLE_STATE_COOKIE.length + 1);

  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    const response = redirectToLogin(redirectUri, 'failed');
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    });

    if (!tokenResponse.ok) {
      throw new Error('Google authorization code exchange failed.');
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();
    if (!tokens.access_token) {
      throw new Error('Google did not return an access token.');
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: 'no-store',
    });
    if (!userInfoResponse.ok) {
      throw new Error('Google user information could not be loaded.');
    }

    const profile: GoogleUserInfo = await userInfoResponse.json();
    const email = profile.email?.trim();
    if (!email || profile.email_verified !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Google account does not have a verified email address.');
    }

    const user = await findOrCreateGoogleUser({ email, name: profile.name });
    const session = await createAuthSession(user.id);
    const response = NextResponse.redirect(new URL('/auth/google/success', redirectUri));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    setAuthCookie(response, session.token);
    return response;
  } catch {
    const response = redirectToLogin(redirectUri, 'failed');
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  }
}
