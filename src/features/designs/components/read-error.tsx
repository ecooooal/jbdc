import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";

/**
 * A read that failed: first what it means for the Owner, in her words, then the
 * underlying message as data. The raw line stays because it is the only
 * diagnostic the app can hand on, but it never leads.
 */
export function ReadError({ message, error }: { message: string; error: Error }) {
  return (
    <View className="gap-1">
      <Text className="text-destructive text-sm" accessibilityRole="alert">
        {message}
      </Text>
      <Text className="text-muted-foreground font-mono text-xs leading-4">{error.message}</Text>
    </View>
  );
}
