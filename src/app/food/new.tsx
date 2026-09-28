import { useLocalSearchParams } from 'expo-router';

import { FoodForm } from '@/components/FoodForm';

export default function NewFood() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <FoodForm date={date} />;
}
