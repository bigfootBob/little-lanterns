import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../i18n';

// Helper to map frequency to time slots
const getTimeSlots = (freq: number) => {
    const slots = [
        'timeMorning',
        'timeMidMorning',
        'timeAfternoon',
        'timeMidAfternoon',
        'timeEvening'
    ];
    // Return the first 'freq' slots, defaulting to Morning if freq is somehow 0 but logic flows
    // We will cap freq at 5 for this list
    return slots.slice(0, Math.min(freq, 5));
};

export default function DailyHealthScreen() {
    const [medFrequency, setMedFrequency] = useState(0);
    const [isSetup, setIsSetup] = useState(false);
    // Track which doses are given. Key is the index of the dose.
    const [dosesGiven, setDosesGiven] = useState<Set<number>>(new Set());

    const handleStartSetup = () => {
        if (medFrequency > 0) {
            setIsSetup(true);
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
            return newSet;
        });
    };

    const timeSlots = getTimeSlots(medFrequency);

    return (
        <SafeAreaView className="flex-1 bg-black">
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text className="text-white text-3xl font-bold mb-8 text-center">
                    {i18n.t('dailyHealthTitle')}
                </Text>

                <View className="bg-[#1a1a1a] p-6 rounded-3xl mb-6">
                    <Text className="text-amber-500 text-xl font-bold mb-4">
                        {i18n.t('medsHeader')}
                    </Text>

                    {!isSetup ? (
                        <View className="items-center">
                            <Text className="text-white text-lg mb-6">
                                {i18n.t('medsFrequencyQuestion')}
                            </Text>

                            <View className="flex-row items-center mb-8">
                                <TouchableOpacity
                                    className="bg-gray-700 w-12 h-12 rounded-full items-center justify-center"
                                    onPress={() => setMedFrequency(Math.max(0, medFrequency - 1))}
                                >
                                    <Text className="text-white text-2xl">-</Text>
                                </TouchableOpacity>

                                <Text className="text-white text-4xl font-bold mx-8">
                                    {medFrequency}
                                </Text>

                                <TouchableOpacity
                                    className="bg-gray-700 w-12 h-12 rounded-full items-center justify-center"
                                    onPress={() => setMedFrequency(Math.min(5, medFrequency + 1))}
                                >
                                    <Text className="text-white text-2xl">+</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                className={`p-4 rounded-xl w-full items-center ${medFrequency > 0 ? 'bg-amber-600' : 'bg-gray-800'}`}
                                onPress={handleStartSetup}
                                disabled={medFrequency === 0}
                            >
                                <Text className="text-white font-bold text-lg">
                                    {i18n.t('startTrackingMeds')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {timeSlots.map((slotKey, index) => {
                                const isGiven = dosesGiven.has(index);
                                return (
                                    <View key={index} className="flex-row items-center justify-between mb-4 bg-[#2a2a2a] p-4 rounded-xl">
                                        <Text className="text-white text-lg font-medium">
                                            {i18n.t(slotKey)}
                                        </Text>
                                        <TouchableOpacity
                                            className={`px-4 py-2 rounded-lg ${isGiven ? 'bg-green-600' : 'bg-gray-600'}`}
                                            onPress={() => toggleDose(index)}
                                        >
                                            <Text className="text-white font-bold text-sm">
                                                {isGiven ? i18n.t('medGiven') : i18n.t('medNotGiven')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}

                            <TouchableOpacity
                                className="mt-4 items-center"
                                onPress={() => setIsSetup(false)}
                            >
                                <Text className="text-gray-400 text-sm">Edit Frequency</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
