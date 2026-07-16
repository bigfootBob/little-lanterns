import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, linkWithCredential } from 'firebase/auth';
import { arrayUnion, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where, writeBatch, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, Linking, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusModal from '../../components/StatusModal';
import { CALM_CATEGORIES } from '../../constants/calmCategories';
import { useChild } from '../../hooks/use-child';
import { auth, db } from '../../firebaseConfig';
import i18n from '../i18n';

export default function TipsScreen() {
    const insets = useSafeAreaInsets();
    const { childId, childName, inviteCode } = useChild();
    const handleCopyCode = async () => {
        if (!inviteCode) return;
        await Share.share({ message: `Join me on Little Lanterns! Use invite code: ${inviteCode}` });
    };

    // Status Modal State
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'success' | 'error'>('success');
    const [statusModalTitle, setStatusModalTitle] = useState('');
    const [statusModalMessage, setStatusModalMessage] = useState('');
    const [isLinking, setIsLinking] = useState(false);

    // Pending caregiver join requests awaiting approval
    type JoinRequest = { id: string; requesterEmail: string | null };
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

    useEffect(() => {
        if (!childId) { setJoinRequests([]); return; }
        const q = query(
            collection(db, 'children', childId, 'joinRequests'),
            orderBy('requestedAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setJoinRequests(snapshot.docs.map((d) => ({
                id: d.id,
                requesterEmail: (d.data().requesterEmail as string | null) ?? null,
            })));
        });
        return () => unsubscribe();
    }, [childId]);

    const handleApproveRequest = async (requesterUid: string) => {
        if (!childId) return;
        setProcessingRequestId(requesterUid);
        try {
            await updateDoc(doc(db, 'children', childId), {
                caregivers: arrayUnion(requesterUid),
            });
            await deleteDoc(doc(db, 'children', childId, 'joinRequests', requesterUid));
        } catch (error: any) {
            console.error('Error approving join request:', error);
            setStatusModalType('error');
            setStatusModalTitle('Approval Failed');
            setStatusModalMessage(error.message);
            setStatusModalVisible(true);
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleDenyRequest = async (requesterUid: string) => {
        if (!childId) return;
        setProcessingRequestId(requesterUid);
        try {
            await deleteDoc(doc(db, 'children', childId, 'joinRequests', requesterUid));
        } catch (error: any) {
            console.error('Error denying join request:', error);
        } finally {
            setProcessingRequestId(null);
        }
    };

    // Check if user is already linked to Google
    const isLinkedToGoogle = auth.currentUser?.providerData.some(
        (provider) => provider.providerId === 'google.com'
    ) ?? false;

    const handleGoogleLink = async () => {
        if (!auth.currentUser) return;
        setIsLinking(true);
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            if (userInfo.data?.idToken) {
                const credential = GoogleAuthProvider.credential(userInfo.data.idToken);

                try {
                    await linkWithCredential(auth.currentUser, credential);
                    setStatusModalType('success');
                    setStatusModalTitle(i18n.t('backupSuccessTitle'));
                    setStatusModalMessage(i18n.t('backupSuccessMessage'));
                    setStatusModalVisible(true);
                } catch (linkError: any) {
                    if (linkError.code === 'auth/credential-already-in-use') {
                        // User already has an account with this Google email. 
                        // Discard the current anonymous account and log them into the existing one.
                        await import('firebase/auth').then(async ({ signInWithCredential }) => {
                            await signInWithCredential(auth, credential);
                            setStatusModalType('success');
                            setStatusModalTitle(i18n.t('restoreSuccessTitle'));
                            setStatusModalMessage(i18n.t('restoreSuccessMessage'));
                            setStatusModalVisible(true);
                        });
                    } else {
                        throw linkError;
                    }
                }
            } else {
                throw new Error("No ID Token found");
            }
        } catch (error: any) {
            console.error(error);
            setStatusModalType('error');
            setStatusModalTitle(i18n.t('backupErrorTitle'));
            setStatusModalMessage(error.message);
            setStatusModalVisible(true);
        } finally {
            setIsLinking(false);
        }
    };

    const handleClearData = () => {
        Alert.alert(
            i18n.t('clearDataTitle'),
            i18n.t('clearDataMessage'),
            [
                { text: i18n.t('clearDataCancel'), style: 'cancel' },
                {
                    text: i18n.t('confirmClear'),
                    style: 'destructive',
                    onPress: async () => {
                        if (!auth.currentUser) return;
                        setIsLinking(true);
                        try {
                            const batch = writeBatch(db);

                            const collectionsToClear = ['episodes', 'gi_logs', 'health_notes'];

                            for (const coll of collectionsToClear) {
                                const q = query(collection(db, coll), where('childId', '==', childId));
                                const snapshot = await getDocs(q);
                                snapshot.forEach((doc) => {
                                    batch.delete(doc.ref);
                                });
                            }

                            await batch.commit();

                            setStatusModalType('success');
                            setStatusModalTitle(i18n.t('clearSuccessTitle'));
                            setStatusModalMessage(i18n.t('clearSuccessMessage'));
                            setStatusModalVisible(true);
                        } catch (error: any) {
                            console.error('Error clearing data:', error);
                            setStatusModalType('error');
                            setStatusModalTitle(i18n.t('clearErrorTitle'));
                            setStatusModalMessage(error.message);
                            setStatusModalVisible(true);
                        } finally {
                            setIsLinking(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSeedData = async () => {
        if (!auth.currentUser) return;
        setIsLinking(true);
        setStatusModalMessage('Generating 90 days of sample data...');
        setStatusModalTitle('Seeding Data');
        setStatusModalType('success');
        setStatusModalVisible(true);

        try {
            const uid = auth.currentUser.uid;
            const batch = writeBatch(db);

            // Helpers for random generation
            const now = new Date();
            const ninetyDaysAgo = new Date(now);
            ninetyDaysAgo.setDate(now.getDate() - 90);

            const getRandomDate = () => {
                const date = new Date(ninetyDaysAgo.getTime() + Math.random() * (now.getTime() - ninetyDaysAgo.getTime()));
                return Timestamp.fromDate(date);
            };

            const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
            
            // Extract calm keys from CALM_CATEGORIES
            const calmKeys = CALM_CATEGORIES.flatMap(cat => cat.options.map(opt => opt.key));

            // Generate ~30 Episodes
            const numEpisodes = 30 + Math.floor(Math.random() * 10);
            for (let i = 0; i < numEpisodes; i++) {
                const epRef = collection(db, 'episodes');
                batch.set(doc(epRef), {
                    userId: uid,
                    duration_seconds: Math.floor(Math.random() * (45 * 60)) + 60, // 1 to 45 mins
                    calmed_by: Math.random() > 0.3 ? getRandomItem(calmKeys) : null, // 70% chance of calm factor
                    notes: Math.random() > 0.5 ? 'Sample generated note.' : '',
                    variant: 'LoF',
                    timestamp: getRandomDate()
                });
            }

            // Generate ~20 GI Logs
            const numGILogs = 20 + Math.floor(Math.random() * 10);
            for (let i = 0; i < numGILogs; i++) {
                const giRef = collection(db, 'gi_logs');
                batch.set(doc(giRef), {
                    userId: uid,
                    type: Math.floor(Math.random() * 7) + 1, // 1-7
                    notes: Math.random() > 0.7 ? 'Sample GI Note' : '',
                    timestamp: getRandomDate()
                });
            }

            // Generate ~15 Health Notes
            const numNotes = 15 + Math.floor(Math.random() * 5);
            for (let i = 0; i < numNotes; i++) {
                const notesRef = collection(db, 'health_notes');
                batch.set(doc(notesRef), {
                    userId: uid,
                    note: 'Routine generated sample note.',
                    timestamp: getRandomDate()
                });
            }

            await batch.commit();

            setStatusModalTitle('Success');
            setStatusModalMessage('Sample data successfully seeded!');
        } catch (error: any) {
            console.error('Error seeding data:', error);
            setStatusModalType('error');
            setStatusModalTitle('Seeding Failed');
            setStatusModalMessage(error.message);
        } finally {
            setIsLinking(false);
            // Hide modal after a few seconds
            setTimeout(() => setStatusModalVisible(false), 2000);
        }
    };

    return (
        <ImageBackground
            source={require('../../assets/images/background.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <View className="flex-1 bg-black/60" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
            <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 20, paddingBottom: 120 }}>
                <Text className="text-white text-2xl font-quicksand text-center mb-8">
                    {i18n.t('tipsMessage')}
                </Text>

                <TouchableOpacity
                    className="bg-lantern-marine p-5 rounded-full w-[80%] items-center border-2 border-lantern-light mb-8"
                    onPress={() => Linking.openURL('https://littlelanterns.info')}
                    accessibilityRole="link"
                    accessibilityLabel={i18n.t('goThereNow')}
                >
                    <Text className="text-white text-xl font-bold">{i18n.t('goThereNow')}</Text>
                </TouchableOpacity>

                {/* Family Sharing Card */}
                {inviteCode ? (
                    <View className="bg-[#1a1a1a]/80 p-6 rounded-3xl w-full border border-gray-700 items-center mb-6">
                        <Text className="text-amber-500 text-lg font-bold mb-1 font-quicksand text-center">
                            Family Sharing
                        </Text>
                        {childName ? (
                            <Text className="text-gray-400 text-xs font-quicksand text-center mb-4">
                                Tracking for <Text className="text-white font-bold">{childName}</Text>
                            </Text>
                        ) : null}
                        <Text className="text-gray-300 text-xs font-quicksand text-center mb-3">
                            Share this code so another caregiver can join and see the same data.
                        </Text>
                        <TouchableOpacity
                            className="bg-[#2a2a2a] px-8 py-4 rounded-2xl border border-amber-500 mb-3"
                            onPress={handleCopyCode}
                            accessibilityRole="button"
                            accessibilityLabel={`Invite code ${inviteCode}. Tap to share`}
                        >
                            <Text className="text-amber-400 text-2xl font-bold tracking-widest text-center font-quicksand">
                                {inviteCode}
                            </Text>
                        </TouchableOpacity>
                        <Text className="text-gray-400 text-xs font-quicksand">
                            Tap to share
                        </Text>
                    </View>
                ) : null}

                {/* Pending Join Requests */}
                {joinRequests.length > 0 && (
                    <View
                        className="bg-[#1a1a1a]/80 p-6 rounded-3xl w-full border border-amber-700 items-center mb-6"
                        accessibilityRole="summary"
                        accessibilityLabel={`${joinRequests.length} pending caregiver ${joinRequests.length === 1 ? 'request' : 'requests'}`}
                    >
                        <Text className="text-amber-500 text-lg font-bold mb-3 font-quicksand text-center">
                            Pending Requests
                        </Text>
                        {joinRequests.map((req) => (
                            <View key={req.id} className="w-full bg-[#2a2a2a] rounded-2xl p-4 mb-3 border border-gray-700">
                                <Text className="text-white font-quicksand mb-3 text-center">
                                    {req.requesterEmail ?? 'Someone'} wants to join as a caregiver
                                </Text>
                                <View className="flex-row gap-3 justify-center">
                                    <TouchableOpacity
                                        className="flex-1 bg-transparent p-3 rounded-full items-center border border-gray-500"
                                        onPress={() => handleDenyRequest(req.id)}
                                        disabled={processingRequestId === req.id}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Deny caregiver request from ${req.requesterEmail ?? 'this person'}`}
                                        accessibilityState={{ disabled: processingRequestId === req.id, busy: processingRequestId === req.id }}
                                    >
                                        <Text className="text-gray-300 font-bold font-quicksand">Deny</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="flex-1 bg-[#00C851] p-3 rounded-full items-center border border-green-400"
                                        onPress={() => handleApproveRequest(req.id)}
                                        disabled={processingRequestId === req.id}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Approve caregiver request from ${req.requesterEmail ?? 'this person'}`}
                                        accessibilityState={{ disabled: processingRequestId === req.id, busy: processingRequestId === req.id }}
                                    >
                                        <Text className="text-white font-bold font-quicksand">Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Google Backup Section */}
                {!isLinkedToGoogle ? (
                    <View className="bg-[#1a1a1a]/80 p-6 rounded-3xl w-full border border-gray-700 items-center">
                        <Text className="text-amber-500 text-lg font-bold mb-2 font-quicksand text-center">
                            Secure Your Data
                        </Text>
                        <Text className="text-gray-300 text-sm mb-6 font-quicksand text-center leading-relaxed">
                            Link a Google Account so your tracking history is preserved if you change phones or reinstall the app.
                        </Text>
                        <TouchableOpacity
                            className={`p-4 rounded-full w-[80%] items-center ${isLinking ? 'bg-gray-600' : 'bg-white'}`}
                            onPress={handleGoogleLink}
                            disabled={isLinking}
                            accessibilityRole="button"
                            accessibilityLabel={i18n.t('backupToGoogle')}
                            accessibilityState={{ disabled: isLinking, busy: isLinking }}
                        >
                            <Text className={`font-bold text-lg font-quicksand ${isLinking ? 'text-gray-300' : 'text-black'}`}>
                                {isLinking ? "Loading..." : i18n.t('backupToGoogle')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="w-full">
                        <View className="bg-green-900/40 p-6 rounded-3xl w-full border border-green-700 items-center mt-4">
                            <Text className="text-green-400 text-lg font-bold mb-2 font-quicksand text-center">
                                Account Secured
                            </Text>
                            <Text className="text-green-200/80 text-sm font-quicksand text-center leading-relaxed">
                                Your tracker data is safely backed up to your Google Account.
                            </Text>
                        </View>

                        <TouchableOpacity
                            className="mt-8 border border-red-900/50 bg-red-950/30 p-4 rounded-xl items-center w-[80%] self-center"
                            onPress={handleClearData}
                            disabled={isLinking}
                            accessibilityRole="button"
                            accessibilityLabel={i18n.t('clearDataTitle')}
                            accessibilityState={{ disabled: isLinking, busy: isLinking }}
                        >
                            <Text className="text-red-500 font-bold font-quicksand text-center">
                                {isLinking ? "Processing..." : i18n.t('clearDataTitle')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* DEV ONLY: Seed Data */}
                {__DEV__ && (
                    <TouchableOpacity
                        className="mt-4 bg-gray-800 p-4 rounded-xl items-center w-[80%] border border-gray-600 self-center"
                        onPress={handleSeedData}
                        disabled={isLinking}
                        accessibilityRole="button"
                        accessibilityLabel="Seed sample data (development only)"
                        accessibilityState={{ disabled: isLinking, busy: isLinking }}
                    >
                        <Text className="text-gray-300 font-bold font-quicksand">
                            {isLinking ? "Generating..." : "🛠️ Seed Sample Data"}
                        </Text>
                    </TouchableOpacity>
                )}

            </ScrollView>
            </View>

            <StatusModal
                visible={statusModalVisible}
                type={statusModalType}
                title={statusModalTitle} // We can pass title if modified, else it fallbacks correctly
                message={statusModalMessage}
                onClose={() => setStatusModalVisible(false)}
            />
        </ImageBackground>
    );
}
