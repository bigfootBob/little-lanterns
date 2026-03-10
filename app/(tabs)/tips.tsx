import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, linkWithCredential } from 'firebase/auth';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ImageBackground, Linking, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusModal from '../../components/StatusModal';
import { auth, db } from '../../firebaseConfig';
import i18n from '../i18n';

export default function TipsScreen() {
    const insets = useSafeAreaInsets();

    // Status Modal State
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'success' | 'error'>('success');
    const [statusModalTitle, setStatusModalTitle] = useState('');
    const [statusModalMessage, setStatusModalMessage] = useState('');
    const [isLinking, setIsLinking] = useState(false);

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
                            const uid = auth.currentUser.uid;
                            const batch = writeBatch(db);

                            const collectionsToClear = ['episodes', 'gi_logs', 'health_notes'];

                            for (const coll of collectionsToClear) {
                                const q = query(collection(db, coll), where('userId', '==', uid));
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

    return (
        <ImageBackground
            source={require('../../assets/images/background.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <View className="flex-1 bg-black/60 items-center justify-center p-5" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
                <Text className="text-white text-2xl font-quicksand text-center mb-8">
                    {i18n.t('tipsMessage')}
                </Text>

                <TouchableOpacity
                    className="bg-lantern-marine p-5 rounded-full w-[80%] items-center border-2 border-lantern-light mb-12"
                    onPress={() => Linking.openURL('https://littlelanterns.info')}
                >
                    <Text className="text-white text-xl font-bold">{i18n.t('goThereNow')}</Text>
                </TouchableOpacity>

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
                        >
                            <Text className="text-red-500 font-bold font-quicksand text-center">
                                {isLinking ? "Processing..." : i18n.t('clearDataTitle')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

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
