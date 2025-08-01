import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Patrol, PatrolType } from '../../types/patrol';
import colors, { COLORS, PATROL_COLORS } from '../../constants/Colors';
import { useTheme, Theme } from '../../context/ThemeContext';
import { useWebSocket } from '../../context/WebSocketContext';

interface PatrolDetailsModalProps {
    patrol: Patrol | null;
    visible: boolean;
    onClose: () => void;
    userLocation?: { latitude: number; longitude: number } | null;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

export function PatrolDetailsModal({ patrol, visible, onClose, userLocation }: PatrolDetailsModalProps) {
    const { theme } = useTheme();
    const styles = createStyles(theme);
    const { send } = useWebSocket();
    const [loading, setLoading] = React.useState<'confirm' | 'deny' | null>(null);
    const [disabledPatrols, setDisabledPatrols] = React.useState<string[]>([]);
    if (!patrol) return null;
    const isDisabled = disabledPatrols.includes(patrol.id);
    let distanceToPatrol = null;
    let isTooFar = false;
    if (userLocation) {
        distanceToPatrol = getDistanceFromLatLonInKm(
            userLocation.latitude,
            userLocation.longitude,
            patrol.location.latitude,
            patrol.location.longitude
        );
        isTooFar = distanceToPatrol > 5;
    }

    const getPatrolColor = () => {
        if (patrol.probability > 0.7) return PATROL_COLORS.highProbability;
        if (patrol.probability > 0.4) return PATROL_COLORS.mediumProbability;
        if (patrol.probability > 0) return PATROL_COLORS.lowProbability;
        return PATROL_COLORS.historical;
    };

    const getPatrolIcon = () => {
        switch (patrol.type) {
            case PatrolType.RADAR:
                return 'speedometer-outline';
            case PatrolType.POLICE:
                return 'car-outline';
            case PatrolType.CAMERA:
                return 'camera-outline';
            default:
                return 'car-outline';
        }
    };

    const getPatrolTypeString = () => {
        switch (patrol.type) {
            case PatrolType.RADAR:
                return 'Police Radar';
            case PatrolType.POLICE:
                return 'Police Patrol';
            case PatrolType.CAMERA:
                return 'Static Camera';
            default:
                return 'Police Patrol';
        }
    }
    const dateObject = new Date(patrol.actual_start_time);
    const formattedTime = dateObject.toLocaleTimeString();
    const formattedDate = dateObject.toLocaleDateString();

    const getPassedTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const diffMinutes = Math.round(diff / (60 * 1000));
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffMinutes > 0) {
            return `${diffMinutes} minutes ago`;
        }
    }
    const agoMinutes = getPassedTime(dateObject);

    const handleAction = async (action: 'confirm' | 'deny') => {
        if (!patrol) return;
        setLoading(action);
        try {
            console.log('Sending WebSocket action:', { type: action === 'confirm' ? 'confirm_patrol' : 'deny_patrol', id: patrol.id });
            send({ type: action === 'confirm' ? 'confirm_patrol' : 'deny_patrol', id: patrol.id });
            setDisabledPatrols((prev) => [...prev, patrol.id]);
        } catch (e) {
            // Optionally show error
        } finally {
            setLoading(null);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View
                    style={[
                        styles.patrolDetailContainer,
                        { backgroundColor: COLORS[theme].backgroundSecondary }
                    ]}
                >
                    <View style={styles.patrolDetailHeader}>
                        <View
                            style={[
                                styles.patrolTypeIndicator,
                                { backgroundColor: getPatrolColor() }
                            ]}
                        >
                            <Ionicons
                                name={getPatrolIcon() as any}
                                size={24}
                                color="#FFFFFF"
                            />
                        </View>
                        <View style={styles.patrolInfo}>
                            <Text style={[styles.patrolType, { color: COLORS[theme].text }]}> {getPatrolTypeString()} </Text>
                            <Text style={[styles.patrolTime, { color: COLORS[theme].textSecondary }]}> First spotted: {agoMinutes} </Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={30} color="black" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.patrolStats}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS[theme].text }]}> {patrol.confirmation_count} </Text>
                            <Text style={[styles.statLabel, { color: COLORS[theme].textSecondary }]}> Confirmations </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS[theme].text }]}> {patrol.denial_count} </Text>
                            <Text style={[styles.statLabel, { color: COLORS[theme].textSecondary }]}> Denials </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS[theme].text }]}> {Math.round(patrol.probability)}% </Text>
                            <Text style={[styles.statLabel, { color: COLORS[theme].textSecondary }]}> Probability </Text>
                        </View>
                    </View>
                    {patrol.description && (
                        <View style={styles.commentSection}>
                            <Text style={[styles.commentTitle, { color: COLORS[theme].text }]}> Description: </Text>
                            <Text style={[styles.commentText, { color: COLORS[theme].textSecondary }]}> {patrol.description} </Text>
                        </View>
                    )}
                    {/* {userLocation && (
                        <Text style={{ color: '#666', textAlign: 'center', marginBottom: 8 }}>
                            Distance to patrol: {distanceToPatrol?.toFixed(2)} km
                        </Text>
                    )} */}
                    {isTooFar && (
                        <Text style={{ color: '#F44336', textAlign: 'center', marginBottom: 8 }}>
                            You must be within 5 km to confirm or deny this patrol.
                        </Text>
                    )}
                    <View style={styles.patrolActions}>
                        <TouchableOpacity
                            style={[styles.denyButton, (isDisabled || isTooFar) && { backgroundColor: '#ccc' }]}
                            onPress={() => handleAction('deny')}
                            disabled={isDisabled || loading === 'confirm' || loading === 'deny' || isTooFar}
                        >
                            {loading === 'deny' ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}> Deny </Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmButton, (isDisabled || isTooFar) && { backgroundColor: '#ccc' }]}
                            onPress={() => handleAction('confirm')}
                            disabled={isDisabled || loading === 'confirm' || loading === 'deny' || isTooFar}
                        >
                            {loading === 'confirm' ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}> Confirm </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const createStyles = (theme: Theme) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    patrolDetailContainer: {
        width:"100%",
        padding: 10,
    },
    patrolDetailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    patrolTypeIndicator: {
        width: 40,
        height: 40,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    patrolInfo: {
        flex: 1,
    },
    patrolType: {
        fontSize: 14,
        fontWeight: '400',
        marginBottom: 2,
    },
    patrolTime: {
        fontSize: 14,
    },
    closeButton: {
    },
    patrolStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        paddingVertical: 16,
        borderTopWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    patrolActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    confirmButton: {
        backgroundColor: colors.COLORS[theme].success,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius:5
    },
    denyButton: {
        backgroundColor: colors.COLORS[theme].error,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius:5
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    commentSection: {
        marginTop: 8,
    },
    commentTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    commentText: {
        fontSize: 14,
        lineHeight: 20,
    },
});