import { Text, View } from 'react-native';

import { HOURS_PER_DAY, MAX_FAST_HOURS, MIN_FAST_HOURS, SCHEDULE_PRESETS, clampFastHours } from '@/lib/goals';
import { formatHours } from '@/lib/format';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Button, Chip, Label, Row } from './ui';

/** Fasting:eating split of the day. Editing either side adjusts the other so they total 24h. */
export function FastingScheduleEditor({
  fastHours,
  onChange,
}: {
  fastHours: number;
  onChange: (fastHours: number) => void;
}) {
  const t = useTheme();
  const eatHours = HOURS_PER_DAY - fastHours;
  const setFast = (h: number) => onChange(clampFastHours(h));

  const stepper = (label: string, hours: number, onStep: (delta: number) => void, color: string) => (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Label muted>{label}</Label>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button
          title="−"
          variant="secondary"
          onPress={() => onStep(-1)}
          disabled={hours <= MIN_FAST_HOURS}
          style={{ width: 44 }}
        />
        <Text style={{ fontSize: 22, fontWeight: '700', color, fontVariant: ['tabular-nums'] }}>
          {formatHours(hours)}
        </Text>
        <Button
          title="+"
          variant="secondary"
          onPress={() => onStep(1)}
          disabled={hours >= MAX_FAST_HOURS}
          style={{ width: 44 }}
        />
      </Row>
    </View>
  );

  return (
    <>
      <Text style={{ fontSize: 32, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>
        {fastHours}:{eatHours}
      </Text>

      <View
        accessibilityLabel={`${formatHours(fastHours)} fasting, ${formatHours(eatHours)} eating`}
        style={{ flexDirection: 'row', height: 14, borderRadius: radius.sm, overflow: 'hidden' }}
      >
        <View style={{ flex: fastHours, backgroundColor: t.fasting }} />
        <View style={{ flex: eatHours, backgroundColor: t.eating }} />
      </View>

      <Row style={{ gap: spacing.lg }}>
        {stepper('Fasting', fastHours, (d) => setFast(fastHours + d), t.fasting)}
        {stepper('Eating', eatHours, (d) => setFast(fastHours - d), t.eating)}
      </Row>

      <Row style={{ flexWrap: 'wrap' }}>
        {SCHEDULE_PRESETS.map((h) => (
          <Chip key={h} label={`${h}:${HOURS_PER_DAY - h}`} selected={fastHours === h} onPress={() => setFast(h)} />
        ))}
      </Row>
    </>
  );
}
