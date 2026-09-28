import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'nonbu.accessToken';
const REFRESH_KEY = 'nonbu.refreshToken';

export type Tokens = { accessToken: string; refreshToken: string };

// Cached in memory so every request doesn't hit the keystore.
let cached: Tokens | null | undefined;

export async function loadTokens(): Promise<Tokens | null> {
  if (cached !== undefined) return cached;
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  cached = accessToken && refreshToken ? { accessToken, refreshToken } : null;
  return cached;
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  cached = tokens;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  cached = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
