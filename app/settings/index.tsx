import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsScreen() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const insets = useSafeAreaInsets();

    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [patrolAlertsEnabled, setPatrolAlertsEnabled] = React.useState(true);
    const [voiceAlertsEnabled, setVoiceAlertsEnabled] = React.useState(true);
    const [useMetricUnits, setUseMetricUnits] = React.useState(true);
    const [showTrafficData, setShowTrafficData] = React.useState(true);
    const [autoNightMode, setAutoNightMode] = React.useState(true);
    const [reportPowerSaving, setReportPowerSaving] = React.useState(false);

    return (
        <View style={[styles.container, { backgroundColor: COLORS[theme].background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Settings',
                    headerStyle: { backgroundColor: COLORS[theme].background },
                    headerTitleStyle: { color: COLORS[theme].text, fontSize: 20 },
                    headerShadowVisible: false,
                }}
            />

            <ScrollView style={styles.content}>
                <Text style={[styles.sectionTitle, { color: COLORS[theme].text }]}>
                    Appearance
                </Text>

                <View style={styles.settingsGroup}>
                    <View
                        style={[styles.settingItem, { backgroundColor: COLORS[theme].backgroundSecondary }]}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: COLORS[theme].text }]}>
                                Dark Mode
                            </Text>
                            <Text style={[styles.settingDescription, { color: COLORS[theme].textSecondary }]}>
                                Use dark theme for the application
                            </Text>
                        </View>
                        <Switch
                            value={theme === 'dark'}
                            onValueChange={toggleTheme}
                            trackColor={{
                                false: '#767577',
                                true: COLORS[theme].primary + '80'
                            }}
                            thumbColor={theme === 'dark' ? COLORS[theme].primary : '#f4f3f4'}
                        />
                    </View>

                    <View
                        style={[styles.settingItem, { backgroundColor: COLORS[theme].backgroundSecondary }]}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: COLORS[theme].text }]}>
                                Automatic Night Mode
                            </Text>
                            <Text style={[styles.settingDescription, { color: COLORS[theme].textSecondary }]}>
                                Switch to dark mode at sunset
                            </Text>
                        </View>
                        <Switch
                            value={autoNightMode}
                            onValueChange={setAutoNightMode}
                            trackColor={{
                                false: '#767577',
                                true: COLORS[theme].primary + '80'
                            }}
                            thumbColor={autoNightMode ? COLORS[theme].primary : '#f4f3f4'}
                        />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: COLORS[theme].text, marginTop: 24 }]}>
                    Notifications
                </Text>

                <View style={styles.settingsGroup}>
                    <View
                        style={[styles.settingItem, { backgroundColor: COLORS[theme].backgroundSecondary }]}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: COLORS[theme].text }]}>
                                Enable Notifications
                            </Text>
                            <Text style={[styles.settingDescription, { color: COLORS[theme].textSecondary }]}>
                                Receive notifications from the app
                            </Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{
                                false: '#767577',
                                true: COLORS[theme].primary + '80'
                            }}
                            thumbColor={notificationsEnabled ? COLORS[theme].primary : '#f4f3f4'}
                        />
                    </View>

                    <View
                        style={[styles.settingItem, { backgroundColor: COLORS[theme].backgroundSecondary }]}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: COLORS[theme].text }]}>
                                Patrol Alerts
                            </Text>
                            <Text style={[styles.settingDescription, { color: COLORS[theme].textSecondary }]}>
                                Notify about patrols on your route
                            </Text>
                        </View>
                        <Switch
                            value={patrolAlertsEnabled}
                            onValueChange={setPatrolAlertsEnabled}
                            trackColor={{
                                false: '#767577',
                                true: COLORS[theme].primary + '80'
                            }}
                            thumbColor={patrolAlertsEnabled ? COLORS[theme].primary : '#f4f3f4'}
                        />
                    </View>

                    <View
                        style={[styles.settingItem, { backgroundColor: COLORS[theme].backgroundSecondary }]}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: COLORS[theme].text }]}>
                                Voice Alerts
                            </Text>
                            <Text style={[styles.settingDescription, { color: COLORS[theme].textSecondary }]}>
                                Read alerts aloud while driving
                            </Text>
                        </View>
                        <Switch
                            value={voiceAlertsEnabled}
                            onValueChange={setVoiceAlertsEnabled}
                            trackColor={{
                                false: '#767577',
                                true: COLORS[theme].primary + '80'
                            }}
                            thumbColor={voiceAlertsEnabled ? COLORS[theme].primary : '#f4f3f4'}
                        />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: COLORS[theme].text, marginTop: 24 }]}>
                    Map & Navigation
                </Text>

                <View style={styles.settingsGroup}>
                    <View
                        style={[styles.settingItem, { backgroundColor: COLORS[theme].backgroundSecondary }]}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: COLORS[theme].text }]}>
                                Use Metric Units
                            </Text>
                            <Text style={[styles.settingDescription, { color: COLORS[theme].textSecondary }]}>
                                Display distances in kilometers
                            </Text>
                        </View>
                        <Switch
                            value={useMetricUnits}
                            onValueChange={setUseMetricUnits}
                            trackColor={{
                                false: '#767577',
                                true: COLORS[theme].primary + '80'
                            }}
                            thumbColor={useMetricUnits ? COLORS[theme].primary : '#f4f3f4'}
                        />
                    </View>

                    <View
                        style={[styles.settingItem, { backgroundColor: COLORS[theme].backgroundSecondary }]}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: COLORS[theme].text }]}>
                                Show Traffic Data
                            </Text>
                            <Text style={[styles.settingDescription, { color: COLORS[theme].textSecondary }]}>
                                Display traffic data on the map
                            </Text>
                        </View>
                        <Switch
                            value={showTrafficData}
                            onValueChange={setShowTrafficData}
                            trackColor={{
                                false: '#767577',
                                true: COLORS[theme].primary + '80'
                            }}
                            thumbColor={showTrafficData ? COLORS[theme].primary : '#f4f3f4'}
                        />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: COLORS[theme].text, marginTop: 24 }]}>
                    Performance & Battery
                </Text>

                <View style={styles.settingsGroup}>
                    <View
                        style={[styles.settingItem, { backgroundColor: COLORS[theme].backgroundSecondary }]}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: COLORS[theme].text }]}>
                                Power Saving Mode
                            </Text>
                            <Text style={[styles.settingDescription, { color: COLORS[theme].textSecondary }]}>
                                Reduce background reporting to save battery
                            </Text>
                        </View>
                        <Switch
                            value={reportPowerSaving}
                            onValueChange={setReportPowerSaving}
                            trackColor={{
                                false: '#767577',
                                true: COLORS[theme].primary + '80'
                            }}
                            thumbColor={reportPowerSaving ? COLORS[theme].primary : '#f4f3f4'}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.settingButton, { backgroundColor: COLORS[theme].backgroundSecondary }]}
                        onPress={() => console.log('Clear cache')}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: COLORS[theme].text }]}>
                                Clear Cache
                            </Text>
                            <Text style={[styles.settingDescription, { color: COLORS[theme].textSecondary }]}>
                                Free up space by clearing cached maps and routes
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={COLORS[theme].textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    settingsGroup: {
        marginBottom: 8,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    settingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 14,
    },
});