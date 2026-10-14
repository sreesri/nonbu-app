import { useFocusEffect } from 'expo-router';
import { useCallback, useId } from 'react';

import type { MealItem } from '@/api/types';

/**
 * Hands dishes picked on a library screen back to the screen that opened it. Routes can't
 * return values, so the picker drops its items here under the opener's id, and the opener
 * collects them when it's back in focus.
 */
const inbox = new Map<string, MealItem[]>();

export function deliverPicked(target: string, items: MealItem[]): void {
  inbox.set(target, [...(inbox.get(target) ?? []), ...items]);
}

function takePicked(target: string): MealItem[] {
  const items = inbox.get(target) ?? [];
  inbox.delete(target);
  return items;
}

/** Calls `onPicked` with whatever was picked for this screen while it was covered. Returns the
 * id to pass to the picker as its `for` param. */
export function usePickedItems(onPicked: (items: MealItem[]) => void): string {
  const target = useId();
  useFocusEffect(
    useCallback(() => {
      const items = takePicked(target);
      if (items.length) onPicked(items);
    }, [target, onPicked]),
  );
  return target;
}
