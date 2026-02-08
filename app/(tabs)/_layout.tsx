import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import TabBarBackground from '@/components/ui/tab-bar-background';
import { useColorScheme } from '@/hooks/use-color-scheme';
import i18n from '../i18n';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#ffffff',
                tabBarInactiveTintColor: '#cccccc',
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: Platform.select({
                    ios: {
                        // Use a transparent background on iOS to show the blur effect
                        position: 'absolute',
                        backgroundColor: '#0a192f', // Dark blue
                    },
                    default: {
                        backgroundColor: '#0a192f', // Dark blue
                    },
                }),
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: i18n.t('tabTracker'),
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="gi-log"
                options={{
                    title: i18n.t('tabGILog'),
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet.clipboard.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="daily-health"
                options={{
                    title: i18n.t('tabDailyHealth'),
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="heart.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="review"
                options={{
                    title: i18n.t('tabReview'),
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
                }}
            />
        </Tabs>
    );
}
