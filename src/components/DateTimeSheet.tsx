import { isSameDay } from 'date-fns';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  HOURS_12,
  MINUTES,
  clampDate,
  dayLabel,
  dayOptions,
  fromParts,
  toParts,
  type WheelParts,
} from '@/lib/dateWheel';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Body, Button, ErrorText, Row } from './ui';
import { WHEEL_ITEM_HEIGHT, WHEEL_VISIBLE_ROWS, WheelColumn } from './WheelColumn';

const MERIDIEMS = ['AM', 'PM'];
const HOUR_LABELS = HOURS_12.map(String);
const MINUTE_LABELS = MINUTES.map((m) => String(m).padStart(2, '0'));

type SheetProps = {
  title: string;
  subtitle?: string;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  /** What the chosen time would mean, shown under the wheels (e.g. the fast's goal time). */
  describe?: (date: Date) => ReactNode;
  saving?: boolean;
  error?: unknown;
  onCancel: () => void;
  onSave: (date: Date) => void;
};

/** Bottom sheet with day / hour / minute / AM-PM wheels. Nothing is applied until Save. */
export function DateTimeSheet({ visible, ...props }: SheetProps & { visible: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={props.onCancel}>
      {/* Mounted per opening so the draft starts from the current value each time. */}
      {visible ? <SheetBody {...props} /> : null}
    </Modal>
  );
}

function SheetBody({
  title,
  subtitle,
  value,
  minimumDate,
  maximumDate,
  describe,
  saving,
  error,
  onCancel,
  onSave,
}: SheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [days] = useState(() => dayOptions(value, minimumDate, maximumDate));
  const [draft, setDraft] = useState(() => clampDate(value, minimumDate, maximumDate));

  const parts = toParts(draft);
  const today = new Date();
  const update = (patch: Partial<WheelParts>) =>
    setDraft(clampDate(fromParts({ ...parts, ...patch }), minimumDate, maximumDate));

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        onPress={onCancel}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.sheet.scrim }}
      />
      <View
        style={{
          backgroundColor: t.sheet.bg,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
      >
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.sheet.handle }} />
        <View style={{ gap: spacing.xs }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600', color: t.text }}>
            {title}
          </Text>
          {subtitle ? <Body muted>{subtitle}</Body> : null}
        </View>

        <View style={{ borderRadius: radius.md, backgroundColor: t.wheel.bg, paddingHorizontal: spacing.sm }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: spacing.sm,
              right: spacing.sm,
              top: WHEEL_ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_ROWS / 2),
              height: WHEEL_ITEM_HEIGHT,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: t.wheel.bandBorder,
              backgroundColor: t.wheel.band,
            }}
          />
          <Row style={{ gap: 0 }}>
            <WheelColumn
              label="Day"
              flex={1.8}
              items={days.map((d) => dayLabel(d, today))}
              index={Math.max(days.findIndex((d) => isSameDay(d, parts.day)), 0)}
              onChange={(i) => update({ day: days[i] })}
            />
            <WheelColumn
              label="Hour"
              items={HOUR_LABELS}
              index={HOURS_12.indexOf(parts.hour12)}
              onChange={(i) => update({ hour12: HOURS_12[i] })}
            />
            <WheelColumn
              label="Minute"
              items={MINUTE_LABELS}
              index={parts.minute}
              onChange={(i) => update({ minute: MINUTES[i] })}
            />
            <WheelColumn
              label="AM or PM"
              items={MERIDIEMS}
              index={parts.pm ? 1 : 0}
              onChange={(i) => update({ pm: i === 1 })}
            />
          </Row>
        </View>

        {describe ? (
          <View style={{ borderRadius: radius.md, backgroundColor: t.background, padding: spacing.md }}>
            {describe(draft)}
          </View>
        ) : null}
        <ErrorText error={error} />

        <Row>
          <Button title="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
          <Button title="Save" onPress={() => onSave(draft)} loading={saving} style={{ flex: 2 }} />
        </Row>
      </View>
    </View>
  );
}
