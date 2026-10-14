import { useLocalSearchParams } from 'expo-router';

import { SavedMealForm } from '@/components/SavedMealForm';

export default function NewSavedMeal() {
  // Set when created from the meal picker: the new meal's dishes go into the meal being logged.
  const params = useLocalSearchParams<{ name?: string; for?: string }>();
  return <SavedMealForm name={params.name} deliverTo={params.for} />;
}
