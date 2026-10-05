import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useQueryClient } from '@tanstack/react-query';
import { getCalendars } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setSessionExpiredHandler, storeTokenPair } from '@/api/client';
import type { TokenPair, User } from '@/api/types';
import { GOOGLE_WEB_CLIENT_ID } from '@/lib/config';
import { pushWidget } from '@/widget/sync';
import { clearTokens, loadTokens } from './tokens';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: Status;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

export function deviceTimezone(): string {
  return getCalendars()[0]?.timeZone ?? 'UTC';
}

/** Switch the home-screen widget to its signed-out state (best-effort, like sign-out itself). */
function clearWidget() {
  pushWidget(null).catch(() => {});
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const qc = useQueryClient();

  useEffect(() => {
    loadTokens().then((tokens) => setStatus(tokens ? 'signedIn' : 'signedOut'));
    setSessionExpiredHandler(() => {
      qc.clear();
      clearWidget();
      setStatus('signedOut');
    });
    return () => setSessionExpiredHandler(null);
  }, [qc]);

  const signIn = useCallback(async () => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    let idToken: string | null;
    try {
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // user cancelled
      idToken = response.data.idToken;
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return;
      throw error;
    }
    if (!idToken) throw new Error('Google did not return an ID token. Check the web client ID.');

    const pair = await api<TokenPair>('/auth/google', {
      method: 'POST',
      body: { id_token: idToken },
      auth: false,
    });
    await storeTokenPair(pair);

    // Keep the server's notion of "today" in sync with the phone.
    const user = await api<User>('/me', { method: 'PATCH', body: { timezone: deviceTimezone() } });
    qc.setQueryData(['me'], user);
    setStatus('signedIn');
  }, [qc]);

  const signOut = useCallback(async () => {
    const tokens = await loadTokens();
    if (tokens) {
      api('/auth/logout', {
        method: 'POST',
        body: { refresh_token: tokens.refreshToken },
        auth: false,
      }).catch(() => {});
    }
    await clearTokens();
    await GoogleSignin.signOut().catch(() => {});
    qc.clear();
    clearWidget();
    setStatus('signedOut');
  }, [qc]);

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
