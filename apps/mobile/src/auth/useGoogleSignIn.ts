import { useMemo } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function resolveClientId(): string | undefined {
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

/**
 * Drives the Google sign-in consent screen and resolves an OpenID Connect ID
 * token, which the caller sends to POST /auth/google for verification.
 * Requires EXPO_PUBLIC_GOOGLE_*_CLIENT_ID env vars from a real Google Cloud
 * OAuth Client — see docs/ARCHITECTURE.md for setup steps.
 */
export function useGoogleSignIn() {
  const clientId = resolveClientId();
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri(), []);
  // Stable per mount: the request config object must keep the same identity
  // across renders, or `useAuthRequest` treats every render as a new request.
  const nonce = useMemo(() => Math.random().toString(36).slice(2), []);
  const requestConfig = useMemo(
    () => ({
      clientId: clientId ?? 'unconfigured',
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: { nonce },
    }),
    [clientId, redirectUri, nonce],
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(requestConfig, discovery);

  const idToken = response?.type === 'success' ? response.params.id_token : undefined;

  return { configured: Boolean(clientId), request, response, promptAsync, idToken };
}
