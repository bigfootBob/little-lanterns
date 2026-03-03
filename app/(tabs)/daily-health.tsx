import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, Keyboard, Modal, ScrollView, SectionList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusModal from '../../components/StatusModal';
import { db } from '../../firebaseConfig';
import i18n from '../i18n';

// Helper to map frequency to time slots with better distribution
const getTimeSlots = (freq: number) => {
    const allSlots = [
        'timeMorning',      // 0
        'timeMidMorning',   // 1
        'timeAfternoon',    // 2
        'timeMidAfternoon', // 3
        'timeEvening'       // 4
    ];

    // Better defaults based on frequency
    if (freq === 1) return [allSlots[0]]; // Morning
    if (freq === 2) return [allSlots[0], allSlots[4]]; // Morning, Evening
    if (freq === 3) return [allSlots[0], allSlots[2], allSlots[4]]; // Morning, Afternoon, Evening
    if (freq === 4) return [allSlots[0], allSlots[1], allSlots[2], allSlots[4]]; // Skip MidAfternoon

    // Return the first 'freq' slots, defaulting to Morning if freq is somehow 0 but logic flows
    // We will cap freq at 5 for this list
    return allSlots.slice(0, Math.min(freq, 5));
};

const getSlotLabel = (date: Date) => {
    const hour = date.getHours();

    if (hour >= 0 && hour < 9) return 'timeMorning';
    if (hour >= 9 && hour < 12) return 'timeMidMorning';
    if (hour >= 12 && hour < 15) return 'timeAfternoon';
    if (hour >= 15 && hour < 19) return 'timeMidAfternoon';
    return 'timeEvening'; // 19:00 to 23:59
};

