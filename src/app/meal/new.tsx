import { useLocalSearchParams } from 'expo-router';

import { MealForm } from '@/components/MealForm';

export default function NewMeal() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <MealForm date={date} />;
}
