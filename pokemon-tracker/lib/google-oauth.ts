export function getGoogleRedirectUri(requestUrl: string) {
  const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  const applicationUrl = process.env.NEXTAUTH_URL?.trim() || new URL(requestUrl).origin;
  return new URL('/api/auth/callback/google', applicationUrl).toString();
}
