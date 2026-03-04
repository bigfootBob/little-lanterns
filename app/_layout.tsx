import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Castoro_400Regular, Castoro_400Regular_Italic } from '@expo-google-fonts/castoro';
import { Quicksand_300Light, Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold, useFonts } from '@expo-google-fonts/quicksand';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Castoro_400Regular,
    Castoro_400Regular_Italic,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  const appContent = (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', width: '100%' }}>
        <View style={{ width: '100%', maxWidth: 480, height: '100%', overflow: 'hidden' }}>
          {appContent}
        </View>
      </View>
    );
  }

  return appContent;
}
