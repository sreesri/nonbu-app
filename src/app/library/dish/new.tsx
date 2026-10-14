import { useLocalSearchParams } from 'expo-router';

import { DishForm } from '@/components/DishForm';

export default function NewDish() {
  // Set when created from a picker: `name` is what was searched for, and `for` is the meal
  // the new dish goes into once saved.
  const params = useLocalSearchParams<{ name?: string; for?: string }>();
  return <DishForm name={params.name} deliverTo={params.for} />;
}
