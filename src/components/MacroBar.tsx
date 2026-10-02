import { Text, View } from 'react-native';

import { spacing, useTheme } from '@/lib/theme';

/** Horizontal progress bar for one nutrient, e.g. "Protein 82 / 120 g". */
export function MacroBar({
  label,
  value,
  goal,
  unit,
  color,
}: {
  label: string;
  value: number;
  goal: number | null;
  unit: string;
  color: string;
}) {
  const t = useTheme();
  const pct = goal ? Math.min(value / goal, 1) : 0;
  const over = goal != null && value > goal;
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: t.text, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: over ? t.progress.over : t.textMuted }}>
          {Math.round(value)}
          {goal ? ` / ${Math.round(goal)}` : ''} {unit}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: t.progress.track, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: over ? t.progress.over : color }} />
      </View>
    </View>
  );
}
