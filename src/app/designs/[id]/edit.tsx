import { useLocalSearchParams } from 'expo-router';
import { EditDesignScreen } from '@/features/designs/react';

export default function EditDesignRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <EditDesignScreen designId={id} />;
}
