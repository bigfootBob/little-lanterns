import { Tabs } from 'expo-router';
import React from 'react';
import { Image as RNImage } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import i18n from '../i18n';

import { Modal, Text, TouchableOpacity, View } from 'react-native';

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
    const [modalVisible, setModalVisible] = React.useState(false);

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

            {/* How To Use Link */}
            <View className="absolute bottom-[60px] w-full items-center">
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Text className="text-white/80 font-quicksand underline text-sm">{i18n.t('howToUse')}</Text>
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
        </View>
    );
}
