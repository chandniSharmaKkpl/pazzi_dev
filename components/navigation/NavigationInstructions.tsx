import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '../../context/NavigationContext';

const { width } = Dimensions.get('window');

export function NavigationInstructions() {
    const { isNavigating, route, stopNavigation } = useNavigation();
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (!isNavigating) {
            setCurrentStep(0);
        }
    }, [isNavigating]);

    if (!isNavigating || !route) {
        return null;
    }

    const { steps, distance, duration } = route;
    const instruction = steps[currentStep].maneuver.instruction;
    const distanceToNext = steps[currentStep].distance;
    const maneuverType = steps[currentStep].maneuver.type;

    const getManeuverIcon = (type: string) => {
        // Enhanced Google Maps style navigation icons
        switch (type) {
            case 'turn-left':
            case 'turn left':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-left-thick" size={36} color="#fff" />
                    </View>
                );
            case 'turn-right':
            case 'turn right':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-right-thick" size={36} color="#fff" />
                    </View>
                );
            case 'straight':
            case 'continue':
            case 'depart':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-up-thick" size={36} color="#fff" />
                    </View>
                );
            case 'uturn':
            case 'u-turn':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="backup-restore" size={36} color="#fff" />
                    </View>
                );
            case 'sharp-left':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-top-left-thick" size={36} color="#fff" />
                    </View>
                );
            case 'sharp-right':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-top-right-thick" size={36} color="#fff" />
                    </View>
                );
            case 'slight-left':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-top-left" size={36} color="#fff" />
                    </View>
                );
            case 'slight-right':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-top-right" size={36} color="#fff" />
                    </View>
                );
            case 'roundabout':
            case 'roundabout-left':
            case 'roundabout-right':
            case 'roundabout-straight':
            case 'rotary':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="rotate-360" size={36} color="#fff" />
                    </View>
                );
            case 'arrive':
            case 'destination':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="flag-checkered" size={36} color="#fff" />
                    </View>
                );
            case 'merge':
            case 'merge-left':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="merge" size={36} color="#fff" />
                    </View>
                );
            case 'merge-right':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="merge" size={36} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
                    </View>
                );
            case 'fork-left':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="call-split" size={36} color="#fff" />
                    </View>
                );
            case 'fork-right':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="call-split" size={36} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
                    </View>
                );
            case 'ramp-left':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-top-left-thick" size={36} color="#fff" />
                    </View>
                );
            case 'ramp-right':
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-top-right-thick" size={36} color="#fff" />
                    </View>
                );
            default:
                return (
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="arrow-up-thick" size={36} color="#fff" />
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.distance}>{(distance / 1000).toFixed(1)} km</Text>
                <Text style={styles.duration}>{Math.round(duration / 60)} min</Text>
            </View>
            <View style={styles.instructionsContainer}>
                <View style={styles.maneuverIconWrapper}>
                    {getManeuverIcon(maneuverType)}
                </View>
                <View style={styles.instructionTextContainer}>
                    <Text style={styles.instruction}>{instruction}</Text>
                    <Text style={styles.nextStepDistance}>In {distanceToNext.toFixed(0)} meters</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.stopButton} onPress={stopNavigation}>
                <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0066CC',
        padding: 16,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    distance: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    duration: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    instructionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    maneuverIconWrapper: {
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    instructionTextContainer: {
        flex: 1,
    },
    instruction: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        flexWrap: 'wrap',
    },
    nextStepDistance: {
        fontSize: 14,
        color: '#f0f0f0',
        marginTop: 4,
    },
    stopButton: {
        position: 'absolute',
        bottom: -50,
        alignSelf: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    stopButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0066CC',
    },
});
