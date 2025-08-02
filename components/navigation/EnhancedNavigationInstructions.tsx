import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';

const { width, height } = Dimensions.get('window');

export interface NavigationInstruction {
    instruction: string;
    distance: number;
    duration: number;
    maneuver: {
        type: string;
        instruction: string;
        bearing_before: number;
        bearing_after: number;
    };
    remainingDistance: number;
    remainingDuration: number;
}

export interface NavigationState {
    isActive: boolean;
    currentStep: NavigationInstruction | null;
    nextStep: NavigationInstruction | null;
    distanceToNextTurn: number;
    timeToNextTurn: number;
    estimatedArrivalTime: Date | null;
    currentRoadName: string;
    speedLimit: number | null;
    userSpeed: number;
    isOffRoute: boolean;
    offRouteDistance: number;
}

interface EnhancedNavigationInstructionsProps {
    navigationState: NavigationState;
    onStopNavigation: () => void;
    onMuteToggle?: (muted: boolean) => void;
    onRecalculateRoute?: () => void;
}

export const EnhancedNavigationInstructions: React.FC<EnhancedNavigationInstructionsProps> = ({
    navigationState,
    onStopNavigation,
    onMuteToggle,
    onRecalculateRoute,
}) => {
    const insets = useSafeAreaInsets();
    const [isMuted, setIsMuted] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Animate in when navigation starts
    useEffect(() => {
        if (navigationState.isActive) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [navigationState.isActive]);

    // Pulse animation for distance updates
    useEffect(() => {
        if (navigationState.distanceToNextTurn <= 100) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [navigationState.distanceToNextTurn]);

    // Voice instructions
    useEffect(() => {
        if (navigationState.isActive && navigationState.currentStep && !isMuted) {
            const instruction = navigationState.currentStep.instruction;
            const distance = formatDistance(navigationState.distanceToNextTurn);
            
            // Speak instruction
            Speech.speak(`${instruction} in ${distance}`, {
                language: 'en-US',
                pitch: 1.0,
                rate: 0.8,
            });
        }
    }, [navigationState.currentStep, navigationState.distanceToNextTurn, isMuted]);

    // Handle mute toggle
    const handleMuteToggle = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        onMuteToggle?.(newMutedState);
        
        if (newMutedState) {
            Speech.stop();
        }
    };

    if (!navigationState.isActive) {
        return null;
    }

    const currentStep = navigationState.currentStep;
    if (!currentStep) return null;

    const getManeuverIcon = (maneuverType: string) => {
        // Google Maps style turn icons with rounded backgrounds
        const iconSize = 32;
        const iconColor = "#fff";
        
        switch (maneuverType) {
            case 'turn-left':
            case 'turn left':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-left-thick" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'turn-right':
            case 'turn right':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-right-thick" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'straight':
            case 'continue':
            case 'depart':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-up-thick" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'uturn':
            case 'u-turn':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="backup-restore" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'sharp-left':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-top-left-thick" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'sharp-right':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-top-right-thick" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'slight-left':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-top-left" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'slight-right':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-top-right" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'roundabout':
            case 'roundabout-left':
            case 'roundabout-right':
            case 'roundabout-straight':
            case 'rotary':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="rotate-360" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'merge':
            case 'merge-left':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="merge" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'merge-right':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="merge" size={iconSize} color={iconColor} style={{ transform: [{ scaleX: -1 }] }} />
                    </View>
                );
            case 'fork':
            case 'fork-left':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="call-split" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'fork-right':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="call-split" size={iconSize} color={iconColor} style={{ transform: [{ scaleX: -1 }] }} />
                    </View>
                );
            case 'ramp':
            case 'on-ramp':
            case 'ramp-right':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-top-right-thick" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'off-ramp':
            case 'ramp-left':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-top-left-thick" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'arrive':
            case 'destination':
                return (
                    <View style={[styles.googleStyleIcon, { backgroundColor: '#4CAF50' }]}>
                        <MaterialCommunityIcons name="flag-checkered" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'exit':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="exit-to-app" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'keep-left':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-top-left" size={iconSize} color={iconColor} />
                    </View>
                );
            case 'keep-right':
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-top-right" size={iconSize} color={iconColor} />
                    </View>
                );
            default:
                return (
                    <View style={styles.googleStyleIcon}>
                        <MaterialCommunityIcons name="arrow-up-thick" size={iconSize} color={iconColor} />
                    </View>
                );
        }
    };

    const formatDistance = (distance: number): string => {
        if (distance >= 1000) {
            return `${(distance / 1000).toFixed(1)} kilometers`;
        }
        return `${Math.round(distance)} meters`;
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.round(seconds / 60);
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins}m`;
        }
        return `${minutes} min`;
    };

    const formatETA = (eta: Date | null): string => {
        if (!eta) return '';
        
        const now = new Date();
        const diffMs = eta.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / (1000 * 60));
        
        if (diffMins < 60) {
            return `${diffMins} min`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        }
    };

    const formatSpeed = (speed: number): string => {
        const speedKmh = speed * 3.6; // Convert m/s to km/h
        return `${speedKmh.toFixed(0)} km/h`;
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [
                        {
                            translateY: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [height, 0],
                            }),
                        },
                    ],
                    opacity: fadeAnim,
                },
            ]}
        >
            {/* Top Navigation Card */}
            <View style={styles.topCard}>
                <View style={styles.instructionContainer}>
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            {
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    >
                        {getManeuverIcon(currentStep.maneuver.type)}
                    </Animated.View>
                    <View style={styles.instructionText}>
                        <Text style={styles.instruction}>{currentStep.instruction}</Text>
                        <Text style={styles.distanceText}>
                            {formatDistance(navigationState.distanceToNextTurn)}
                        </Text>
                    </View>
                </View>
                
                {/* Road and Speed Info */}
                <View style={styles.roadInfo}>
                    <Text style={styles.roadName}>{navigationState.currentRoadName}</Text>
                    {navigationState.speedLimit && (
                        <Text style={styles.speedLimit}>{navigationState.speedLimit} km/h</Text>
                    )}
                </View>
            </View>

            {/* Bottom Summary Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity onPress={onStopNavigation} style={styles.stopButton}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>

                <View style={styles.summaryInfo}>
                    <View style={styles.etaContainer}>
                        <Text style={styles.etaText}>{formatETA(navigationState.estimatedArrivalTime)}</Text>
                        <Text style={styles.etaLabel}>ETA</Text>
                    </View>
                    <View style={styles.speedContainer}>
                        <Text style={styles.speedText}>{formatSpeed(navigationState.userSpeed)}</Text>
                        <Text style={styles.speedLabel}>Speed</Text>
                    </View>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity onPress={handleMuteToggle} style={styles.controlButton}>
                        <Ionicons 
                            name={isMuted ? "volume-mute" : "volume-high"} 
                            size={20} 
                            color="#333" 
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowDetails(!showDetails)} style={styles.controlButton}>
                        <Ionicons name="information-circle" size={20} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Off Route Warning */}
            {navigationState.isOffRoute && (
                <View style={styles.offRouteWarning}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color="#fff" />
                    <Text style={styles.offRouteText}>
                        Off route by {Math.round(navigationState.offRouteDistance)}m
                    </Text>
                    {onRecalculateRoute && (
                        <TouchableOpacity onPress={onRecalculateRoute} style={styles.recalculateButton}>
                            <Text style={styles.recalculateText}>Recalculate</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Detailed Info Panel */}
            {showDetails && (
                <Animated.View style={[styles.detailsPanel, { opacity: fadeAnim }]}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Remaining Distance:</Text>
                        <Text style={styles.detailValue}>
                            {formatDistance(currentStep.remainingDistance)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Remaining Time:</Text>
                        <Text style={styles.detailValue}>
                            {formatTime(currentStep.remainingDuration)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Current Speed:</Text>
                        <Text style={styles.detailValue}>
                            {formatSpeed(navigationState.userSpeed)}
                        </Text>
                    </View>
                    {navigationState.nextStep && (
                        <View style={styles.nextStepContainer}>
                            <Text style={styles.nextStepLabel}>Next:</Text>
                            <Text style={styles.nextStepText}>{navigationState.nextStep.instruction}</Text>
                        </View>
                    )}
                </Animated.View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    topCard: {
        backgroundColor: '#1976D2',
        margin: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    instructionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    instructionText: {
        flex: 1,
    },
    instruction: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    distanceText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    roadInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    roadName: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        flex: 1,
    },
    speedLimit: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    bottomBar: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    stopButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    summaryInfo: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    etaContainer: {
        alignItems: 'center',
    },
    etaText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    etaLabel: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    speedContainer: {
        alignItems: 'center',
    },
    speedText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    speedLabel: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    controls: {
        flexDirection: 'row',
        marginLeft: 12,
    },
    controlButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    offRouteWarning: {
        backgroundColor: '#FF5722',
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    offRouteText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
        marginLeft: 8,
    },
    recalculateButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    recalculateText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    detailsPanel: {
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    nextStepContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    nextStepLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    nextStepText: {
        fontSize: 14,
        color: '#333',
        fontStyle: 'italic',
    },
    googleStyleIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});

export default EnhancedNavigationInstructions; 