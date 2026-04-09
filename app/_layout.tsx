import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Castoro_400Regular, Castoro_400Regular_Italic } from '@expo-google-fonts/castoro';
import { Quicksand_300Light, Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold, useFonts } from '@expo-google-fonts/quicksand';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInAnonymously, signInWithCredential } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { ChildContext } from '../hooks/use-child';
import { auth, db } from '../firebaseConfig';

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
    const router = useRouter();
    const [loaded, error] = useFonts({
        Quicksand_300Light,
        Quicksand_400Regular,
        Quicksand_500Medium,
        Quicksand_600SemiBold,
        Quicksand_700Bold,
        Castoro_400Regular,
        Castoro_400Regular_Italic,
    });

    const [appReady, setAppReady] = useState(false);
    const [childId, setChildId] = useState<string | null>(null);
    const [childName, setChildName] = useState<string | null>(null);
    const [inviteCode, setInviteCode] = useState<string | null>(null);

    useEffect(() => {
        const initializeApp = async () => {
            if (!loaded && !error) return;

            // 1. Auth
            try {
                if (!auth.currentUser) {
                    let signedIn = false;
                    try {
                        const userInfo = await GoogleSignin.signInSilently();
                        if (userInfo.data?.idToken) {
                            const credential = GoogleAuthProvider.credential(userInfo.data.idToken);
                            await signInWithCredential(auth, credential);
                            signedIn = true;
                        }
                    } catch {
                        // No prior Google session — fall through to anonymous
                    }
                    if (!signedIn) {
                        await signInAnonymously(auth);
                    }
                }
            } catch (e) {
                console.error('Failed to authenticate:', e);
            }

            // 2. Child profile lookup
            try {
                const uid = auth.currentUser?.uid;
                if (uid) {
                    let foundId: string | null = null;

                    // Check AsyncStorage cache first
                    const cachedId = await AsyncStorage.getItem('@child_id');
                    if (cachedId) {
                        const snap = await getDoc(doc(db, 'children', cachedId));
                        if (snap.exists() && (snap.data().caregivers as string[]).includes(uid)) {
                            foundId = cachedId;
                            setChildId(cachedId);
                            setChildName(snap.data().name);
                            setInviteCode(snap.data().inviteCode);
                        } else {
                            await AsyncStorage.removeItem('@child_id');
                        }
                    }

                    // If not in cache, query Firestore
                    if (!foundId) {
                        const q = query(collection(db, 'children'), where('caregivers', 'array-contains', uid));
                        const result = await getDocs(q);
                        if (!result.empty) {
                            const d = result.docs[0];
                            await AsyncStorage.setItem('@child_id', d.id);
                            setChildId(d.id);
                            setChildName(d.data().name);
                            setInviteCode(d.data().inviteCode);
                            foundId = d.id;
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load child profile:', e);
            }

            setAppReady(true);
            SplashScreen.hideAsync();
        };

        initializeApp();
    }, [loaded, error]);

    // Redirect to setup if no child profile found
    useEffect(() => {
        if (appReady && childId === null) {
            router.replace('/child-setup' as any);
        }
    }, [appReady, childId]);

    const handleSetChild = async (id: string, name: string, code: string) => {
        await AsyncStorage.setItem('@child_id', id);
        setChildId(id);
        setChildName(name);
        setInviteCode(code);
    };

    if (!appReady) return null;

    const appContent = (
        <ChildContext.Provider value={{ childId, childName, inviteCode, setChild: handleSetChild }}>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="child-setup" options={{ headerShown: false }} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
                <StatusBar style="auto" />
            </ThemeProvider>
        </ChildContext.Provider>
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
