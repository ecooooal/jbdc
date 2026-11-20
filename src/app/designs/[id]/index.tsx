import { useLocalSearchParams } from "expo-router";
import { DesignDetailScreen } from "@/features/designs/react";

export default function DesignDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <DesignDetailScreen designId={id} />;
}
