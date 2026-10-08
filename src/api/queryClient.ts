import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, onlineManager, QueryClient, type Mutation } from '@tanstack/react-query';
import type { PersistedClient, PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';
import Storage from 'expo-sqlite/kv-store';
import { Alert } from 'react-native';

import { isQueuedWrite, registerQueuedWrites } from './writes';

/** How long cached data and queued writes survive on the device. */
const CACHE_MAX_AGE_MS = 7 * 24 * 3600_000;
/** Bump when a cached response shape changes, so the old cache is discarded instead of misread. */
const CACHE_VERSION = '2';
const CACHE_STORAGE_KEY = 'nonbu.queryCache';
const QUERY_STALE_MS = 30_000;

// React Native has no browser online/offline events; feed React Query from the OS instead,
// so queries and queued writes pause while offline and resume on reconnect.
onlineManager.setEventListener((setOnline) => {
  const update = ({ isConnected }: Network.NetworkState) => setOnline(isConnected !== false);
  Network.getNetworkStateAsync().then(update, () => {});
  const subscription = Network.addNetworkStateListener(update);
  return () => subscription.remove();
});

function reportRejectedWrite(error: Error, _variables: unknown, _context: unknown, mutation: Mutation<unknown, unknown, unknown, unknown>) {
  if (!isQueuedWrite(mutation)) return;
  Alert.alert("A change couldn't be saved", `${error.message}\n\nIt was discarded and your data has been refreshed.`);
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({ onError: reportRejectedWrite }),
  defaultOptions: {
    // gcTime must cover the persisted age, or restored queries are garbage-collected straight away.
    queries: { staleTime: QUERY_STALE_MS, gcTime: CACHE_MAX_AGE_MS, retry: 1 },
  },
});
registerQueuedWrites(queryClient);

/**
 * Saves every queued write as paused, including one that was mid-request. React Query resumes
 * only paused writes (on restore and on reconnect); resuming any other way runs them twice.
 */
function serialize(client: PersistedClient): string {
  const mutations = client.clientState.mutations.map((m) => ({ ...m, state: { ...m.state, isPaused: true } }));
  return JSON.stringify({ ...client, clientState: { ...client.clientState, mutations } });
}

const persister = createAsyncStoragePersister({ storage: Storage, key: CACHE_STORAGE_KEY, serialize });

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: CACHE_MAX_AGE_MS,
  buster: CACHE_VERSION,
  dehydrateOptions: {
    // Keep in-flight writes too (not just paused ones), so a write survives the app being killed
    // mid-request or between retries.
    shouldDehydrateMutation: (mutation) => isQueuedWrite(mutation) && mutation.state.status === 'pending',
  },
};

/**
 * After the cache is restored, replay queued writes; they share one scope, so they still run one
 * at a time in their original order. Restored queries are already stale and refetch on use.
 */
export function resumeQueuedWrites(): Promise<unknown> {
  return queryClient.resumePausedMutations();
}

/** Forget everything cached on the device, e.g. on sign-out. */
export async function clearCache(): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}
