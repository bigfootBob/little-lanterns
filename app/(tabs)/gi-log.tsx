import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FlatList, ImageBackground, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusModal from '../../components/StatusModal';
import { db } from '../../firebaseConfig';
import i18n from '../i18n';

type StoolLog = {
    id: string;
    type: number;
    timestamp: any; // Firestore timestamp
};

const BRISTOL_TYPES = [1, 2, 3, 4, 5, 6, 7];

export default function GILogScreen() {
    const [selectedType, setSelectedType] = useState<number | null>(null);
    const [logs, setLogs] = useState<StoolLog[]>([]);

    // Status Modal State
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'success' | 'error'>('success');
    const [statusModalMessage, setStatusModalMessage] = useState('');

    useEffect(() => {
        // Real-time listener for GI logs
        const q = query(collection(db, "gi_logs"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs: StoolLog[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as StoolLog));
            setLogs(fetchedLogs);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!selectedType) return;

        try {
            await addDoc(collection(db, "gi_logs"), {
                type: selectedType,
                timestamp: serverTimestamp(),
            });
            setSelectedType(null);

            // Success Modal
            setStatusModalType('success');
            setStatusModalMessage(i18n.t('savedTitle')); // Or specific success message
            setStatusModalVisible(true);
        } catch (e: any) {
            // Error Modal
            setStatusModalType('error');
            setStatusModalMessage(e.message);
            setStatusModalVisible(true);
        }
    };

    const getBristolColor = (type: number) => {
        // Simple color coding guide
        if (type <= 2) return 'bg-red-400'; // Constipation
        if (type >= 3 && type <= 5) return 'bg-green-500'; // Normal-ish
        return 'bg-yellow-500'; // Diarrhea
    };

    const renderLogItem = ({ item }: { item: StoolLog }) => {
        const date = item.timestamp ? new Date(item.timestamp.seconds * 1000) : new Date();
        return (
            <View className="bg-[#2a2a2a] p-4 rounded-xl mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-full ${getBristolColor(item.type)} items-center justify-center mr-4`}>
                        <Text className="text-black font-bold font-quicksand">{item.type}</Text>
                    </View>
                    <View>
                        <Text className="text-white font-bold font-quicksand">{i18n.t(`type${item.type}`)}</Text>
                        <Text className="text-gray-400 text-xs font-quicksand">{date.toLocaleString()}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <ImageBackground
            source={require('../../assets/images/background.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <SafeAreaView className="flex-1 bg-black/60">
                <View className="p-5 flex-1">
                    <Text className="text-white text-3xl font-bold mb-6 text-center font-castoro">
                        {i18n.t('giLogTitle')}
                    </Text>

                    {/* Logging Section */}
                    <View className="bg-[#1a1a1a]/80 p-5 rounded-3xl mb-6">
                        <Text className="text-amber-500 text-xl font-bold mb-4 text-center font-quicksand">
                            {i18n.t('logStoolHeader')}
                        </Text>

                        <Text className="text-gray-300 mb-2 text-center font-quicksand">{i18n.t('stoolTypeLabel')}</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                            {BRISTOL_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setSelectedType(type)}
                                    className={`mr-3 p-4 rounded-2xl items-center justify-center w-32 h-32 border-2 ${selectedType === type ? 'bg-amber-600 border-lantern-light' : 'bg-gray-800 border-lantern-light'}`}
                                >
                                    <View className={`w-10 h-10 rounded-full ${getBristolColor(type)} items-center justify-center mb-2`}>
                                        <Text className="text-black font-bold text-lg font-quicksand">{type}</Text>
                                    </View>
                                    <Text className="text-white text-xs text-center font-quicksand" numberOfLines={3}>
                                        {i18n.t(`type${type}`)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            className={`p-4 rounded-full w-[80%] items-center ${selectedType ? 'bg-[#00C851]' : 'bg-gray-700'} border-2 border-lantern-light`}
                            onPress={handleSave}
                            disabled={!selectedType}
                        >
                            <Text className={`text-xl font-bold font-quicksand ${selectedType ? 'text-white' : 'text-gray-400'}`}>
                                {i18n.t('saveLog')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* History Section */}
                    <Text className="text-white text-lg font-bold mb-3 ml-2 font-quicksand">History</Text>
                    {logs.length === 0 ? (
                        <Text className="text-gray-500 text-center mt-10 font-quicksand">{i18n.t('noLogs')}</Text>
                    ) : (
                        <FlatList
                            data={logs}
                            renderItem={renderLogItem}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>

                {/* Status Modal */}
                <StatusModal
                    visible={statusModalVisible}
                    type={statusModalType}
                    message={statusModalMessage}
                    onClose={() => setStatusModalVisible(false)}
                />
            </SafeAreaView>
        </ImageBackground>
    );
}
