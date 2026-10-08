import { useLocalSearchParams } from 'expo-router';

import { useSavedMeals } from '@/api/hooks';
import { SavedMealForm } from '@/components/SavedMealForm';
import { Body, ErrorText, Loading, Screen } from '@/components/ui';

export default function EditSavedMeal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meals = useSavedMeals();
  const meal = meals.data?.find((m) => m.id === Number(id));

  if (meal) return <SavedMealForm meal={meal} />;
  return (
    <Screen safeTop={false}>
      {meals.error ? <ErrorText error={meals.error} /> : meals.isPending ? <Loading /> : <Body muted>Meal not found.</Body>}
    </Screen>
  );
}
