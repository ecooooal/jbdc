import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import '../global.css'

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack />
      <PortalHost />
    </ThemeProvider>
  );
}
