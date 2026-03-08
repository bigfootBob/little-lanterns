import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Castoro_400Regular, Castoro_400Regular_Italic } from '@expo-google-fonts/castoro';
import { Quicksand_300Light, Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold, useFonts } from '@expo-google-fonts/quicksand';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebaseConfig';

GoogleSignin.configure({
  webClientId: '551704278731-mcrfljd8ullhn3prljlqamhdm1g05132.apps.googleusercontent.com',
});

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

  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      if (loaded || error) {
        try {
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
          setAuthInitialized(true);
        } catch (e) {
          console.error("Failed to authenticate anonymously:", e);
          // Allow app to load anyway so it doesn't hard lock
          setAuthInitialized(true);
        }
        SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, [loaded, error]);

  if ((!loaded && !error) || !authInitialized) {
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
