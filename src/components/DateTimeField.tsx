import { format } from 'date-fns';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { radius, spacing, useTheme } from '@/lib/theme';
import { DateTimeSheet } from './DateTimeSheet';
import { Label } from './ui';

/** Tappable date + time value; opens the wheel sheet and reports the value only on Save. */
export function DateTimeField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  describe,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  describe?: (date: Date) => ReactNode;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: spacing.xs }}>
      <Label muted>{label}</Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${format(value, 'EEEE d MMMM, h:mm a')}`}
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: t.input.border,
          backgroundColor: t.input.bg,
          borderRadius: radius.sm,
          padding: spacing.md,
        }}
      >
        <Text style={{ color: t.input.fg, fontSize: 16 }}>{format(value, 'EEE d MMM yyyy, h:mm a')}</Text>
      </Pressable>
      <DateTimeSheet
        visible={open}
        title={label}
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        describe={describe}
        onCancel={() => setOpen(false)}
        onSave={(date) => {
          setOpen(false);
          onChange(date);
        }}
      />
    </View>
  );
}
