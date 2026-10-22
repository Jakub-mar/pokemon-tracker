import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getGoogleRedirectUri } from '@/lib/google-oauth';

const GOOGLE_STATE_COOKIE = 'pokemon-tracker-google-state';
const GOOGLE_STATE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getGoogleRedirectUri(request.url);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?googleError=not-configured', request.url));
  }

  const state = crypto.randomBytes(32).toString('hex');
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GOOGLE_STATE_MAX_AGE_SECONDS,
  });
  return response;
}
