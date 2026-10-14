import { useLocalSearchParams } from 'expo-router';

import { DishPicker } from '@/components/LibraryPicker';

export default function PickDish() {
  const params = useLocalSearchParams<{ for: string; synced?: string }>();
  return <DishPicker deliverTo={params.for} syncedOnly={params.synced === '1'} />;
}
