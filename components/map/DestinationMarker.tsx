import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

interface DestinationMarkerProps {
    coordinate: [number, number];
    onPress?: () => void;
}

export const DestinationMarker: React.FC<DestinationMarkerProps> = ({ coordinate, onPress }) => {
    // Validate coordinates
    if (!coordinate || coordinate.length !== 2 || 
        typeof coordinate[0] !== 'number' || typeof coordinate[1] !== 'number' ||
        isNaN(coordinate[0]) || isNaN(coordinate[1])) {
        console.warn('Invalid coordinate for DestinationMarker:', coordinate);
        return null;
    }

    return (
        <MapboxGL.PointAnnotation
            id="destination-marker"
            coordinate={coordinate}
            onSelected={onPress}
        >
            <View style={styles.markerContainer}>
                <View style={styles.marker}>
                    <View style={styles.innerDot} />
                </View>
                <View style={styles.shadow} />
            </View>
        </MapboxGL.PointAnnotation>
    );
};

const styles = StyleSheet.create({
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    marker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F44336', // Red color for destination
        borderWidth: 3,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 6,
    },
    innerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    shadow: {
        position: 'absolute',
        top: 22,
        width: 16,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        zIndex: -1,
    },
});