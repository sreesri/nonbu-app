import { clearTokens, loadTokens, saveTokens } from '@/auth/tokens';
import { API_URL } from '@/lib/config';
import type { TokenPair } from './types';

/**
 * Long enough for the backend to wake from sleep (the free tier can take most of a minute),
 * short enough that a server that never answers shows an error instead of a spinner.
 */
const REQUEST_TIMEOUT_MS = 60_000;

/** The request got no response: offline, or the server is down or didn't answer in time.
 * Not an ApiError, so queued writes treat it as transient and retry. */
export class NetworkError extends Error {}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onSessionExpired: (() => void) | null = null;

/** Called when the refresh token is rejected, so the app can return to sign-in. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') message = body.detail;
    else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = body.detail[0].msg;
  } catch {
    // non-JSON error body
  }
  return new ApiError(res.status, message);
}

export async function storeTokenPair(pair: TokenPair) {
  await saveTokens({ accessToken: pair.access_token, refreshToken: pair.refresh_token });
}

/** fetch() that gives up after REQUEST_TIMEOUT_MS. React Native resolves fetch only once the
 * whole body has arrived, so the timeout covers reading the response too. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new NetworkError(
      controller.signal.aborted
        ? "The server didn't respond in time. Try again in a moment."
        : "Couldn't reach the server. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}

// Single in-flight refresh shared by concurrent 401s (refresh tokens are single-use).
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const tokens = await loadTokens();
    if (!tokens) return false;
    const res = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refreshToken }),
    });
    if (!res.ok) {
      if (res.status === 401) {
        await clearTokens();
        onSessionExpired?.();
      }
      return false;
    }
    await storeTokenPair(await res.json());
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
};

export async function api<T>(path: string, { method = 'GET', body, query, auth = true }: Options = {}): Promise<T> {
  const qs = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const url = `${API_URL}${path}${qs ? `?${qs}` : ''}`;

  const send = async () => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const tokens = await loadTokens();
      if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return fetchWithTimeout(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };

  let res = await send();
  if (res.status === 401 && auth && (await refreshTokens())) {
    res = await send();
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
