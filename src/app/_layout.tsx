import { PortalHost } from '@rn-primitives/portal';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { DatabaseProvider } from '@/features/database/react';
import '../global.css';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <PortalHost />
      </ThemeProvider>
    </DatabaseProvider>
  );
}
