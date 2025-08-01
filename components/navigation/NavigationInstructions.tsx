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
        switch (type) {
            case 'turn-left':
            case 'turn left':
                return <MaterialCommunityIcons name="arrow-left-bold" size={32} color="#fff" />;
            case 'turn-right':
            case 'turn right':
                return <MaterialCommunityIcons name="arrow-right-bold" size={32} color="#fff" />;
            case 'straight':
            case 'continue':
            case 'depart':
                return <MaterialCommunityIcons name="arrow-up-bold" size={32} color="#fff" />;
            case 'uturn':
            case 'u-turn':
                return <MaterialCommunityIcons name="backup-restore" size={32} color="#fff" />;
            case 'sharp-left':
                return <MaterialCommunityIcons name="arrow-up-left-bold" size={32} color="#fff" />;
            case 'sharp-right':
                return <MaterialCommunityIcons name="arrow-up-right-bold" size={32} color="#fff" />;
            case 'slight-left':
                return <MaterialCommunityIcons name="arrow-up-left" size={32} color="#fff" />;
            case 'slight-right':
                return <MaterialCommunityIcons name="arrow-up-right" size={32} color="#fff" />;
            case 'roundabout':
            case 'roundabout-left':
            case 'roundabout-right':
            case 'roundabout-straight':
            case 'rotary':
                return <MaterialCommunityIcons name="rotate-360" size={32} color="#fff" />;
            case 'arrive':
            case 'destination':
                return <MaterialCommunityIcons name="flag-checkered" size={32} color="#fff" />;
            default:
                return <MaterialCommunityIcons name="arrow-up-bold" size={32} color="#fff" />;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.distance}>{(distance / 1000).toFixed(1)} km</Text>
                <Text style={styles.duration}>{Math.round(duration / 60)} min</Text>
            </View>
            <View style={styles.instructionsContainer}>
                {getManeuverIcon(maneuverType)}
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
