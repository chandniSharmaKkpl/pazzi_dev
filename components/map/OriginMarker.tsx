import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

interface OriginMarkerProps {
    coordinate: [number, number];
    onPress?: () => void;
}

export const OriginMarker: React.FC<OriginMarkerProps> = ({ coordinate, onPress }) => {
    // Validate coordinates
    if (!coordinate || coordinate.length !== 2 || 
        typeof coordinate[0] !== 'number' || typeof coordinate[1] !== 'number' ||
        isNaN(coordinate[0]) || isNaN(coordinate[1])) {
        console.warn('Invalid coordinate for OriginMarker:', coordinate);
        return null;
    }

    return (
        <MapboxGL.PointAnnotation
            id="origin-marker"
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
        backgroundColor: '#4CAF50', // Green color for origin
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