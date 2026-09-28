import { useLocalSearchParams } from 'expo-router';

import { useFoodEntry } from '@/api/hooks';
import { FoodForm } from '@/components/FoodForm';
import { ErrorText, Loading, Screen } from '@/components/ui';

export default function EditFood() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useFoodEntry(Number(id));

  if (entry.data) return <FoodForm entry={entry.data} />;
  return <Screen safeTop={false}>{entry.error ? <ErrorText error={entry.error} /> : <Loading />}</Screen>;
}
