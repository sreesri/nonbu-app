import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useMe, useUpdateMe } from '@/api/hooks';
import type { Goals } from '@/api/types';
import { deviceTimezone, useAuth } from '@/auth/AuthProvider';
import { Body, Button, Card, Chip, ErrorText, Field, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { API_URL } from '@/lib/config';
import { formatHours } from '@/lib/format';
import { radius, spacing, useTheme } from '@/lib/theme';

type NutritionGoal = 'daily_calories' | 'protein_g' | 'carbs_g' | 'fat_g';

const GOAL_FIELDS: { key: NutritionGoal; label: string }[] = [
  { key: 'daily_calories', label: 'Calories (kcal)' },
  { key: 'protein_g', label: 'Protein (g)' },
  { key: 'carbs_g', label: 'Carbs (g)' },
  { key: 'fat_g', label: 'Fat (g)' },
];

const HOURS_PER_DAY = 24;
// Mirrors the backend's bounds: the schedule always leaves at least an hour to fast and to eat.
const MIN_FAST_HOURS = 1;
const MAX_FAST_HOURS = HOURS_PER_DAY - 1;
const SCHEDULE_PRESETS = [12, 14, 16, 18, 20, 23];

const clampFastHours = (h: number) => Math.min(Math.max(h, MIN_FAST_HOURS), MAX_FAST_HOURS);

function UpdatesCard() {
  const { isChecking, isDownloading, isUpdatePending, checkError, downloadError } = Updates.useUpdates();
  const [status, setStatus] = useState<string | null>(null);

  const check = async () => {
    setStatus(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setStatus("You're on the latest version.");
        return;
      }
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  };

  const running = Updates.createdAt ? Updates.createdAt.toLocaleString() : 'embedded bundle';
  return (
    <Card>
      <Label muted>App</Label>
      <Body>
        Version {Application.nativeApplicationVersion} ({Application.nativeBuildVersion})
      </Body>
      <Body muted style={{ fontSize: 13 }}>
        Channel {Updates.channel ?? 'dev'} · update {Updates.updateId?.slice(0, 8) ?? '—'} · {running}
      </Body>
      <Body muted style={{ fontSize: 13 }}>Runtime {Updates.runtimeVersion?.slice(0, 12) ?? '—'}</Body>
      <Body muted style={{ fontSize: 13 }}>API {API_URL}</Body>
      {Updates.isEnabled && !__DEV__ ? (
        <Button
          title={isUpdatePending ? 'Restart to update' : 'Check for updates'}
          variant="secondary"
          loading={isChecking || isDownloading}
          onPress={isUpdatePending ? () => Updates.reloadAsync() : check}
        />
      ) : (
        <Body muted style={{ fontSize: 13 }}>OTA updates are disabled in development builds.</Body>
      )}
      {status ? <Body muted>{status}</Body> : null}
      <ErrorText error={checkError ?? downloadError} />
    </Card>
  );
}

/** Fasting:eating split of the day. Editing either side adjusts the other so they total 24h. */
function FastingScheduleCard({ initial }: { initial: Goals }) {
  const t = useTheme();
  const update = useUpdateMe();
  const [fastHours, setFastHours] = useState(initial.default_fast_hours);
  const [saved, setSaved] = useState(false);
  const eatHours = HOURS_PER_DAY - fastHours;
  const dirty = fastHours !== initial.default_fast_hours;

  const setFast = (h: number) => {
    setSaved(false);
    setFastHours(clampFastHours(h));
  };

  const save = () =>
    update.mutate({ goals: { default_fast_hours: fastHours } }, { onSuccess: () => setSaved(true) });

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
    <Card>
      <Label muted>Fasting schedule</Label>
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
          <Chip
            key={h}
            label={`${h}:${HOURS_PER_DAY - h}`}
            selected={fastHours === h}
            onPress={() => setFast(h)}
          />
        ))}
      </Row>

      <ErrorText error={update.error} />
      <Button
        title={saved ? 'Saved ✓' : 'Save schedule'}
        onPress={save}
        loading={update.isPending}
        disabled={!dirty}
      />
    </Card>
  );
}

function GoalsCard({ initial }: { initial: Goals }) {
  const update = useUpdateMe();
  const [goals, setGoals] = useState<Record<string, string>>(() =>
    Object.fromEntries(GOAL_FIELDS.map(({ key }) => [key, initial[key] == null ? '' : String(initial[key])])),
  );
  const [saved, setSaved] = useState(false);

  const saveGoals = () => {
    const patch = Object.fromEntries(
      GOAL_FIELDS.map(({ key }) => {
        const n = Number(goals[key]?.replace(',', '.'));
        return [key, goals[key]?.trim() && !Number.isNaN(n) ? n : null];
      }),
    );
    update.mutate({ goals: patch }, { onSuccess: () => setSaved(true) });
  };

  return (
    <Card>
      <Label muted>Daily goals</Label>
      {GOAL_FIELDS.map(({ key, label }) => (
        <Field
          key={key}
          label={label}
          value={goals[key] ?? ''}
          onChangeText={(v) => {
            setSaved(false);
            setGoals((g) => ({ ...g, [key]: v }));
          }}
          keyboardType="decimal-pad"
          placeholder="Not set"
        />
      ))}
      <ErrorText error={update.error} />
      <Button title={saved ? 'Saved ✓' : 'Save goals'} onPress={saveGoals} loading={update.isPending} />
    </Card>
  );
}

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const me = useMe();
  const update = useUpdateMe();
  const tz = deviceTimezone();
  const user = me.data;

  return (
    <Screen>
      <Title>Settings</Title>
      <ErrorText error={me.error ?? update.error} />

      {user ? (
        <>
          <Card>
            <Row>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : null}
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '600' }}>{user.name ?? user.email}</Body>
                <Body muted>{user.email}</Body>
              </View>
            </Row>
            <Body muted>Timezone {user.timezone}</Body>
            {user.timezone !== tz ? (
              <Button
                title={`Use device timezone (${tz})`}
                variant="secondary"
                onPress={() => update.mutate({ timezone: tz })}
              />
            ) : null}
          </Card>
          <FastingScheduleCard initial={user.goals} />
          <GoalsCard initial={user.goals} />
        </>
      ) : (
        <Loading />
      )}

      <UpdatesCard />

      <Button title="Sign out" variant="danger" onPress={signOut} />
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
