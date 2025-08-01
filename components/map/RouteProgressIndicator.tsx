import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

interface RouteProgressIndicatorProps {
    routeCoordinates: [number, number][];
    userCoordinate: [number, number] | null;
    isActive: boolean;
}

export const RouteProgressIndicator: React.FC<RouteProgressIndicatorProps> = ({
    routeCoordinates,
    userCoordinate,
    isActive,
}) => {
    const [progressCoordinates, setProgressCoordinates] = useState<[number, number][]>([]);
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Calculate progress based on user position
    useEffect(() => {
        if (!isActive || !userCoordinate || routeCoordinates.length === 0) {
            setProgressCoordinates([]);
            return;
        }

        // Find closest point on route to user
        let minDistance = Infinity;
        let closestIndex = 0;

        for (let i = 0; i < routeCoordinates.length; i++) {
            const distance = getDistance(
                userCoordinate[1], // lat
                userCoordinate[0], // lng
                routeCoordinates[i][1], // lat
                routeCoordinates[i][0]  // lng
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }

        // Calculate progress percentage
        const progressPercentage = closestIndex / routeCoordinates.length;
        
        // Update progress coordinates
        const newProgressCoordinates = routeCoordinates.slice(0, closestIndex + 1);
        setProgressCoordinates(newProgressCoordinates);

        // Animate progress
        Animated.timing(progressAnim, {
            toValue: progressPercentage,
            duration: 1000,
            useNativeDriver: false,
        }).start();
    }, [userCoordinate, routeCoordinates, isActive]);

    // Calculate distance between two points
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const R = 6371000; // meters
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    if (!isActive || progressCoordinates.length === 0) return null;

    return (
        <>
            {/* Progress route line (completed portion) */}
            <MapboxGL.ShapeSource
                id="progress-route-shape"
                shape={{
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: progressCoordinates,
                    },
                    properties: {}
                }}
            >
                {/* <MapboxGL.LineLayer
                    id="progress-route-layer"
                    style={{
                        lineColor: '#c0c1c0cb',
                        lineWidth: 10,
                        lineCap: 'round',
                        lineJoin: 'round',
                        lineOpacity: 0.9,
                    }}
                /> */}
            </MapboxGL.ShapeSource>

            {/* Progress dots along the route */}
            {progressCoordinates.map((coord, index) => {
                if (index % 5 === 0) { // Show dots every 5 points
                    return (
                        <MapboxGL.PointAnnotation
                            key={`progress-dot-${index}`}
                            id={`progress-dot-${index}`}
                            coordinate={coord}
                        >
                            <View style={styles.progressDot} />
                        </MapboxGL.PointAnnotation>
                    );
                }
                return null;
            })}
        </>
    );
};

const styles = StyleSheet.create({
    progressDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
        borderWidth: 1,
        borderColor: '#fff',
    },
});

export default RouteProgressIndicator; 