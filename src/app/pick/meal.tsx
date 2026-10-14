import { useLocalSearchParams } from 'expo-router';

import { SavedMealPicker } from '@/components/LibraryPicker';

export default function PickSavedMeal() {
  const params = useLocalSearchParams<{ for: string }>();
  return <SavedMealPicker deliverTo={params.for} />;
}
