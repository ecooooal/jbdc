import { useLocalSearchParams } from 'expo-router';
import { EditDesignScreen } from '@/features/designs/react';

export default function EditDesignRoute() {
  const { id, variant } = useLocalSearchParams<{ id: string; variant?: string }>();

  return <EditDesignScreen designId={id} variant={variant} />;
}
