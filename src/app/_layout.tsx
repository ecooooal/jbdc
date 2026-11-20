import { PortalHost } from "@rn-primitives/portal";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { DatabaseProvider } from "@/features/database/react";
import "../global.css";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <KeyboardProvider>
        <ThemeProvider value={DarkTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="designs/new" options={{ presentation: "modal" }} />
            <Stack.Screen name="designs/[id]/index" />
            <Stack.Screen name="designs/[id]/edit" />
            <Stack.Screen name="designs/[id]/history" />
          </Stack>
          <PortalHost />
        </ThemeProvider>
      </KeyboardProvider>
    </DatabaseProvider>
  );
}
