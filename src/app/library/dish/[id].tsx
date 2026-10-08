import { useLocalSearchParams } from 'expo-router';

import { useDishes } from '@/api/hooks';
import { DishForm } from '@/components/DishForm';
import { Body, ErrorText, Loading, Screen } from '@/components/ui';

export default function EditDish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dishes = useDishes();
  const dish = dishes.data?.find((d) => d.id === Number(id));

  if (dish) return <DishForm dish={dish} />;
  return (
    <Screen safeTop={false}>
      {dishes.error ? <ErrorText error={dishes.error} /> : dishes.isPending ? <Loading /> : <Body muted>Dish not found.</Body>}
    </Screen>
  );
}