export default function DailyHealthScreen() {
    const insets = useSafeAreaInsets();
    const [medFrequency, setMedFrequency] = useState(0);
    const [isSetup, setIsSetup] = useState(false);
    // Track which doses are given. Key is the index of the dose.
    const [dosesGiven, setDosesGiven] = useState<Set<number>>(new Set());

    // Custom times for each dose. Key is index.
    const [medTimes, setMedTimes] = useState<{ [key: number]: Date }>({});

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentPickingIndex, setCurrentPickingIndex] = useState<number | null>(null);

    // Notes State
    const [note, setNote] = useState('');
    const [notesHistory, setNotesHistory] = useState<any[]>([]);
    const [notesModalVisible, setNotesModalVisible] = useState(false);

    // Status Modal State
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'success' | 'error'>('success');
    const [statusModalMessage, setStatusModalMessage] = useState('');

    useEffect(() => {
        loadSettings();

        // Real-time listener for health notes
        const q = query(collection(db, "health_notes"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotesHistory(fetchedNotes);
        });
        return () => unsubscribe();
    }, []);

    const loadSettings = async () => {
        try {
            const keys = ['medFrequency', 'medTimes', 'isSetup', 'dosesGiven', 'lastLogDate'];
            const stores = await AsyncStorage.multiGet(keys);
            const data: { [key: string]: string | null } = {};
            stores.forEach(([key, value]) => { data[key] = value; });

            if (data.medFrequency) setMedFrequency(parseInt(data.medFrequency));

            if (data.medTimes) {
                const parsedTimes = JSON.parse(data.medTimes);
                const loadedTimes: { [key: number]: Date } = {};
                Object.keys(parsedTimes).forEach(key => {
                    loadedTimes[parseInt(key)] = new Date(parsedTimes[key]);
                });
                setMedTimes(loadedTimes);
            }

            if (data.isSetup === 'true') setIsSetup(true);

            // Daily Reset Logic
            const today = new Date().toDateString();
            const lastDate = data.lastLogDate;

            if (lastDate === today && data.dosesGiven) {
                const parsedDoses = JSON.parse(data.dosesGiven);
                setDosesGiven(new Set(parsedDoses));
            } else {
                // It's a new day or no previous log, accept default empty Set
                setDosesGiven(new Set());
                // Optionally save the new date immediately, checking effectively "starts" the day
                AsyncStorage.setItem('lastLogDate', today);
                // If it was a new day, we might want to clear the old doses from storage too, 
                // but saving the empty set on first toggle is also fine. 
                // For correctness, let's clear it in storage now.
                AsyncStorage.removeItem('dosesGiven');
            }

        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const saveSettings = async (freq: number, times: { [key: number]: Date }, setup: boolean) => {
        try {
            await AsyncStorage.setItem('medFrequency', freq.toString());
            await AsyncStorage.setItem('medTimes', JSON.stringify(times));
            await AsyncStorage.setItem('isSetup', setup.toString());
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const saveDailyProgress = async (doses: Set<number>) => {
        try {
            const doseArray = Array.from(doses);
            await AsyncStorage.setItem('dosesGiven', JSON.stringify(doseArray));
            await AsyncStorage.setItem('lastLogDate', new Date().toDateString());
        } catch (e) {
            console.error('Failed to save daily progress', e);
        }
    };

    const handleStartSetup = () => {
        if (medFrequency > 0) {
            setIsSetup(true);
            saveSettings(medFrequency, medTimes, true);
        }
    };

    const toggleDose = (index: number) => {
        setDosesGiven(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            // Save immediately
            saveDailyProgress(newSet);
            return newSet;
        });
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate && currentPickingIndex !== null) {
            const newTimes = { ...medTimes, [currentPickingIndex]: selectedDate };
            setMedTimes(newTimes);
            saveSettings(medFrequency, newTimes, isSetup);
        }
    };

    const openTimePicker = (index: number) => {
        setCurrentPickingIndex(index);
        setShowDatePicker(true);
    };

    const handleClearAll = async () => {
        Alert.alert(
            i18n.t('clearAllData'),
            'Are you sure you want to clear all medication settings? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'OK',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.multiRemove(['medFrequency', 'medTimes', 'isSetup', 'dosesGiven', 'lastLogDate']);
                            setMedFrequency(0);
                            setMedTimes({});
                            setIsSetup(false);
                            setDosesGiven(new Set());
                        } catch (e) {
                            console.error('Failed to clear data', e);
                        }
                    }
                }
            ]
        );
    };

    const handleSaveNote = async () => {
        if (!note.trim()) return;

        try {
            await addDoc(collection(db, "health_notes"), {
                note: note.trim(),
                timestamp: serverTimestamp(),
            });
            setNote('');
            Keyboard.dismiss();

            // Success Modal
            setStatusModalType('success');
            setStatusModalMessage(i18n.t('noteSaved'));
            setStatusModalVisible(true);
        } catch (e: any) {
            setStatusModalType('error');
            setStatusModalMessage(e.message);
            setStatusModalVisible(true);
        }
    };

    const getWeekStartDate = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // Adjust for Sunday being 0
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    };

    const groupNotesByWeek = (notes: any[]) => {
        const groups: { [key: string]: any[] } = {};
        notes.forEach(note => {
            const date = note.timestamp ? new Date(note.timestamp.seconds * 1000) : new Date();
            const weekStart = getWeekStartDate(date);
            const key = weekStart.toDateString(); // Unique key for the week
            if (!groups[key]) groups[key] = [];
            groups[key].push(note);
        });

        // Sort weeks descending
        const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        return sortedKeys.map(key => ({
            title: `Week of ${new Date(key).toLocaleDateString()}`,
            data: groups[key]
        }));
    };

    const groupedNotes = groupNotesByWeek(notesHistory);

    const renderNoteItem = ({ item }: { item: any }) => {
        const date = item.timestamp ? new Date(item.timestamp.seconds * 1000) : new Date();
        return (
            <View className="bg-[#2a2a2a] p-4 rounded-xl mb-3">
                <Text className="text-white font-quicksand text-base mb-1">{item.note}</Text>
                <Text className="text-gray-400 text-xs font-quicksand">{date.toLocaleString()}</Text>
            </View>
        );
    };

    const timeSlots = getTimeSlots(medFrequency);

    return (
        <ImageBackground
            source={require('../../assets/images/background.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <View className="flex-1 bg-black/60" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
                    <Text className="text-white text-3xl font-bold mb-8 text-center font-castoro">
                        {i18n.t('dailyHealthTitle')}
                    </Text>

                    <View className="bg-[#1a1a1a]/80 p-6 rounded-3xl mb-6">
                        <Text className="text-amber-500 text-xl font-bold mb-4 font-quicksand">
                            {i18n.t('medsHeader')}
                        </Text>

                        {!isSetup ? (
                            <View className="items-center">
                                <Text className="text-white text-lg mb-6 font-quicksand">
                                    {i18n.t('medsFrequencyQuestion')}
                                </Text>

                                <View className="flex-row items-center mb-8">
                                    <TouchableOpacity
                                        className="bg-gray-700 w-12 h-12 rounded-full items-center justify-center border-2 border-lantern-light"
                                        onPress={() => setMedFrequency(Math.max(0, medFrequency - 1))}
                                    >
                                        <Text className="text-white text-2xl font-quicksand">-</Text>
                                    </TouchableOpacity>

                                    <Text className="text-white text-4xl font-bold mx-8 font-quicksand">
                                        {medFrequency}
                                    </Text>

                                    <TouchableOpacity
                                        className="bg-gray-700 w-12 h-12 rounded-full items-center justify-center border-2 border-lantern-light"
                                        onPress={() => setMedFrequency(Math.min(5, medFrequency + 1))}
                                    >
                                        <Text className="text-white text-2xl font-quicksand">+</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    className={`p-4 rounded-full w-[80%] items-center ${medFrequency > 0 ? 'bg-amber-600' : 'bg-gray-800'} border-2 border-lantern-light`}
                                    onPress={handleStartSetup}
                                    disabled={medFrequency === 0}
                                >
                                    <Text className="text-white font-bold text-lg font-quicksand">
                                        {i18n.t('startTrackingMeds')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                {timeSlots.map((slotKey, index) => {
                                    const isGiven = dosesGiven.has(index);
                                    const customTime = medTimes[index];
                                    return (
                                        <View key={index} className="flex-row items-center justify-between mb-4 bg-[#2a2a2a] p-4 rounded-xl">
                                            <TouchableOpacity onPress={() => openTimePicker(index)}>
                                                <Text className="text-white text-lg font-medium font-quicksand">
                                                    {customTime
                                                        ? customTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : i18n.t(slotKey)}
                                                </Text>
                                                <Text className="text-gray-400 text-xs font-quicksand">
                                                    {customTime ? i18n.t(getSlotLabel(customTime)) : i18n.t('setTime')}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                className={`px-4 py-2 rounded-lg ${isGiven ? 'bg-green-600' : 'bg-gray-600'} border-2 border-lantern-light`}
                                                onPress={() => toggleDose(index)}
                                            >
                                                <Text className="text-white font-bold text-sm font-quicksand">
                                                    {isGiven ? i18n.t('medGiven') : i18n.t('medNotGiven')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}

                                <TouchableOpacity
                                    className="mt-4 items-center mb-4"
                                    onPress={() => setIsSetup(false)}
                                >
                                    <Text className="text-gray-400 text-sm font-quicksand underline">Edit Frequency</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="items-center"
                                    onPress={handleClearAll}
                                >
                                    <Text className="text-red-400 text-sm font-bold font-quicksand">{i18n.t('clearAllData')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {showDatePicker && (
                            <DateTimePicker
                                value={currentPickingIndex !== null && medTimes[currentPickingIndex] ? medTimes[currentPickingIndex] : new Date()}
                                mode="time"
                                is24Hour={false}
                                display="default"
                                onChange={handleTimeChange}
                            />
                        )}

                    </View>

                    {/* Notes Section */}
                    <View className="bg-[#1a1a1a]/80 p-6 rounded-3xl mb-6">
                        <Text className="text-amber-500 text-xl font-bold mb-4 font-quicksand">
                            {i18n.t('notesHeader')}
                        </Text>

                        <TextInput
                            className="bg-[#2a2a2a] text-white p-4 rounded-xl mb-4 font-quicksand min-h-[100px]"
                            placeholder={i18n.t('noteInputPlaceholder')}
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={note}
                            onChangeText={setNote}
                        />

                        <TouchableOpacity
                            className={`p-4 rounded-full w-[80%] self-center items-center ${note.trim().length > 0 ? 'bg-[#00C851]' : 'bg-gray-700'} border-2 border-lantern-light`}
                            onPress={handleSaveNote}
                            disabled={note.trim().length === 0}
                        >
                            <Text className={`text-xl font-bold font-quicksand ${note.trim().length > 0 ? 'text-white' : 'text-gray-400'}`}>
                                {i18n.t('saveNote')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setNotesModalVisible(true)}
                            className="mt-4 self-center"
                        >
                            <Text className="text-lantern-light underline font-quicksand">{i18n.t('viewHistory')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Status Modal */}
                <StatusModal
                    visible={statusModalVisible}
                    type={statusModalType}
                    message={statusModalMessage}
                    onClose={() => setStatusModalVisible(false)}
                />

                {/* Notes History Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={notesModalVisible}
                    onRequestClose={() => setNotesModalVisible(false)}
                >
                    <View className="flex-1 bg-black/95" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
                        <View className="flex-1 p-5">
                            <View className="flex-row justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                <Text className="text-white text-2xl font-bold font-castoro">{i18n.t('notesHistoryTitle')}</Text>
                                <TouchableOpacity onPress={() => setNotesModalVisible(false)} className="bg-gray-800 p-2 rounded-lg">
                                    <Text className="text-lantern-light font-bold font-quicksand">{i18n.t('close')}</Text>
                                </TouchableOpacity>
                            </View>

                            {notesHistory.length === 0 ? (
                                <Text className="text-gray-500 text-center mt-10 font-quicksand">{i18n.t('noNotes')}</Text>
                            ) : (
                                <SectionList
                                    sections={groupedNotes}
                                    renderItem={renderNoteItem}
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
