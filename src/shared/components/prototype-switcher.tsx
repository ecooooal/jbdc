/**
 * PROTOTYPE ONLY. The floating variant switcher for a UI prototype. Hidden in
 * production, and deleted with the prototype it belongs to.
 */
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';

/**
 * Cycles `variants` and writes the choice back to the route, so the address
 * stays shareable and a reload keeps the variant. The shell sits above the
 * content and is deliberately styled unlike the app.
 */
export function PrototypeSwitcher<T extends string>({
  variants,
  current,
  label,
}: {
  variants: readonly T[];
  current: T;
  label: string;
}) {
  if (!__DEV__) return null;

  const index = variants.indexOf(current);
  const step = (offset: number) => {
    const next = variants[(index + offset + variants.length) % variants.length]!;

    router.setParams({ variant: next });
  };

  return (
    <View
      className="absolute bottom-8 left-0 right-0 items-center"
      pointerEvents="box-none"
    >
      <View className="bg-foreground flex-row items-center gap-1 rounded-full px-1 py-1 shadow-lg">
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Previous variant"
          onPress={() => step(-1)}
        >
          <Icon as={ChevronLeft} className="text-background" />
        </Button>
        <Text className="text-background px-2 text-sm font-medium">
          {current} · {label}
        </Text>
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Next variant"
          onPress={() => step(1)}
        >
          <Icon as={ChevronRight} className="text-background" />
        </Button>
      </View>
    </View>
  );
}
