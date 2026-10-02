import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { radius, spacing, useTheme } from '@/lib/theme';
import { Label } from './ui';

/** Tappable date + time value; Android shows the date dialog, then the time dialog. */
export function DateTimeField({
  label,
  value,
  onChange,
  maximumDate,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
}) {
  const t = useTheme();
  const [mode, setMode] = useState<'date' | 'time' | null>(null);

  const handle = (event: DateTimePickerEvent, picked?: Date) => {
    const current = mode;
    setMode(null);
    if (event.type !== 'set' || !picked) return;
    if (current === 'date') {
      const next = new Date(value);
      next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
      onChange(next);
      setMode('time');
    } else {
      const next = new Date(value);
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      onChange(next);
    }
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <Label muted>{label}</Label>
      <Pressable
        onPress={() => setMode('date')}
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
      {mode && (
        <DateTimePicker value={value} mode={mode} onChange={handle} maximumDate={mode === 'date' ? maximumDate : undefined} />
      )}
    </View>
  );
}
