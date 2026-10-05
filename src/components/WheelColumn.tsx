import { useEffect, useRef } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useTheme } from '@/lib/theme';

export const WHEEL_ITEM_HEIGHT = 44;
export const WHEEL_VISIBLE_ROWS = 5;
/** Empty space above and below so the first and last items can sit in the centre band. */
const EDGE_PADDING = WHEEL_ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_ROWS / 2);

const ACCESSIBILITY_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }];

/** One snapping column of a wheel picker; the item in the centre band is the value. */
export function WheelColumn({
  label,
  items,
  index,
  onChange,
  flex = 1,
}: {
  label: string;
  items: string[];
  index: number;
  onChange: (index: number) => void;
  flex?: number;
}) {
  const t = useTheme();
  const list = useRef<FlatList<string>>(null);

  // Follow the value when it changes from outside the scroll, e.g. a tap or clamping to "now".
  useEffect(() => {
    list.current?.scrollToOffset({ offset: index * WHEEL_ITEM_HEIGHT, animated: true });
  }, [index]);

  const select = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), items.length - 1);
    if (clamped !== index) onChange(clamped);
  };
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    select(Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT));
  const onAccessibilityAction = (e: AccessibilityActionEvent) =>
    select(index + (e.nativeEvent.actionName === 'increment' ? 1 : -1));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] }}
      accessibilityActions={ACCESSIBILITY_ACTIONS}
      onAccessibilityAction={onAccessibilityAction}
      style={{ flex, height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS }}
    >
      <FlatList
        ref={list}
        data={items}
        keyExtractor={(item, i) => `${i}-${item}`}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: WHEEL_ITEM_HEIGHT, offset: WHEEL_ITEM_HEIGHT * i, index: i })}
        contentContainerStyle={{ paddingVertical: EDGE_PADDING }}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => {
          // A slow drag released without a fling never fires onMomentumScrollEnd.
          if (!e.nativeEvent.velocity?.y) settle(e);
        }}
        renderItem={({ item, index: i }) => {
          const distance = Math.abs(i - index);
          return (
            <Pressable onPress={() => select(i)} style={{ height: WHEEL_ITEM_HEIGHT, justifyContent: 'center' }}>
              <Text
                numberOfLines={1}
                style={{
                  textAlign: 'center',
                  fontVariant: ['tabular-nums'],
                  fontSize: distance === 0 ? 20 : 16,
                  fontWeight: distance === 0 ? '700' : '400',
                  color: distance === 0 ? t.wheel.selected : distance === 1 ? t.wheel.item : t.wheel.faded,
                }}
              >
                {item}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
