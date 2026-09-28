import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Body, Button, ErrorText, Screen } from '@/components/ui';
import { spacing, useTheme } from '@/lib/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const onPress = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: t.text }}>Nonbu</Text>
          <Body muted>Track your fasts and what you eat.</Body>
        </View>
        <Button title="Sign in with Google" onPress={onPress} loading={busy} />
        <ErrorText error={error} />
      </View>
    </Screen>
  );
}
