import { useIsFocused } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

const subscribeToAppState = (onChange: () => void) => {
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
};
const isAppActive = () => AppState.currentState === 'active';

/**
 * Current epoch ms, re-rendering every `intervalMs` on the interval's boundaries. Pauses while
 * the screen isn't focused or the app is in the background, since tab screens stay mounted.
 * Use it in the smallest component that shows the time, so a tick re-renders only that.
 */
export function useNow(intervalMs = 1000): number {
  const focused = useIsFocused();
  const appActive = useSyncExternalStore(subscribeToAppState, isAppActive);
  const running = focused && appActive;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    let interval: ReturnType<typeof setInterval> | undefined;
    // Catch up straight away after a pause, then tick on the boundaries (e.g. whole seconds).
    const first = setTimeout(() => {
      tick();
      interval = setInterval(tick, intervalMs);
    }, intervalMs - (Date.now() % intervalMs));
    const catchUp = setTimeout(tick, 0);
    return () => {
      clearTimeout(catchUp);
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [running, intervalMs]);

  return now;
}
