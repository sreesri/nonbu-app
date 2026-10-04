import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { useMe, useUpdateMe } from '@/api/hooks';
import type { Goals } from '@/api/types';
import { deviceTimezone, useAuth } from '@/auth/AuthProvider';
import { FastingScheduleEditor } from '@/components/FastingScheduleEditor';
import { GoalFields } from '@/components/GoalFields';
import { Body, Button, Card, ErrorText, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { API_URL } from '@/lib/config';
import { goalDrafts, parseGoalDrafts } from '@/lib/goals';
import { spacing } from '@/lib/theme';

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

function FastingScheduleCard({ initial }: { initial: Goals }) {
  const update = useUpdateMe();
  const [fastHours, setFastHours] = useState(initial.default_fast_hours);
  const [saved, setSaved] = useState(false);
  const dirty = fastHours !== initial.default_fast_hours;

  const save = () =>
    update.mutate({ goals: { default_fast_hours: fastHours } }, { onSuccess: () => setSaved(true) });

  return (
    <Card>
      <Label muted>Fasting schedule</Label>
      <FastingScheduleEditor
        fastHours={fastHours}
        onChange={(h) => {
          setSaved(false);
          setFastHours(h);
        }}
      />
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
  const [drafts, setDrafts] = useState(() => goalDrafts(initial));
  const [saved, setSaved] = useState(false);

  const saveGoals = () =>
    update.mutate({ goals: parseGoalDrafts(drafts) }, { onSuccess: () => setSaved(true) });

  return (
    <Card>
      <Label muted>Daily goals</Label>
      <GoalFields
        drafts={drafts}
        onChange={(key, value) => {
          setSaved(false);
          setDrafts((d) => ({ ...d, [key]: value }));
        }}
      />
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
