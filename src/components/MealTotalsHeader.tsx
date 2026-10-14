import { Text, View } from 'react-native';

import type { Totals } from '@/api/types';
import { round } from '@/lib/format';
import { KCAL_PER_GRAM } from '@/lib/nutrition';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Body, Row } from './ui';

const SPLIT_HEIGHT = 10;
const DOT_SIZE = 8;

/** The meal's calories, how they split between protein, carbs and fat, and each macro in grams. */
export function MealTotalsHeader({ totals }: { totals: Totals }) {
  const t = useTheme();
  const macros = [
    { key: 'protein_g', label: 'Protein', color: t.protein },
    { key: 'carbs_g', label: 'Carbs', color: t.carbs },
    { key: 'fat_g', label: 'Fat', color: t.fat },
  ] as const;
  const energy = macros.map((m) => totals[m.key] * KCAL_PER_GRAM[m.key]);
  const legend = [...macros, { key: 'fiber_g', label: 'Fiber', color: t.fiber } as const];

  return (
    <View
      style={{
        backgroundColor: t.card.bg,
        borderBottomColor: t.card.border,
        borderBottomWidth: 1,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Row style={{ alignItems: 'baseline', gap: spacing.xs }}>
        <Text
          accessibilityLabel={`${round(totals.calories)} kilocalories`}
          style={{ color: t.text, fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'] }}
        >
          {round(totals.calories)}
        </Text>
        <Body muted>kcal</Body>
      </Row>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: 'row',
          height: SPLIT_HEIGHT,
          borderRadius: radius.sm,
          overflow: 'hidden',
          backgroundColor: t.progress.track,
        }}
      >
        {macros.map((m, i) => (
          <View key={m.key} style={{ flex: energy[i], backgroundColor: m.color }} />
        ))}
      </View>
      <Row style={{ flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs }}>
        {legend.map((m) => (
          <Row key={m.key} style={{ gap: spacing.xs }}>
            <View style={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: m.color }} />
            <Body muted style={{ fontSize: 13 }}>
              {m.label} <Text style={{ color: t.text, fontWeight: '600' }}>{round(totals[m.key])} g</Text>
            </Body>
          </Row>
        ))}
      </Row>
    </View>
  );
}
