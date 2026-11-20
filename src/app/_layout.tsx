import { PortalHost } from "@rn-primitives/portal";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { useState } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { DatabaseProvider } from "@/features/database/react";
import { createExpoImageStore } from "@/features/images/expo";
import { ImageStoreProvider } from "@/features/images/react";
import "../global.css";

export default function RootLayout() {
  const [imageStore] = useState(createExpoImageStore);

  return (
    <DatabaseProvider>
      <ImageStoreProvider store={imageStore}>
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
      </ImageStoreProvider>
    </DatabaseProvider>
  );
}
