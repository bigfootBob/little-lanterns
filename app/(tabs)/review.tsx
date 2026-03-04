import { collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, ImageBackground, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';
import i18n from '../i18n';

const screenWidth = Dimensions.get('window').width;

type FilterType = '30' | '90' | 'YTD';

type Episode = {
    id: string;
    timestamp: Date;
    duration_seconds: number;
    notes?: string;
    calmed_by?: string;
};

type GILog = {
    id: string;
    timestamp: Date;
    type: number;
};

export default function ReviewScreen() {
    const insets = useSafeAreaInsets();
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('30');

    // Raw Data
    const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
    const [allGILogs, setAllGILogs] = useState<GILog[]>([]);

    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState<any>(null);

    // Fetch Date Logic: Minimum of 30 days, 90 days, or Jan 1st of current year.
    useEffect(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);

        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Find the absolute oldest date we need to fetch
        const minDate = new Date(Math.min(thirtyDaysAgo.getTime(), ninetyDaysAgo.getTime(), startOfYear.getTime()));

        const unsubEpisodes = onSnapshot(
            query(collection(db, "episodes"), where("timestamp", ">=", Timestamp.fromDate(minDate)), orderBy("timestamp", "asc")),
            (snapshot) => {
                setAllEpisodes(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp.toDate(),
                } as Episode)));
            }
        );

        const unsubGI = onSnapshot(
            query(collection(db, "gi_logs"), where("timestamp", ">=", Timestamp.fromDate(minDate)), orderBy("timestamp", "asc")),
            (snapshot) => {
                setAllGILogs(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp.toDate(),
                } as GILog)));
            }
        );

        return () => {
            unsubEpisodes();
            unsubGI();
        };
    }, []);

    // 1. FILTERING
    const { filteredEpisodes, filteredGI, filterStartDate } = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        if (selectedFilter === '30') startDate.setDate(now.getDate() - 30);
        else if (selectedFilter === '90') startDate.setDate(now.getDate() - 90);
        else if (selectedFilter === 'YTD') startDate = new Date(now.getFullYear(), 0, 1);

        startDate.setHours(0, 0, 0, 0);

        return {
            filteredEpisodes: allEpisodes.filter(e => e.timestamp >= startDate),
            filteredGI: allGILogs.filter(g => g.timestamp >= startDate),
            filterStartDate: startDate
        };
    }, [allEpisodes, allGILogs, selectedFilter]);


    // 2. HEATMAP DATA PREP (24 Grid)
    // Y-axis = Days (Sun-Sat), X-axis = Hours (0-23)
    const heatmapData = useMemo(() => {
        const grid: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
        let maxVal = 0;

        filteredEpisodes.forEach(ep => {
            const day = ep.timestamp.getDay(); // 0 is Sunday
            const hour = ep.timestamp.getHours(); // 0-23
            // Sum duration in minutes
            grid[day][hour] += ep.duration_seconds / 60;
            if (grid[day][hour] > maxVal) maxVal = grid[day][hour];
        });

        return { grid, maxVal };
    }, [filteredEpisodes]);

    // Grouping Helper (Day/Week/Month)
    const getGroupKey = (date: Date, filter: FilterType) => {
        if (filter === '30') {
            // Group by Day: "MM/DD"
            return `${date.getMonth() + 1}/${date.getDate()}`;
        } else if (filter === '90') {
            // Group by Week: "Wk X"
            // Use ISO week logic or simple custom offset
            const startOfYear = new Date(date.getFullYear(), 0, 1);
            const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
            const weekNumber = Math.ceil((date.getDay() + 1 + days) / 7);
            return `Wk${weekNumber}`;
        } else {
            // Group by Month: "Jan", "Feb"
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months[date.getMonth()];
        }
    };

    // Initialize groupings to ensure sequential layout (even if 0)
    const initializeGroups = (filter: FilterType, startDate: Date) => {
        const groups: string[] = [];
        const now = new Date();
        let curr = new Date(startDate);

        while (curr <= now) {
            const key = getGroupKey(curr, filter);
            if (groups.length === 0 || groups[groups.length - 1] !== key) {
                groups.push(key);
            }
            curr.setDate(curr.getDate() + 1); // Advance by day to catch every group boundary
        }
        return groups;
    };

    // 3. INCIDENT STACKED BAR CHART & DURATION VS FREQ PREP
    const { stackedBarData, lineChartData, lineChartData2 } = useMemo(() => {
        const orderedKeys = initializeGroups(selectedFilter, filterStartDate);

        const epGrouped: Record<string, { count: number, totalDuration: number }> = {};
        const giGrouped: Record<string, { count: number }> = {};

        orderedKeys.forEach(k => {
            epGrouped[k] = { count: 0, totalDuration: 0 };
            giGrouped[k] = { count: 0 };
        });

        filteredEpisodes.forEach(ep => {
            const key = getGroupKey(ep.timestamp, selectedFilter);
            if (epGrouped[key]) {
                epGrouped[key].count += 1;
                epGrouped[key].totalDuration += (ep.duration_seconds / 60);
            }
        });

        filteredGI.forEach(gi => {
            const key = getGroupKey(gi.timestamp, selectedFilter);
            // Consider "Distress" GI as types 1, 2, 6, 7 (Constipation or Diarrhea)
            if (giGrouped[key] && (gi.type <= 2 || gi.type >= 6)) {
                giGrouped[key].count += 1;
            }
        });

        const stackedResult: any[] = [];
        const freqLine: any[] = [];
        const durLine: any[] = [];

        // To prevent overcrowding x-axis on 30 day view
        const numLabels = orderedKeys.length;
        const labelInterval = numLabels > 15 ? Math.ceil(numLabels / 6) : 1;

        orderedKeys.forEach((key, index) => {
            const showLabel = index % labelInterval === 0 || index === numLabels - 1;

            // Stacked Bar Data
            stackedResult.push({
                stacks: [
                    { value: giGrouped[key].count, color: '#f87171', marginBottom: 2 }, // Red for GI
                    { value: epGrouped[key].count, color: '#facc15' } // Yellow for Storms
                ],
                label: showLabel ? key : '',
            });

            // Line Chart Data
            freqLine.push({
                value: epGrouped[key].count,
                label: showLabel ? key : '',
                dataPointText: epGrouped[key].count > 0 ? epGrouped[key].count.toString() : ''
            });

            const avgDur = epGrouped[key].count > 0 ? (epGrouped[key].totalDuration / epGrouped[key].count) : 0;
            durLine.push({
                value: avgDur,
            });
        });

        return { stackedBarData: stackedResult, lineChartData: freqLine, lineChartData2: durLine };
    }, [filteredEpisodes, filteredGI, selectedFilter, filterStartDate]);


    const renderHeatmap = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const hours = [0, 4, 8, 12, 16, 20]; // Just showing some axis labels

        return (
            <View className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700 w-full mb-8">
                <Text className="text-white text-lg font-bold mb-1 font-quicksand">Episode Heatmap</Text>
                <Text className="text-gray-400 text-xs mb-4 font-quicksand">Distribution of episodes over 24 hours.</Text>

                <View className="flex-row w-full">
                    {/* Y-Axis */}
                    <View className="mr-2 mt-6 justify-between" style={{ height: 7 * 16 + 6 * 4 }}>
                        {days.map(d => <Text key={d} className="text-gray-500 text-[10px] h-4 font-quicksand">{d}</Text>)}
                    </View>

                    {/* Grid */}
                    <View className="flex-1">
                        {/* X-Axis labels */}
                        <View className="flex-row justify-between mb-2">
                            {hours.map(h => <Text key={h} className="text-gray-500 text-[10px] font-quicksand">{h}:00</Text>)}
                        </View>

                        {heatmapData.grid.map((row, dayIdx) => (
                            <View key={dayIdx} className="flex-row justify-between mb-1 w-full">
                                {row.map((val, hourIdx) => {
                                    // Calculate opacity based on max value (ensure min opacity if > 0)
                                    const opacity = val === 0 ? 0.05 : Math.max(0.2, val / heatmapData.maxVal);
                                    return (
                                        <View
                                            key={hourIdx}
                                            style={{
                                                flex: 1, // Let it shrink to fit perfectly
                                                height: 16,
                                                backgroundColor: `rgba(243, 210, 117, ${opacity})`,
                                                marginHorizontal: 1,
                                                borderRadius: 2
                                            }}
                                        />
                                    );
                                })}
                            </View>
                        ))}
                        <View className="flex-row items-center justify-between mt-4">
                            <Text className="text-gray-500 text-xs font-quicksand">Less</Text>
                            <View className="flex-row gap-1">
                                <View className="w-4 h-4 bg-[#f3d275] opacity-10 rounded-sm" />
                                <View className="w-4 h-4 bg-[#f3d275] opacity-40 rounded-sm" />
                                <View className="w-4 h-4 bg-[#f3d275] opacity-70 rounded-sm" />
                                <View className="w-4 h-4 bg-[#f3d275] opacity-100 rounded-sm" />
                            </View>
                            <Text className="text-gray-500 text-xs font-quicksand">More</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <ImageBackground source={require('../../assets/images/background.webp')} resizeMode="cover" className="flex-1">
            <View className="flex-1 bg-black/85" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>

                {/* Header & Filter */}
                <View className="px-5 pt-5 pb-2 border-b border-gray-800">
                    <Text className="text-white text-3xl font-bold mb-4 text-center font-castoro">{i18n.t('tabReview')}</Text>

                    <View className="flex-row bg-[#1a1a1a] rounded-lg p-1 border border-gray-700">
                        {(['30', '90', 'YTD'] as FilterType[]).map(f => (
                            <TouchableOpacity
                                key={f}
                                onPress={() => setSelectedFilter(f)}
                                className={`flex-1 py-2 rounded-md items-center ${selectedFilter === f ? 'bg-amber-600' : 'bg-transparent'}`}
                            >
                                <Text className={`font-bold font-quicksand ${selectedFilter === f ? 'text-white' : 'text-gray-400'}`}>
                                    {f === 'YTD' ? 'YTD' : `${f} Days`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {allEpisodes.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-gray-400 font-quicksand">Loading data...</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

                        {/* 1. Heatmap View */}
                        {renderHeatmap()}

                        {/* 2. Incident Stacked Bar Chart */}
                        <View className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700 w-full mb-8">
                            <Text className="text-white text-lg font-bold mb-1 font-quicksand">Incident Stacks</Text>
                            <Text className="text-gray-400 text-xs mb-6 font-quicksand">Red = GI Distress | Yellow = Storms</Text>
                            <View style={{ marginLeft: -10 }}>
                                <BarChart
                                    stackData={stackedBarData}
                                    width={screenWidth - 100}
                                    height={200}
                                    barWidth={(screenWidth - 120) / Math.max(stackedBarData.length, 1) - 4}
                                    spacing={4}
                                    hideRules
                                    xAxisThickness={1}
                                    yAxisThickness={0}
                                    xAxisColor="gray"
                                    yAxisTextStyle={{ color: 'gray', fontSize: 10 }}
                                    xAxisLabelTextStyle={{ color: 'gray', fontSize: 10, width: 40, marginLeft: -10 }}
                                    noOfSections={4}
                                    isAnimated
                                />
                            </View>
                        </View>

                        {/* 3. Duration vs Frequency Line Graph */}
                        <View className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700 w-full mb-8">
                            <Text className="text-white text-lg font-bold mb-1 font-quicksand">Duration vs. Frequency</Text>
                            <Text className="text-gray-400 text-xs mb-6 font-quicksand">Solid = Count | Dashed = Avg Duration (mins)</Text>
                            <View style={{ marginLeft: -10 }}>
                                <LineChart
                                    data={lineChartData}
                                    data2={lineChartData2}
                                    width={screenWidth - 100}
                                    height={200}
                                    spacing={(screenWidth - 120) / Math.max(lineChartData.length - 1, 1)}
                                    color="#facc15" // Yellow for Count
                                    color2="#4ade80" // Green for Duration
                                    strokeDashArray2={[5, 5]}
                                    thickness={3}
                                    thickness2={2}
                                    dataPointsColor="#facc15"
                                    dataPointsColor2="#4ade80"
                                    dataPointsRadius={3}
                                    dataPointsRadius2={3}
                                    hideRules
                                    xAxisThickness={1}
                                    yAxisThickness={0}
                                    xAxisColor="gray"
                                    yAxisTextStyle={{ color: 'gray', fontSize: 10 }}
                                    xAxisLabelTextStyle={{ color: 'gray', fontSize: 10, width: 40, marginLeft: -10 }}
                                    noOfSections={4}
                                    isAnimated
                                />
                            </View>
                        </View>

                    </ScrollView>
                )}
            </View>
        </ImageBackground>
    );
}
