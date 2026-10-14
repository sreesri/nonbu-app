import { Pressable, Text, View } from 'react-native';

import type { MealItem } from '@/api/types';
import { round } from '@/lib/format';
import { formatServing } from '@/lib/nutrition';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Body, Row } from './ui';

const SERVING_STEP = 0.5;

/** A dish in a meal being put together: its calories, a servings stepper and remove. */
export function MealItemRow({
  item,
  onServings,
  onRemove,
}: {
  item: MealItem;
  onServings: (servings: number) => void;
  onRemove: () => void;
}) {
  const serving = formatServing(item.quantity, item.unit);
  const kcal = (item.calories ?? 0) * item.servings;
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Body>{item.name}</Body>
        <Body muted style={{ fontSize: 13 }}>
          {serving ? `${serving} · ` : ''}
          {round(kcal)} kcal
        </Body>
      </View>
      <SmallButton
        label="−"
        accessibilityLabel={`Fewer servings of ${item.name}`}
        disabled={item.servings <= SERVING_STEP}
        onPress={() => onServings(item.servings - SERVING_STEP)}
      />
      <Body style={{ minWidth: 32, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{item.servings}×</Body>
      <SmallButton
        label="+"
        accessibilityLabel={`More servings of ${item.name}`}
        onPress={() => onServings(item.servings + SERVING_STEP)}
      />
      <SmallButton label="✕" accessibilityLabel={`Remove ${item.name}`} onPress={onRemove} />
    </Row>
  );
}

/** Rows for every item, with servings and removal wired to `onChange`. */
export function MealItemList({ items, onChange }: { items: MealItem[]; onChange: (items: MealItem[]) => void }) {
  return items.map((item, i) => (
    <MealItemRow
      // Items have no ids of their own; the position is stable while the list is edited in place.
      key={i}
      item={item}
      onServings={(servings) => onChange(items.map((it, j) => (j === i ? { ...it, servings } : it)))}
      onRemove={() => onChange(items.filter((_, j) => j !== i))}
    />
  ));
}

function SmallButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.button.secondary.bg,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: t.button.secondary.fg, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
