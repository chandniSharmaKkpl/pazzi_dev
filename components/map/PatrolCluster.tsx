import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Patrol } from '../../types/patrol';
import { PATROL_COLORS } from '../../constants/Colors';

interface PatrolClusterProps {
    patrols: Patrol[];
    latitude: number;
    longitude: number;
    onPress: () => void;
}

export function PatrolCluster({ patrols, latitude, longitude, onPress }: PatrolClusterProps) {
    // Determine color based on highest probability patrol in the cluster
    const getColor = () => {
        // Check if any patrol is confirmed
        if (patrols.some(p => p.status === 'confirmed')) {
            return PATROL_COLORS.highProbability;
        }

        // Find highest probability
        const maxProbability = Math.max(...patrols.map(p => p.probability));

        if (maxProbability > 0.7) return PATROL_COLORS.highProbability;
        if (maxProbability > 0.4) return PATROL_COLORS.mediumProbability;
        if (maxProbability > 0) return PATROL_COLORS.lowProbability;
        return PATROL_COLORS.historical;
    };

    return (
        <Marker
            coordinate={{ latitude, longitude }}
            tracksViewChanges={false}
            onPress={onPress}
        >
            <View style={[styles.clusterContainer, { backgroundColor: getColor() }]}>
                <Text style={styles.clusterText}>{patrols.length}</Text>
            </View>
        </Marker>
    );
}

const styles = StyleSheet.create({
    clusterContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    clusterText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
});