import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={({ route }) => ({
                tabBarActiveTintColor: '#0066CC',
                tabBarInactiveTintColor: '#000',
                tabBarLabelStyle: { fontSize: 14, fontWeight: '500' },
                tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee',padding: 30,height: 60,paddingHorizontal: 20 },
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    if (route.name === 'destinations') {
                        return <Feather name="navigation" size={size} color="#000" />;
                    }
                    if (route.name === 'index') {
                        return <Ionicons name="map" size={size} color="#000" />;
                    }
                    if (route.name === 'more') {
                        return <Ionicons name="menu" size={size} color="#000" />;
                    }
                    return null;
                },
            })}
        >
            <Tabs.Screen
                name="destinations"
                options={{
                    title: 'Destinations',
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Map',
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: 'More',
                }}
            />
        </Tabs>
    );
}