import { useLocalSearchParams } from "expo-router";
import { HistoryScreen } from "@/features/history/react";

export default function DesignHistoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <HistoryScreen designId={id} />;
}
