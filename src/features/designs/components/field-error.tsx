import { Text } from "@/shared/components/ui/text";

/**
 * One refusal under the field it names. It is live, so a write the owner only
 * sees after leaving a row is still announced; on Android the polite region
 * waits for speech to finish, and on iOS the alert role speaks it on appear.
 */
export function FieldError({ message }: { message: string }) {
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="text-destructive text-sm"
    >
      {message}
    </Text>
  );
}
