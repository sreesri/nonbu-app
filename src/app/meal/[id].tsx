import { useLocalSearchParams } from 'expo-router';

import { useMeal } from '@/api/hooks';
import { MealForm } from '@/components/MealForm';
import { ErrorText, Loading, Screen } from '@/components/ui';

export default function EditMeal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meal = useMeal(Number(id));

  if (meal.data) return <MealForm meal={meal.data} />;
  return <Screen safeTop={false}>{meal.error ? <ErrorText error={meal.error} /> : <Loading />}</Screen>;
}
