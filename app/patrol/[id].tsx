import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';
import { usePatrols } from '../../context/PatrolContext';
import { Patrol, PatrolType } from '../../types/patrol';

export default function PatrolDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { getPatrol, confirmPatrol, denyPatrol } = usePatrols();

    const [patrol, setPatrol] = useState<Patrol | null>(null);

    useEffect(() => {
        if (id) {
            // Fetch patrol details
            const fetchedPatrol = getPatrol(id.toString());
            setPatrol(fetchedPatrol);
        }
    }, [id]);

    // Handle confirmation of patrol
    const handleConfirm = () => {
        if (patrol) {
            confirmPatrol(patrol.id);
            router.back();
        }
    };

    // Handle denial of patrol
    const handleDeny = () => {
        if (patrol) {
            denyPatrol(patrol.id);
            router.back();
        }
    };

    // Handle route around option
    const handleRouteAround = () => {
        if (patrol) {
            // Navigate to map with routing options
            router.push({
                pathname: '/(tabs)',
                params: {
                    avoidPatrol: patrol.id,
                    patrolLat: patrol.location.latitude,
                    patrolLng: patrol.location.longitude
                }
            });
        }
    };

    if (!patrol) {
        return (
            <View style={[styles.container, { backgroundColor: COLORS[theme].background }]}>
                <Text style={[styles.loadingText, { color: COLORS[theme].text }]}>Loading...</Text>
            </View>
        );
    }

    // Helper to format time
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Helper to get patrol type display name
    const getPatrolTypeName = (type: PatrolType) => {
        switch (type) {
            case PatrolType.RADAR: return 'Radar';
            case PatrolType.POLICE: return 'Police Vehicle';
            case PatrolType.ALCOTEST: return 'Alcohol Check';
            case PatrolType.CAMERA: return 'Speed Camera';
            case PatrolType.ACCIDENT: return 'Accident';
            case PatrolType.ROAD_BLOCK: return 'Road Block';
            default: return 'Unknown';
        }
    };

    // Helper to get probability display
    const getProbabilityDisplay = (probability: number) => {
        if (probability > 0.7) return 'High';
        if (probability > 0.4) return 'Medium';
        return 'Low';
    };

    return (
        <View style={[styles.container, { backgroundColor: COLORS[theme].background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Patrol Details',
                    headerStyle: { backgroundColor: COLORS[theme].background },
                    headerTitleStyle: { color: COLORS[theme].text, fontSize: 20 },
                    headerShadowVisible: false,
                }}
            />

            <ScrollView style={styles.content}>
                <View style={[styles.card, { backgroundColor: COLORS[theme].backgroundSecondary }]}>
                    <View style={styles.headerRow}>
                        <View style={styles.typeContainer}>
                            <Text style={[styles.typeLabel, { color: COLORS[theme].textSecondary }]}>Patrol Type</Text>
                            <Text style={[styles.typeValue, { color: COLORS[theme].text }]}>
                                {getPatrolTypeName(patrol.type)}
                            </Text>
                        </View>

                        <View style={styles.timeContainer}>
                            <Text style={[styles.timeLabel, { color: COLORS[theme].textSecondary }]}>Reported</Text>
                            <Text style={[styles.timeValue, { color: COLORS[theme].text }]}>
                                {formatTime(patrol.timestamp)}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: COLORS[theme].border }]} />

                    <View style={styles.probabilityContainer}>
                        <Text style={[styles.probabilityLabel, { color: COLORS[theme].textSecondary }]}>
                            Probability
                        </Text>
                        <View style={styles.probabilityBarContainer}>
                            <View
                                style={[
                                    styles.probabilityBar,
                                    { width: `${patrol.probability * 100}%`, backgroundColor: COLORS[theme].primary }
                                ]}
                            />
                        </View>
                        <Text style={[styles.probabilityText, { color: COLORS[theme].text }]}>
                            {getProbabilityDisplay(patrol.probability)}
                        </Text>
                    </View>

                    {patrol.comment && (
                        <>
                            <View style={[styles.divider, { backgroundColor: COLORS[theme].border }]} />
                            <View style={styles.commentContainer}>
                                <Text style={[styles.commentLabel, { color: COLORS[theme].textSecondary }]}>
                                    Comments
                                </Text>
                                <Text style={[styles.commentText, { color: COLORS[theme].text }]}>
                                    {patrol.comment}
                                </Text>
                            </View>
                        </>
                    )}

                    <View style={[styles.divider, { backgroundColor: COLORS[theme].border }]} />

                    <View style={styles.verificationContainer}>
                        <Text style={[styles.verificationLabel, { color: COLORS[theme].textSecondary }]}>
                            Verifications
                        </Text>
                        <View style={styles.verificationRow}>
                            <View style={styles.verificationItem}>
                                <Text style={[styles.verificationCount, { color: COLORS[theme].text }]}>
                                    {patrol.confirmations}
                                </Text>
                                <Text style={[styles.verificationText, { color: COLORS[theme].textSecondary }]}>
                                    Confirmed
                                </Text>
                            </View>

                            <View style={styles.verificationItem}>
                                <Text style={[styles.verificationCount, { color: COLORS[theme].text }]}>
                                    {patrol.denials}
                                </Text>
                                <Text style={[styles.verificationText, { color: COLORS[theme].textSecondary }]}>
                                    Denied
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={[
                styles.footer,
                {
                    backgroundColor: COLORS[theme].background,
                    paddingBottom: insets.bottom + 16,
                    paddingTop: 16
                }
            ]}>
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.denyButton, { backgroundColor: COLORS[theme].error }]}
                        onPress={handleDeny}
                    >
                        <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Deny</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.confirmButton, { backgroundColor: COLORS[theme].success }]}
                        onPress={handleConfirm}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Confirm</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.routeAroundButton, { backgroundColor: COLORS[theme].primary }]}
                    onPress={handleRouteAround}
                >
                    <Ionicons name="navigate" size={24} color="#FFFFFF" />
                    <Text style={styles.routeAroundText}>Route Around</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingText: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 24,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        borderRadius: 16,
        padding: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    typeContainer: {
        flex: 1,
    },
    typeLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    typeValue: {
        fontSize: 20,
        fontWeight: '600',
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    timeLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    probabilityContainer: {
        marginBottom: 8,
    },
    probabilityLabel: {
        fontSize: 16,
        marginBottom: 8,
    },
    probabilityBarContainer: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginBottom: 8,
    },
    probabilityBar: {
        height: 8,
        borderRadius: 4,
    },
    probabilityText: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'right',
    },
    commentContainer: {
        marginBottom: 8,
    },
    commentLabel: {
        fontSize: 16,
        marginBottom: 8,
    },
    commentText: {
        fontSize: 16,
        lineHeight: 24,
    },
    verificationContainer: {
        marginBottom: 8,
    },
    verificationLabel: {
        fontSize: 16,
        marginBottom: 12,
    },
    verificationRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    verificationItem: {
        alignItems: 'center',
    },
    verificationCount: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    verificationText: {
        fontSize: 14,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
        width: '48%',
    },
    denyButton: {},
    confirmButton: {},
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    routeAroundButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
    },
    routeAroundText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
});
