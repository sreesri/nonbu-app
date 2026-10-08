import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { useDishes, useSavedMeals } from '@/api/hooks';
import { isUnsynced } from '@/api/writes';
import { Body, Button, Card, ErrorText, Label, Loading, Row, Screen } from '@/components/ui';
import { round } from '@/lib/format';
import { formatMacros, formatServing } from '@/lib/nutrition';
import { spacing } from '@/lib/theme';

function LibraryRow({ title, detail, kcal }: { title: string; detail: string; kcal: number | null }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
      <View style={{ flex: 1 }}>
        <Body>{title}</Body>
        <Body muted style={{ fontSize: 13 }}>
          {detail}
        </Body>
      </View>
      <Body style={{ fontWeight: '600' }}>{round(kcal)}</Body>
    </Row>
  );
}

/** Rows created offline can't be opened until the server has given them an id. */
function EditLink({ id, href, children }: { id: number; href: `/library/${'dish' | 'meal'}/[id]`; children: ReactNode }) {
  if (isUnsynced({ id })) return children;
  return (
    <Link href={{ pathname: href, params: { id: String(id) } }} asChild>
      <Pressable accessibilityRole="button">{children}</Pressable>
    </Link>
  );
}

export default function LibraryScreen() {
  const dishes = useDishes();
  const meals = useSavedMeals();

  return (
    <Screen
      safeTop={false}
      refreshControl={
        <RefreshControl
          refreshing={dishes.isRefetching || meals.isRefetching}
          onRefresh={() => {
            dishes.refetch();
            meals.refetch();
          }}
        />
      }
    >
      <ErrorText error={dishes.error ?? meals.error} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label muted>Saved meals</Label>
          <Label muted>kcal</Label>
        </Row>
        {meals.isPending ? (
          <Loading />
        ) : meals.data?.length ? (
          meals.data.map((m) => (
            <EditLink key={m.id} id={m.id} href="/library/meal/[id]">
              <LibraryRow
                title={m.name}
                detail={`${isUnsynced(m) ? 'Syncing… · ' : ''}${m.items.map((i) => i.dish.name).join(', ')}`}
                kcal={m.totals.calories}
              />
            </EditLink>
          ))
        ) : (
          <Body muted>Save a combination of dishes you eat often, then log it in one tap.</Body>
        )}
        <Button title="+ New saved meal" variant="secondary" onPress={() => router.push('/library/meal/new')} />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label muted>Dishes · per serving</Label>
          <Label muted>kcal</Label>
        </Row>
        {dishes.isPending ? (
          <Loading />
        ) : dishes.data?.length ? (
          dishes.data.map((d) => {
            const serving = formatServing(d.quantity, d.unit);
            return (
              <EditLink key={d.id} id={d.id} href="/library/dish/[id]">
                <LibraryRow
                  title={d.name}
                  detail={`${isUnsynced(d) ? 'Syncing… · ' : ''}${serving ? `${serving} · ` : ''}${formatMacros(d)}`}
                  kcal={d.calories}
                />
              </EditLink>
            );
          })
        ) : (
          <Body muted>No dishes yet. Add the dishes you eat, with their nutrition per serving.</Body>
        )}
        <Button title="+ New dish" variant="secondary" onPress={() => router.push('/library/dish/new')} />
      </Card>
    </Screen>
  );
}
