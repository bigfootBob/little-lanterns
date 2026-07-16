import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Dimensions, ImageBackground, Modal, ScrollView, SectionList, Text, TouchableOpacity, View } from 'react-native';
import ImageViewing from "react-native-image-viewing";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmModal from '../../components/ConfirmModal';
import StatusModal from '../../components/StatusModal';
import { useChild } from '../../hooks/use-child';
import { auth, db } from '../../firebaseConfig';
import i18n from '../i18n';

const { width: screenWidth, height: deviceHeight } = Dimensions.get('window');

type StoolLog = {
    id: string;
    type: number;
    timestamp: any; // Firestore timestamp
};

const BRISTOL_TYPES = [1, 2, 3, 4, 5, 6, 7];

export default function GILogScreen() {
    const insets = useSafeAreaInsets();
    const { childId } = useChild();
    const [selectedType, setSelectedType] = useState<number | null>(null);
    const [logs, setLogs] = useState<StoolLog[]>([]);

    // Status Modal State
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'success' | 'error'>('success');
    const [statusModalMessage, setStatusModalMessage] = useState('');

    // Confirm Delete Modal State
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Chart Modal State
    const [chartModalVisible, setChartModalVisible] = useState(false);

    // History Modal State
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    useEffect(() => {
        if (!childId) return;
        const q = query(
            collection(db, "gi_logs"),
            where("childId", "==", childId),
            orderBy("timestamp", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs: StoolLog[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as StoolLog));
            setLogs(fetchedLogs);
        });
        return () => unsubscribe();
    }, [childId]);

    const handleSave = async () => {
        if (!selectedType) return;

        try {
            await addDoc(collection(db, "gi_logs"), {
                childId,
                addedBy: auth.currentUser?.uid,
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

    const getWeekStartDate = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // Adjust for Sunday being 0
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    };

    const groupLogsByWeek = (logs: StoolLog[]) => {
        const groups: { [key: string]: StoolLog[] } = {};
        logs.forEach(log => {
            const date = log.timestamp ? new Date(log.timestamp.seconds * 1000) : new Date();
            const weekStart = getWeekStartDate(date);
            const key = weekStart.toDateString(); // Unique key for the week
            if (!groups[key]) groups[key] = [];
            groups[key].push(log);
        });

        // Sort weeks descending
        const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        return sortedKeys.map(key => ({
            title: `Week of ${new Date(key).toLocaleDateString()}`,
            data: groups[key]
        }));
    };

    const groupedLogs = groupLogsByWeek(logs);



    const handleDeleteLog = (id: string) => {
        setPendingDeleteId(id);
        setConfirmVisible(true);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        setConfirmVisible(false);
        try {
            await deleteDoc(doc(db, 'gi_logs', pendingDeleteId));
        } catch (e: any) {
            setStatusModalType('error');
            setStatusModalMessage(e.message);
            setStatusModalVisible(true);
        }
        setPendingDeleteId(null);
    };

    const renderLogItem = ({ item }: { item: StoolLog }) => {
        const date = item.timestamp ? new Date(item.timestamp.seconds * 1000) : new Date();
        return (
            <View className="bg-[#2a2a2a] p-4 rounded-xl mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <View className={`w-8 h-8 rounded-full ${getBristolColor(item.type)} items-center justify-center mr-4`}>
                        <Text className="text-black font-bold font-quicksand">{item.type}</Text>
                    </View>
                    <View>
                        <Text className="text-white font-bold font-quicksand">{i18n.t(`type${item.type}`)}</Text>
                        <Text className="text-gray-400 text-xs font-quicksand">{date.toLocaleString()}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => handleDeleteLog(item.id)}
                    className="pl-4 py-1"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${i18n.t(`type${item.type}`)} log from ${date.toLocaleString()}`}
                >
                    <Text className="text-red-400 text-xs font-quicksand">Strike</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <ImageBackground
            source={require('../../assets/images/background.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <View className="flex-1 bg-black/60" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
                <View className="p-5 flex-1">
                    <Text className="text-white text-3xl font-bold mb-6 text-center font-castoro">
                        {i18n.t('giLogTitle')}
                    </Text>

                    {/* Logging Section */}
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }} className="flex-1">
                        <View className="bg-[#1a1a1a]/80 p-5 rounded-3xl mb-6">
                            <Text className="text-amber-500 text-xl font-bold mb-4 text-center font-quicksand">
                                {i18n.t('logStoolHeader')}
                            </Text>

                            <Text className="text-gray-300 mb-2 text-center font-quicksand">{i18n.t('stoolTypeLabel')}</Text>

                            <View className="flex-row justify-between items-center mb-2 px-2">
                                <Text className="text-gray-400 text-xs italic font-quicksand">{i18n.t('scrollInstructions')}</Text>
                                <TouchableOpacity
                                    onPress={() => setChartModalVisible(true)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={i18n.t('viewChart')}
                                >
                                    <Text className="text-lantern-light text-xs font-bold underline font-quicksand">{i18n.t('viewChart')}</Text>
                                </TouchableOpacity>
                            </View>

                            <View className="mb-6">
                                <View className="flex-row flex-wrap justify-center pb-2">
                                    {BRISTOL_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            onPress={() => setSelectedType(type)}
                                            className={`p-4 rounded-2xl items-center justify-center w-[46%] m-1 aspect-square border-2 ${selectedType === type ? 'bg-amber-600 border-white' : 'bg-gray-800 border-lantern-light'}`}
                                            accessibilityRole="radio"
                                            accessibilityLabel={i18n.t(`type${type}`)}
                                            accessibilityState={{ selected: selectedType === type }}
                                        >
                                            {selectedType === type && (
                                                <View
                                                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white items-center justify-center"
                                                    accessibilityElementsHidden={true}
                                                    importantForAccessibility="no"
                                                >
                                                    <Text className="text-amber-700 text-xs font-bold">✓</Text>
                                                </View>
                                            )}
                                            <View className={`w-10 h-10 rounded-full ${getBristolColor(type)} items-center justify-center mb-2`}>
                                                <Text className="text-black font-bold text-lg font-quicksand">{type}</Text>
                                            </View>
                                            <Text className="text-white text-[11px] text-center font-quicksand" numberOfLines={3}>
                                                {i18n.t(`type${type}`)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {selectedType && (
                                <View className="mb-6 bg-gray-800 p-4 rounded-xl border border-gray-700">
                                    <Text className="text-amber-500 font-bold mb-1 font-quicksand text-lg">
                                        {i18n.t(`type${selectedType}`)}
                                    </Text>
                                    <Text className="text-gray-300 font-quicksand">
                                        {i18n.t(`type${selectedType}Description`)}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                className={`p-4 rounded-full w-[80%] self-center items-center ${selectedType ? 'bg-[#00C851]' : 'bg-gray-700'} border-2 border-lantern-light`}
                                onPress={handleSave}
                                disabled={!selectedType}
                                accessibilityRole="button"
                                accessibilityLabel={i18n.t('saveLog')}
                                accessibilityState={{ disabled: !selectedType }}
                            >
                                <Text className={`text-xl font-bold font-quicksand ${selectedType ? 'text-white' : 'text-gray-400'}`}>
                                    {i18n.t('saveLog')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setHistoryModalVisible(true)}
                                className="mt-4 self-center"
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityRole="button"
                                accessibilityLabel={i18n.t('viewHistory')}
                            >
                                <Text className="text-lantern-light underline font-quicksand">{i18n.t('viewHistory')}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>

                {/* Status Modal */}
                <StatusModal
                    visible={statusModalVisible}
                    type={statusModalType}
                    message={statusModalMessage}
                    onClose={() => setStatusModalVisible(false)}
                />

                {/* Confirm Delete Modal */}
                <ConfirmModal
                    visible={confirmVisible}
                    onConfirm={confirmDelete}
                    onCancel={() => { setConfirmVisible(false); setPendingDeleteId(null); }}
                />

                {/* Chart Modal */}
                <ImageViewing
                    images={[require('../../assets/images/bristol-chart.jpg')]}
                    imageIndex={0}
                    visible={chartModalVisible}
                    onRequestClose={() => setChartModalVisible(false)}
                    swipeToCloseEnabled={true}
                    HeaderComponent={() => {
                        // Calculate the actual size the image will be rendered at (it scales to fit width)
                        const imageAspect = 768 / 429;
                        const renderedHeight = screenWidth * imageAspect;

                        // The ImageViewer centers the image vertically.
                        // So the top edge of the image starts halfway down the remaining screen space.
                        const topEdgeOffset = (deviceHeight - renderedHeight) / 2;

                        // The user requested the button to be 126px down from the top of the original 768px image.
                        // We divide 126 by 768 to get the exact percentage, and multiply by the scaled screen height!
                        const targetOffsetWithinImage = renderedHeight * (126 / 768);

                        const dynamicTop = topEdgeOffset + targetOffsetWithinImage;

                        return (
                            <View
                                className="absolute w-full items-center z-50"
                                style={{ top: dynamicTop }}
                            >
                                <TouchableOpacity
                                    onPress={() => setChartModalVisible(false)}
                                    className="bg-[#1a3749]/90 px-8 py-3 rounded-full border border-lantern-light/50"
                                    accessibilityRole="button"
                                    accessibilityLabel="Close chart"
                                >
                                    <Text className="text-lantern-light font-bold tracking-widest text-lg font-quicksand">CLOSE</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                />

                {/* History Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={historyModalVisible}
                    onRequestClose={() => setHistoryModalVisible(false)}
                    accessibilityViewIsModal={true}
                >
                    <View className="flex-1 bg-black/95" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
                        <View className="flex-1 p-5">
                            <View className="flex-row justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                <Text className="text-white text-2xl font-bold font-castoro">{i18n.t('historyTitle')}</Text>
                                <TouchableOpacity
                                    onPress={() => setHistoryModalVisible(false)}
                                    className="bg-gray-800 p-2 rounded-lg"
                                    accessibilityRole="button"
                                    accessibilityLabel={i18n.t('close')}
                                >
                                    <Text className="text-lantern-light font-bold font-quicksand">{i18n.t('close')}</Text>
                                </TouchableOpacity>
                            </View>

                            {logs.length === 0 ? (
                                <Text className="text-gray-400 text-center mt-10 font-quicksand">{i18n.t('noLogs')}</Text>
                            ) : (
                                <SectionList
                                    sections={groupedLogs}
                                    renderItem={renderLogItem}
                                    renderSectionHeader={({ section: { title } }) => (
                                        <View className="bg-black/90 py-2 mb-2 border-b border-gray-700">
                                            <Text className="text-lantern-light font-bold font-quicksand text-lg">{title}</Text>
                                        </View>
                                    )}
                                    keyExtractor={item => item.id}
                                    showsVerticalScrollIndicator={false}
                                    stickySectionHeadersEnabled={true}
                                />
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        </ImageBackground>
    );
}
