import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { useState } from 'react';
import { ImageBackground, Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useChild } from '../hooks/use-child';
import { auth, db } from '../firebaseConfig';

type Tab = 'create' | 'join';

// 8 characters from a 32-character alphabet (excludes ambiguous chars like 0/O, 1/I)
// gives ~1.1 trillion combinations, making brute-force guessing infeasible.
const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'LL-';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
};

export default function ChildSetupScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { setChild } = useChild();

    const [tab, setTab] = useState<Tab>('create');
    const [childName, setChildName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [pendingChildId, setPendingChildId] = useState<string | null>(null);
    const [checkingApproval, setCheckingApproval] = useState(false);

    const isLinkedToGoogle = auth.currentUser?.providerData.some(
        (p) => p.providerId === 'google.com'
    ) ?? false;

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            if (!userInfo.data?.idToken) throw new Error('No ID token returned.');

            const credential = GoogleAuthProvider.credential(userInfo.data.idToken);
            await signInWithCredential(auth, credential);

            // Check if this Google account already has a child profile
            const uid = auth.currentUser!.uid;
            const q = query(collection(db, 'children'), where('caregivers', 'array-contains', uid));
            const result = await getDocs(q);

            if (!result.empty) {
                // Returning user — restore their profile and go straight to the app
                const d = result.docs[0];
                await AsyncStorage.setItem('@child_id', d.id);
                await setChild(d.id, d.data().name, d.data().inviteCode);
                router.replace('/(tabs)');
            }
            // Otherwise stay on this screen so they can create/join a profile
        } catch (e: any) {
            if (e.code !== 'SIGN_IN_CANCELLED') {
                setError(e.message);
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleCreate = async () => {
        const name = childName.trim();
        if (!name) { setError('Please enter a first name.'); return; }
        if (!auth.currentUser) { setError('Not signed in. Please restart the app.'); return; }

        setLoading(true);
        setError('');
        try {
            const uid = auth.currentUser.uid;
            const code = generateInviteCode();

            const docRef = await addDoc(collection(db, 'children'), {
                name,
                inviteCode: code,
                caregivers: [uid],
                createdBy: uid,
                createdAt: serverTimestamp(),
            });

            await migrateExistingData(uid, docRef.id);
            await setChild(docRef.id, name, code);
            router.replace('/(tabs)');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        const code = inviteCode.trim().toUpperCase();
        if (!code) { setError('Please enter an invite code.'); return; }
        if (!auth.currentUser) { setError('Not signed in. Please restart the app.'); return; }

        setLoading(true);
        setError('');
        try {
            const uid = auth.currentUser.uid;
            const q = query(collection(db, 'children'), where('inviteCode', '==', code));
            const result = await getDocs(q);

            if (result.empty) {
                setError('Invite code not found. Check with the primary caregiver.');
                setLoading(false);
                return;
            }

            const childDoc = result.docs[0];
            const data = childDoc.data();

            if ((data.caregivers as string[]).includes(uid)) {
                // Already an approved caregiver for this child — go straight in.
                await AsyncStorage.setItem('@child_id', childDoc.id);
                await setChild(childDoc.id, data.name, data.inviteCode);
                router.replace('/(tabs)');
                return;
            }

            // Knowing the code is no longer enough to gain access on its own.
            // Record a join request that an existing caregiver must approve
            // before this account is added to the caregivers list.
            await setDoc(doc(db, 'children', childDoc.id, 'joinRequests', uid), {
                uid,
                requesterEmail: auth.currentUser.email ?? null,
                requestedAt: serverTimestamp(),
            });

            setPendingChildId(childDoc.id);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckApproval = async () => {
        if (!pendingChildId || !auth.currentUser) return;
        setCheckingApproval(true);
        setError('');
        try {
            const uid = auth.currentUser.uid;
            const snap = await getDoc(doc(db, 'children', pendingChildId));
            const data = snap.data();

            if (data && (data.caregivers as string[]).includes(uid)) {
                await AsyncStorage.setItem('@child_id', pendingChildId);
                await setChild(pendingChildId, data.name, data.inviteCode);
                router.replace('/(tabs)');
                return;
            }

            setError('Still waiting for a caregiver to approve your request.');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setCheckingApproval(false);
        }
    };

    return (
        <ImageBackground
            source={require('../assets/images/LittleLanterns-bg.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View
                        className="flex-1 bg-black/65 justify-center px-6"
                        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
                    >
                        <Text className="text-white text-3xl font-castoro text-center mb-2">Little Lanterns</Text>
                        <Text className="text-white/70 text-sm font-castoro-italic text-center mb-8">
                            Let&apos;s get set up for your family
                        </Text>

                        {/* Google Sign-In */}
                        {!isLinkedToGoogle ? (
                            <View className="items-center mb-8">
                                <GoogleSigninButton
                                    size={GoogleSigninButton.Size.Wide}
                                    color={GoogleSigninButton.Color.Dark}
                                    onPress={handleGoogleSignIn}
                                    disabled={googleLoading}
                                />
                                {googleLoading ? (
                                    <Text className="text-gray-400 text-xs font-quicksand mt-2">Signing in...</Text>
                                ) : (
                                    <Text className="text-gray-400 text-xs font-quicksand mt-2">
                                        Sign in to restore an existing account
                                    </Text>
                                )}
                                <View className="flex-row items-center w-full mt-6 mb-2">
                                    <View className="flex-1 h-px bg-gray-700" />
                                    <Text className="text-gray-400 font-quicksand text-xs mx-3">or set up a new profile</Text>
                                    <View className="flex-1 h-px bg-gray-700" />
                                </View>
                            </View>
                        ) : (
                            <View className="bg-green-900/30 border border-green-700 rounded-xl p-3 mb-6 items-center">
                                <Text className="text-green-400 text-sm font-quicksand">
                                    Signed in as {auth.currentUser?.email}
                                </Text>
                            </View>
                        )}

                        {/* Tab toggle */}
                        <View className="flex-row bg-[#1a1a1a] rounded-xl p-1 mb-6 border border-gray-700">
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-lg items-center ${tab === 'create' ? 'bg-lantern-marine' : 'bg-transparent'}`}
                                onPress={() => { setTab('create'); setError(''); }}
                            >
                                <Text className={`font-bold font-quicksand ${tab === 'create' ? 'text-white' : 'text-gray-400'}`}>
                                    New Profile
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-lg items-center ${tab === 'join' ? 'bg-lantern-marine' : 'bg-transparent'}`}
                                onPress={() => { setTab('join'); setError(''); }}
                            >
                                <Text className={`font-bold font-quicksand ${tab === 'join' ? 'text-white' : 'text-gray-400'}`}>
                                    Join Family
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {tab === 'create' ? (
                            <View>
                                <Text className="text-white font-quicksand mb-2">Child&apos;s first name</Text>
                                <TextInput
                                    className="bg-[#2a2a2a] text-white p-4 rounded-xl mb-6 font-quicksand text-lg border border-gray-600"
                                    placeholder="e.g. Lily"
                                    placeholderTextColor="#666"
                                    value={childName}
                                    onChangeText={setChildName}
                                    autoCapitalize="words"
                                    maxLength={30}
                                />
                                <TouchableOpacity
                                    className={`p-4 rounded-full items-center border-2 border-lantern-light ${loading ? 'bg-gray-600' : 'bg-lantern-marine'}`}
                                    onPress={handleCreate}
                                    disabled={loading}
                                >
                                    <Text className="text-white font-bold text-lg font-quicksand">
                                        {loading ? 'Creating...' : 'Create Profile'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : pendingChildId ? (
                            <View accessible accessibilityRole="alert">
                                <View className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 mb-4 items-center">
                                    <Text className="text-amber-400 font-bold font-quicksand text-center mb-1">
                                        Request sent
                                    </Text>
                                    <Text className="text-gray-300 text-sm font-quicksand text-center">
                                        A caregiver already on this profile needs to approve you before you can see this child&apos;s data. Check back once they&apos;ve approved your request.
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    className={`p-4 rounded-full items-center border-2 border-lantern-light ${checkingApproval ? 'bg-gray-600' : 'bg-lantern-marine'}`}
                                    onPress={handleCheckApproval}
                                    disabled={checkingApproval}
                                    accessibilityRole="button"
                                    accessibilityLabel="Check approval status"
                                    accessibilityHint="Checks whether a caregiver has approved your join request yet"
                                >
                                    <Text className="text-white font-bold text-lg font-quicksand">
                                        {checkingApproval ? 'Checking...' : "I've been approved — Continue"}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="mt-4 self-center"
                                    onPress={() => { setPendingChildId(null); setInviteCode(''); setError(''); }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Cancel request and enter a different code"
                                >
                                    <Text className="text-gray-400 text-xs font-quicksand underline">
                                        Use a different code
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                <Text className="text-white font-quicksand mb-2">Enter the invite code</Text>
                                <Text className="text-gray-400 text-xs font-quicksand mb-4">
                                    Ask the primary caregiver to share their invite code from the app&apos;s settings. Joining requires their approval.
                                </Text>
                                <TextInput
                                    className="bg-[#2a2a2a] text-white p-4 rounded-xl mb-6 font-quicksand text-lg border border-gray-600 text-center tracking-widest"
                                    placeholder="LL-XXXXXXXX"
                                    placeholderTextColor="#666"
                                    value={inviteCode}
                                    onChangeText={setInviteCode}
                                    autoCapitalize="characters"
                                    maxLength={11}
                                    accessibilityLabel="Invite code"
                                    accessibilityHint="Enter the invite code shared by the primary caregiver"
                                />
                                <TouchableOpacity
                                    className={`p-4 rounded-full items-center border-2 border-lantern-light ${loading ? 'bg-gray-600' : 'bg-lantern-marine'}`}
                                    onPress={handleJoin}
                                    disabled={loading}
                                    accessibilityRole="button"
                                    accessibilityLabel={loading ? 'Sending join request' : 'Send join request'}
                                    accessibilityState={{ disabled: loading, busy: loading }}
                                >
                                    <Text className="text-white font-bold text-lg font-quicksand">
                                        {loading ? 'Sending request...' : 'Request to Join'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {error ? (
                            <Text
                                className="text-red-400 text-center font-quicksand mt-4"
                                accessibilityRole="alert"
                            >
                                {error}
                            </Text>
                        ) : null}
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}

async function migrateExistingData(uid: string, childId: string) {
    const collections = ['episodes', 'gi_logs', 'health_notes'];
    for (const coll of collections) {
        try {
            const q = query(collection(db, coll), where('userId', '==', uid));
            const snap = await getDocs(q);
            await Promise.all(snap.docs.map(d =>
                updateDoc(d.ref, { childId, addedBy: uid })
            ));
        } catch (e) {
            console.error(`Migration failed for ${coll}:`, e);
        }
    }
}
