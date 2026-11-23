import { CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond";
import { DMMono_400Regular } from "@expo-google-fonts/dm-mono";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { PortalHost } from "@rn-primitives/portal";
import { useFonts } from "expo-font";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { DatabaseProvider } from "@/features/database/react";
import { createExpoImagePicker, createExpoImageStore } from "@/features/images/expo";
import { ImagePickerProvider, ImageStoreProvider } from "@/features/images/react";
import { DETAIL_ARRIVAL } from "@/shared/lib/motion";
import "../global.css";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Fast-refresh reloads can race the splash; keeping it visible is best-effort.
});

export default function RootLayout() {
  const [imageStore] = useState(createExpoImageStore);
  const [imagePicker] = useState(createExpoImagePicker);

  // The ledger's three voices: Cormorant Garamond titles, DM Sans text, DM Mono data.
  const [fontsLoaded, fontError] = useFonts([
    {
      fontFamily: "DM Sans",
      fontDefinitions: [
        { path: DMSans_400Regular, weight: 400 },
        { path: DMSans_500Medium, weight: 500 },
        { path: DMSans_700Bold, weight: 700 },
      ],
    },
    {
      fontFamily: "Cormorant Garamond",
      fontDefinitions: [{ path: CormorantGaramond_600SemiBold, weight: 600 }],
    },
    {
      fontFamily: "DM Mono",
      fontDefinitions: [{ path: DMMono_400Regular, weight: 400 }],
    },
  ]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <DatabaseProvider>
      <ImageStoreProvider store={imageStore}>
        <ImagePickerProvider picker={imagePicker}>
          <KeyboardProvider>
            <ThemeProvider value={DarkTheme}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="designs/new" options={{ presentation: "modal" }} />
                <Stack.Screen name="designs/[id]/index" options={DETAIL_ARRIVAL.screen} />
                <Stack.Screen name="designs/[id]/edit" />
                <Stack.Screen name="designs/[id]/history" />
              </Stack>
              <PortalHost />
            </ThemeProvider>
          </KeyboardProvider>
        </ImagePickerProvider>
      </ImageStoreProvider>
    </DatabaseProvider>
  );
}
