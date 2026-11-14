import { PortalHost } from '@rn-primitives/portal';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { DatabaseProvider } from '@/features/database/react';
import '../global.css';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="designs/new" options={{ presentation: 'modal' }} />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </DatabaseProvider>
  );
}
