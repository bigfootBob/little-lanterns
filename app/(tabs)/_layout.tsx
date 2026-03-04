import { Tabs } from 'expo-router';
import React from 'react';
import { Image as RNImage } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import i18n from '../i18n';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const TabIcon = ({ source, focused }: { source: any; focused: boolean }) => (
    <View
        className="w-14 h-14 rounded-full items-center justify-center border"
        style={{
            backgroundColor: '#1a3749',
            borderColor: '#f3d275',
            borderWidth: 1,
            shadowColor: '#f3d275',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 10,
            elevation: 10 // For Android
        }}
    >
        <RNImage
            source={source}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
        />
    </View>
);

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const [modalVisible, setModalVisible] = React.useState(Platform.OS === 'web');
    const [privacyModalVisible, setPrivacyModalVisible] = React.useState(false);

    React.useEffect(() => {
        const checkPrivacyStatus = async () => {
            try {
                const hasAcknowledged = await AsyncStorage.getItem('@privacy_acknowledged');
                if (hasAcknowledged !== 'true') {
                    setPrivacyModalVisible(true);
                }
            } catch (e) {
                console.error("Failed to fetch privacy status from AsyncStorage", e);
            }
        };
        checkPrivacyStatus();
    }, []);

    const acknowledgePrivacy = async () => {
        try {
            await AsyncStorage.setItem('@privacy_acknowledged', 'true');
            setPrivacyModalVisible(false);
        } catch (e) {
            console.error("Failed to save privacy status to AsyncStorage", e);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: '#ffffff',
                    tabBarInactiveTintColor: '#cccccc',
                    headerShown: false,
                    tabBarButton: HapticTab,
                    // tabBarBackground: TabBarBackground, // Removed for transparency
                    tabBarStyle: {
                        position: 'absolute',
                        backgroundColor: 'transparent',
                        borderTopWidth: 0,
                        elevation: 0,
                        height: 90, // Increased height to accommodate larger icons
                        bottom: 70, // Lift icons up by ~1/12th of screen height
                    },
                    tabBarShowLabel: false,
                }}>
                <Tabs.Screen
                    name="index"
                    options={{
                        title: i18n.t('tabTracker'),
                        tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/images/icon-storm.png')} focused={focused} />,
                    }}
                />
                <Tabs.Screen
                    name="gi-log"
                    options={{
                        title: i18n.t('tabGILog'),
                        tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/images/icon-log.png')} focused={focused} />,
                    }}
                />
                <Tabs.Screen
                    name="tips"
                    options={{
                        title: i18n.t('tabTips'),
                        tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/images/icon-tips.png')} focused={focused} />,
                    }}
                />
                <Tabs.Screen
                    name="daily-health"
                    options={{
                        title: i18n.t('tabDailyHealth'),
                        tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/images/icon-meds.png')} focused={focused} />,
                    }}
                />
                <Tabs.Screen
                    name="review"
                    options={{
                        title: i18n.t('tabReview'),
                        tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/images/icon-report.png')} focused={focused} />,
                    }}
                />
            </Tabs>

            {/* Footer Links */}
            <View className="absolute bottom-[60px] w-full flex-row justify-center items-center">
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Text className="text-white/80 font-quicksand underline text-sm">{i18n.t('howToUse')}</Text>
                </TouchableOpacity>
                <Text className="text-white/50 mx-3">|</Text>
                <TouchableOpacity onPress={() => setPrivacyModalVisible(true)}>
                    <Text className="text-white/80 font-quicksand underline text-sm">{i18n.t('privacyFooterLink')}</Text>
                </TouchableOpacity>
            </View>

            {/* Instructions Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/80 p-5">
                    <View className="bg-[#1a3749] rounded-2xl p-6 w-full max-w-md border border-[#f3d275]">
                        <Text className="text-white text-2xl font-bold mb-4 font-castoro text-center">
                            {i18n.t('howToUseTitle')}
                        </Text>
                        <Text className="text-white text-base font-quicksand mb-6">
                            {i18n.t('howToUseContent')}
                        </Text>
                        <TouchableOpacity
                            className="bg-lantern-marine p-3 rounded-full items-center border border-[#f3d275]"
                            onPress={() => setModalVisible(false)}
                        >
                            <Text className="text-white font-bold">{i18n.t('close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Privacy & Disclaimer Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={privacyModalVisible}
                onRequestClose={() => {
                    // Do not allow Android back button to close if unacknowledged, forcing acknowledgment
                }}
            >
                <View className="flex-1 justify-center items-center bg-black/90 p-5">
                    <View className="bg-[#1a3749] rounded-2xl w-full max-w-lg border border-[#f3d275] h-[75vh] flex-col">
                        <View className="p-6 border-b border-gray-600">
                            <Text className="text-white text-2xl font-bold font-castoro text-center">
                                {i18n.t('privacyTitle')}
                            </Text>
                        </View>

                        <ScrollView className="px-6 py-4 flex-1">
                            <Text className="text-white text-base font-quicksand mb-6 leading-relaxed">
                                {i18n.t('privacyContentPart1')}
                            </Text>
                            <Text className="text-white text-base font-quicksand mb-6 leading-relaxed">
                                {i18n.t('privacyContentPart2')}
                            </Text>
                            <Text className="text-white text-base font-quicksand mb-6 leading-relaxed">
                                {i18n.t('privacyContentPart3')}
                            </Text>
                            <Text className="text-white text-base font-quicksand mb-6 leading-relaxed">
                                {i18n.t('privacyContentPart4')}
                            </Text>
                        </ScrollView>

                        <View className="p-6 border-t border-gray-600">
                            <TouchableOpacity
                                className="bg-lantern-marine p-4 rounded-full items-center border border-[#f3d275]"
                                onPress={acknowledgePrivacy}
                            >
                                <Text className="text-white font-bold text-lg">{i18n.t('privacyAgreeButton')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
