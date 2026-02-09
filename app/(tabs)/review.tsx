import { collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Dimensions, ImageBackground, ScrollView, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';
import i18n from '../i18n';

const screenWidth = Dimensions.get('window').width;

export default function ReviewScreen() {
    const [stormData, setStormData] = useState<any[]>([]);
    const [giData, setGiData] = useState<any[]>([]);
    const [selectedStorm, setSelectedStorm] = useState<any>(null);

    useEffect(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const timestamp7DaysAgo = Timestamp.fromDate(sevenDaysAgo);

        // Fetch Storm Episodes
        const stormQuery = query(
            collection(db, "episodes"),
            where("timestamp", ">=", timestamp7DaysAgo),
            orderBy("timestamp", "asc")
        );

        const unsubscribeStorm = onSnapshot(stormQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                const date = d.timestamp.toDate();
                return {
                    value: d.duration_seconds,
                    dataPointText: `${Math.floor(d.duration_seconds / 60)}m ${d.duration_seconds % 60}s`,
                    label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    // Custom properties for tooltip
                    notes: d.notes,
                    calmed_by: d.calmed_by,
                    fullDate: date.toLocaleString(),
                    // Style
                    dataPointColor: '#f3d275',
                    dataPointRadius: 5,
                    textColor: 'white',
                    textShiftY: -5,
                    textShiftX: -10,
                };
            });
            setStormData(data);
        });

        // Fetch GI Logs
        const giQuery = query(
            collection(db, "gi_logs"),
            where("timestamp", ">=", timestamp7DaysAgo),
            orderBy("timestamp", "asc")
        );

        const unsubscribeGi = onSnapshot(giQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                const date = d.timestamp.toDate();
                let color = '#FACC15'; // Default Yellow (5-7)
                if (d.type <= 2) color = '#F87171'; // Red (1-2)
                else if (d.type >= 3 && d.type <= 4) color = '#4ADE80'; // Green (3-4)

                return {
                    value: d.type,
                    label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    dataPointColor: color,
                    dataPointRadius: 6,
                    // Tooltip data if needed, though not explicitly requested for GI
                    type: d.type,
                    fullDate: date.toLocaleString(),
                };
            });
            setGiData(data);
        });

        return () => {
            unsubscribeStorm();
            unsubscribeGi();
        };
    }, []);

    const renderStormTooltip = () => {
        if (!selectedStorm) return (
            <Text className="text-gray-400 text-center italic font-quicksand mt-4">
                Tap a data point to see details.
            </Text>
        );

        return (
            <View className="bg-[#1a3749] p-4 rounded-xl border border-[#f3d275] mt-4 w-full">
                <Text className="text-[#f3d275] font-bold mb-1 font-quicksand">{selectedStorm.fullDate}</Text>

                {selectedStorm.notes ? (
                    <View className="mb-2">
                        <Text className="text-gray-400 text-xs uppercase font-quicksand">Notes/Triggers</Text>
                        <Text className="text-white font-quicksand">{selectedStorm.notes}</Text>
                    </View>
                ) : (
                    <Text className="text-gray-500 italic mb-2 font-quicksand">No notes recorded.</Text>
                )}

                {selectedStorm.calmed_by ? (
                    <View>
                        <Text className="text-gray-400 text-xs uppercase font-quicksand">Calmed By</Text>
                        <Text className="text-white font-bold font-quicksand">{i18n.t(`calmOption${selectedStorm.calmed_by.charAt(0).toUpperCase() + selectedStorm.calmed_by.slice(1).replace('_', '')}`) || selectedStorm.calmed_by}</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <ImageBackground
            source={require('../../assets/images/background.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <SafeAreaView className="flex-1 bg-black/85">
                <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}>
                    <Text className="text-white text-3xl font-bold mb-6 text-center font-castoro mt-5">
                        {i18n.t('tabReview')}
                    </Text>

                    {/* Storm Chart Section */}
                    <View className="mb-10">
                        <Text className="text-white text-xl font-bold mb-4 font-quicksand border-b border-gray-700 pb-2">
                            Storm Activity (Last 7 Days)
                        </Text>

                        {stormData.length > 0 ? (
                            <View>
                                <LineChart
                                    data={stormData}
                                    color="#f3d275"
                                    thickness={3}
                                    dataPointsColor="#f3d275"
                                    onPress={(item: any) => setSelectedStorm(item)}
                                    width={screenWidth - 60}
                                    height={220}
                                    spacing={50} // Adjust based on data density needed
                                    initialSpacing={20}
                                    yAxisTextStyle={{ color: 'gray' }}
                                    xAxisLabelTextStyle={{ color: 'gray' }}
                                    hideDataPoints={false}
                                    isAnimated
                                    animationDuration={1000}
                                    // Hide Y Axis lines to look cleaner
                                    hideRules
                                    yAxisThickness={0}
                                    xAxisThickness={1}
                                    xAxisColor="gray"
                                />
                                {renderStormTooltip()}
                            </View>
                        ) : (
                            <Text className="text-gray-500 text-center py-10 font-quicksand">No storm data recorded this week.</Text>
                        )}
                    </View>

                    {/* GI Log Chart Section */}
                    <View className="mb-10">
                        <Text className="text-white text-xl font-bold mb-4 font-quicksand border-b border-gray-700 pb-2">
                            GI Log (Last 7 Days)
                        </Text>

                        {giData.length > 0 ? (
                            <View>
                                <LineChart
                                    data={giData}
                                    color="transparent" // Hide line, just show points (Scatter-like)
                                    dataPointsColor="#FACC15" // Dynamic via data point
                                    thickness={0}
                                    width={screenWidth - 60}
                                    height={220}
                                    spacing={50}
                                    initialSpacing={20}
                                    yAxisTextStyle={{ color: 'gray' }}
                                    xAxisLabelTextStyle={{ color: 'gray' }}
                                    hideRules
                                    yAxisThickness={0}
                                    xAxisThickness={1}
                                    xAxisColor="gray"
                                    maxValue={7}
                                    noOfSections={7} // 1-7 layout
                                    stepValue={1}
                                />
                                <View className="flex-row justify-between mt-4 px-2">
                                    <View className="flex-row items-center"><View className="w-3 h-3 rounded-full bg-[#F87171] mr-2" /><Text className="text-gray-400 text-xs">Constipated (1-2)</Text></View>
                                    <View className="flex-row items-center"><View className="w-3 h-3 rounded-full bg-[#4ADE80] mr-2" /><Text className="text-gray-400 text-xs">Ideal (3-4)</Text></View>
                                    <View className="flex-row items-center"><View className="w-3 h-3 rounded-full bg-[#FACC15] mr-2" /><Text className="text-gray-400 text-xs">Loose (5-7)</Text></View>
                                </View>
                            </View>
                        ) : (
                            <Text className="text-gray-500 text-center py-10 font-quicksand">No GI logs recorded this week.</Text>
                        )}
                    </View>

                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    );
}
