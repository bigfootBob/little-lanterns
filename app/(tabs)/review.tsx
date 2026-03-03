import { collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Dimensions, ImageBackground, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';
import i18n from '../i18n';

const screenWidth = Dimensions.get('window').width;

export default function ReviewScreen() {
    const insets = useSafeAreaInsets();
    const [weekOffset, setWeekOffset] = useState(0);
    const [currentWeekData, setCurrentWeekData] = useState<any[]>([]);
    const [previousWeekData, setPreviousWeekData] = useState<any[]>([]);

    const [currentGiData, setCurrentGiData] = useState<any[]>([]);
    const [previousGiData, setPreviousGiData] = useState<any[]>([]);

    const [selectedPoint, setSelectedPoint] = useState<any>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    // Helpers
    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday start
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const getWeekRange = (offset: number) => {
        const now = new Date();
        const start = getStartOfWeek(now);
        start.setDate(start.getDate() - (offset * 7));

        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    };

    const { start: currentStart, end: currentEnd } = getWeekRange(weekOffset);
    const { start: prevStart, end: prevEnd } = getWeekRange(weekOffset + 1);

    useEffect(() => {
        const fetchScope = async () => {
            // Fetch Storms
            const fetchStorms = (start: Date, end: Date, isCurrent: boolean) => {
                const q = query(
                    collection(db, "episodes"),
                    where("timestamp", ">=", Timestamp.fromDate(start)),
                    where("timestamp", "<=", Timestamp.fromDate(end)),
                    orderBy("timestamp", "asc")
                );
                return onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => {
                        const d = doc.data();
                        const date = d.timestamp.toDate();
                        // Day index 0-6 (Mon-Sun)
                        const dayIndex = (date.getDay() + 6) % 7;

                        return {
                            value: d.duration_seconds,
                            dataPointText: isCurrent ? `${Math.floor(d.duration_seconds / 60)}m` : '', // Text only on current
                            label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][dayIndex],
                            dayIndex, // For sorting/aligning
                            // Custom properties
                            notes: d.notes,
                            calmed_by: d.calmed_by,
                            fullDate: date.toLocaleString(),
                            // Style
                            dataPointColor: isCurrent ? '#f3d275' : 'rgba(243, 210, 117, 0.5)',
                            textColor: 'white',
                            textShiftY: -5,
                            textShiftX: -10,
                            // Link to modal
                            onPress: () => {
                                setSelectedPoint({ ...d, fullDate: date.toLocaleString(), type: 'storm' });
                                setDetailModalVisible(true);
                            }
                        };
                    });
                    // Fill gaps for chart consistency (0-6)
                    // Note: Gifted charts might need continuous data points for lining up? 
                    // For simplicity, we just map what we have. 
                    // To align strictly by day, we'd need to fill 0s for missing days.
                    const filledData = Array(7).fill(null).map((_, i) => {
                        const existing = data.find(d => d.dayIndex === i);
                        return existing || { value: 0, label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], dayIndex: i, hideDataPoint: true };
                    });

                    if (isCurrent) setCurrentWeekData(filledData);
                    else setPreviousWeekData(filledData);
                });
            };

            const unsubStormCurr = fetchStorms(currentStart, currentEnd, true);
            const unsubStormPrev = fetchStorms(prevStart, prevEnd, false);

            // Fetch GI
            const fetchGI = (start: Date, end: Date, isCurrent: boolean) => {
                const q = query(
                    collection(db, "gi_logs"),
                    where("timestamp", ">=", Timestamp.fromDate(start)),
                    where("timestamp", "<=", Timestamp.fromDate(end)),
                    orderBy("timestamp", "asc")
                );
                return onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => {
                        const d = doc.data();
                        const date = d.timestamp.toDate();
                        const dayIndex = (date.getDay() + 6) % 7;

                        let color = '#FACC15'; // 5-7
                        if (d.type <= 2) color = '#F87171'; // 1-2
                        else if (d.type >= 3 && d.type <= 4) color = '#4ADE80'; // 3-4

                        // Fade if previous
                        if (!isCurrent) color = 'rgba(200, 200, 200, 0.3)';

                        return {
                            value: d.type,
                            label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][dayIndex],
                            dayIndex,
                            dataPointColor: color,
                            dataPointRadius: 6,
                            // Modal Data
                            typeVal: d.type,
                            fullDate: date.toLocaleString(),
                            onPress: () => {
                                setSelectedPoint({ ...d, fullDate: date.toLocaleString(), type: 'gi', typeVal: d.type });
                                setDetailModalVisible(true);
                            }
                        };
                    });

                    const filledData = Array(7).fill(null).map((_, i) => {
                        const existing = data.find(d => d.dayIndex === i);
                        // Value 0 is off chart effectively if min is 1? Or just hide it.
                        return existing || { value: 0, label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], dayIndex: i, hideDataPoint: true, customDataPoint: () => <View /> };
                    });

                    if (isCurrent) setCurrentGiData(filledData);
                    else setPreviousGiData(filledData);
                });
            };

            const unsubGiCurr = fetchGI(currentStart, currentEnd, true);
            const unsubGiPrev = fetchGI(prevStart, prevEnd, false);

            return () => {
                unsubStormCurr();
                unsubStormPrev();
                unsubGiCurr();
                unsubGiPrev();
            };
        };

        const cleanup = fetchScope();
        return () => { cleanup.then(c => c()); };

    }, [weekOffset]);

    const toggleModal = () => {
        setDetailModalVisible(!detailModalVisible);
        if (detailModalVisible) setSelectedPoint(null);
    };

    return (
        <ImageBackground
            source={require('../../assets/images/background.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <View className="flex-1 bg-black/85" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}>
                    <Text className="text-white text-3xl font-bold mb-6 text-center font-castoro mt-5">
                        {i18n.t('tabReview')}
                    </Text>

                    {/* Week Navigation */}
                    <View className="flex-row justify-between items-center mb-6 bg-[#1a1a1a] p-3 rounded-xl border border-gray-700">
                        <TouchableOpacity onPress={() => setWeekOffset(weekOffset + 1)} className="p-2">
                            <Text className="text-lantern-light font-bold text-xl">{'<'}</Text>
                        </TouchableOpacity>
                        <View className="items-center">
                            <Text className="text-white font-bold font-quicksand">
                                {currentStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {currentEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Text>
                            <Text className="text-gray-400 text-xs font-quicksand">
                                (Comparing to previous week)
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setWeekOffset(Math.max(0, weekOffset - 1))} className="p-2" disabled={weekOffset === 0}>
                            <Text className={`font-bold text-xl ${weekOffset === 0 ? 'text-gray-600' : 'text-lantern-light'}`}>{'>'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Storm Chart Section */}
                    <View className="mb-10 items-center">
                        <Text className="text-white text-xl font-bold mb-4 font-quicksand border-b border-gray-700 pb-2 w-full">
                            Storm Activity
                        </Text>

                        <View style={{ width: screenWidth - 40, alignItems: 'center' }}>
                            <LineChart
                                data={currentWeekData}
                                data2={previousWeekData} // Overlay
                                color="#f3d275"
                                color2="rgba(243, 210, 117, 0.3)" // Faded
                                thickness={3}
                                thickness2={2}
                                dataPointsColor="#f3d275"
                                dataPointsColor2="rgba(243, 210, 117, 0.3)"
                                width={screenWidth - 80} // Centered nicely
                                height={220}
                                spacing={(screenWidth - 100) / 7} // Distribute evenly
                                initialSpacing={20}
                                yAxisTextStyle={{ color: 'gray' }}
                                xAxisLabelTextStyle={{ color: 'gray' }}
                                hideDataPoints={false}
                                isAnimated
                                animationDuration={1000}
                                hideRules
                                yAxisThickness={0}
                                xAxisThickness={1}
                                xAxisColor="gray"
                            />
                        </View>
                        <Text className="text-gray-500 text-xs italic mt-2">Tap a point for details. Faded line is previous week.</Text>
                    </View>

                    {/* GI Log Chart Section */}
                    <View className="mb-20 items-center">
                        <Text className="text-white text-xl font-bold mb-4 font-quicksand border-b border-gray-700 pb-2 w-full">
                            GI Log
                        </Text>

                        <View style={{ width: screenWidth - 40, alignItems: 'center' }}>
                            <LineChart
                                data={currentGiData}
                                data2={previousGiData}
                                color="transparent"
                                color2="transparent"
                                thickness={0}
                                thickness2={0}
                                dataPointsColor="#FACC15"
                                dataPointsColor2="rgba(200, 200, 200, 0.3)"
                                width={screenWidth - 80}
                                height={220}
                                spacing={(screenWidth - 100) / 7}
                                initialSpacing={20}
                                yAxisTextStyle={{ color: 'gray' }}
                                xAxisLabelTextStyle={{ color: 'gray' }}
                                hideRules
                                yAxisThickness={0}
                                xAxisThickness={1}
                                xAxisColor="gray"
                                maxValue={7}
                                noOfSections={7}
                                stepValue={1}
                            />
                            <View className="flex-row justify-between mt-4 px-2 w-full">
                                <View className="flex-row items-center"><View className="w-3 h-3 rounded-full bg-[#F87171] mr-2" /><Text className="text-gray-400 text-xs">Constipated</Text></View>
                                <View className="flex-row items-center"><View className="w-3 h-3 rounded-full bg-[#4ADE80] mr-2" /><Text className="text-gray-400 text-xs">Ideal</Text></View>
                                <View className="flex-row items-center"><View className="w-3 h-3 rounded-full bg-[#FACC15] mr-2" /><Text className="text-gray-400 text-xs">Loose</Text></View>
                            </View>
                        </View>
                    </View>

                    {/* Detail Modal */}
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={detailModalVisible}
                        onRequestClose={() => setDetailModalVisible(false)}
                    >
                        <TouchableOpacity
                            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
                            activeOpacity={1}
                            onPress={() => setDetailModalVisible(false)}
                        >
                            <View className="bg-[#1a1a1a] p-6 rounded-2xl w-full border border-gray-600" onStartShouldSetResponder={() => true}>
                                <Text className="text-lantern-light text-xl font-bold mb-2 font-castoro text-center">
                                    {selectedPoint?.type === 'storm' ? 'Storm Detail' : 'GI Log Detail'}
                                </Text>
                                <Text className="text-gray-400 text-center mb-4 font-quicksand">{selectedPoint?.fullDate}</Text>

                                {selectedPoint?.type === 'storm' && (
                                    <>
                                        <Text className="text-white text-3xl font-bold text-center mb-4">
                                            {Math.floor(selectedPoint.value / 60)}m {selectedPoint.value % 60}s
                                        </Text>

                                        <View className="bg-[#2a2a2a] p-4 rounded-xl mb-4">
                                            <Text className="text-gray-400 text-xs uppercase font-quicksand mb-1">Notes / Triggers</Text>
                                            <Text className="text-white font-quicksand text-base">
                                                {selectedPoint.notes || "No notes recorded."}
                                            </Text>
                                        </View>

                                        {selectedPoint.calmed_by && (
                                            <View className="bg-[#2a2a2a] p-4 rounded-xl">
                                                <Text className="text-gray-400 text-xs uppercase font-quicksand mb-1">Calmed By</Text>
                                                <Text className="text-green-400 font-bold font-quicksand text-base">
                                                    {i18n.t(`calmOption${selectedPoint.calmed_by.charAt(0).toUpperCase() + selectedPoint.calmed_by.slice(1).replace('_', '')}`) || selectedPoint.calmed_by}
                                                </Text>
                                            </View>
                                        )}
                                    </>
                                )}

                                {selectedPoint?.type === 'gi' && (
                                    <>
                                        <View className={`w-16 h-16 rounded-full self-center items-center justify-center mb-4 ${selectedPoint.dataPointColor === '#F87171' ? 'bg-red-400' : selectedPoint.dataPointColor === '#4ADE80' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                            <Text className="text-black font-bold text-2xl font-quicksand">{selectedPoint.typeVal}</Text>
                                        </View>

                                        <View className="bg-[#2a2a2a] p-4 rounded-xl">
                                            <Text className="text-white font-quicksand text-center text-lg">
                                                {i18n.t(`type${selectedPoint.typeVal}`)}
                                            </Text>
                                            <Text className="text-gray-400 font-quicksand text-center mt-2 italic">
                                                {i18n.t(`type${selectedPoint.typeVal}Description`)}
                                            </Text>
                                        </View>
                                    </>
                                )}

                                <TouchableOpacity
                                    className="mt-6 bg-gray-700 p-3 rounded-full items-center"
                                    onPress={() => setDetailModalVisible(false)}
                                >
                                    <Text className="text-white font-bold font-quicksand">Close</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>

                </ScrollView>
            </View>
        </ImageBackground>
    );
}
