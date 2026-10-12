import { useLocalSearchParams } from 'expo-router';

import { DishForm } from '@/components/DishForm';

export default function NewDish() {
  // Set when the dish is created from a search that found nothing.
  const { name } = useLocalSearchParams<{ name?: string }>();
  return <DishForm name={name} />;
}
