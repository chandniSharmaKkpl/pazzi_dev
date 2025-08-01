import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Patrol } from '../../types/patrol';

// Check if we're in Expo Go - simpler approach
const isExpoGo = Platform.OS === 'web' || (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative');
console.log("isExpoGo",isExpoGo)
// Conditional imports
let PointAnnotation: any = null;
try {
  const mapboxModule = require('@rnmapbox/maps');
  PointAnnotation = mapboxModule.PointAnnotation;
} catch (error) {
  console.warn('Mapbox PointAnnotation not available');
}

interface PatrolMarkerProps {
    patrol: Patrol;
    onPress: () => void;
}

export function PatrolMarker({ patrol, onPress }: PatrolMarkerProps) {
    // Memoize the coordinate to prevent unnecessary re-renders
    const memoizedCoordinate = useMemo(() => {
        if (!patrol?.location?.longitude || !patrol?.location?.latitude) {
            return null;
        }
        const { longitude, latitude } = patrol.location;
        if (typeof longitude !== 'number' || typeof latitude !== 'number' || 
            isNaN(longitude) || isNaN(latitude) ||
            longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            return null;
        }
        return [longitude, latitude] as [number, number];
    }, [patrol?.location?.longitude, patrol?.location?.latitude]);

    // Determine color based on probability
    const getColor = () => {
        if (patrol.probability > 0.7) return '#FF3B30'; // Red
        if (patrol.probability > 0.4) return '#FF9500'; // Orange
        if (patrol.probability > 0) return '#FFCC00'; // Yellow
        return '#8E8E93'; // Gray for historical
    };

    // Determine icon based on patrol type
    const getIcon = () => {
        return 'alert-circle-outline';
        // switch (patrol.type) {
        //     case PatrolType.RADAR:
        //         return 'speedometer-outline';
        //     case PatrolType.POLICE:
        //         return 'car-outline';
        //     case PatrolType.ALCOTEST:
        //         return 'flask-outline';
        //     default:
        //         return 'alert-circle-outline';
        // }
    };

    // If Mapbox is available and coordinate is valid, use PointAnnotation
    if (PointAnnotation && memoizedCoordinate) {
        return (
            <PointAnnotation
                id={`patrol-marker-${patrol.id}`}
                coordinate={memoizedCoordinate}
                onSelected={onPress}
            >
                <View style={[styles.markerContainer, { backgroundColor: getColor() }]}>
                  
                </View>
            </PointAnnotation>
        );
    }

    // Fallback - return null as react-native-maps handles markers differently
    return null;
}

const styles = StyleSheet.create({
  markerContainer: {
    width: 20,
    height: 20,
    borderRadius: 10, // half of width/height for a circle
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#FF3B30', // or use getColor()
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});