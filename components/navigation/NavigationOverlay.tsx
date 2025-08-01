import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import directionsService from '../../services/map/directionsService';
import MapboxGL from '@rnmapbox/maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Set your actual Mapbox access token here
MapboxGL.setAccessToken('pk.eyJ1IjoibWlraWpha292IiwiYSI6ImNtYjlscWc3YzB6N2Iya3M2cmQxY2Y5eWEifQ.u_y6rM-a77gBQBhZJ8KkNw'); // Place this at the top level, before any map rendering

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface RouteStep {
    instruction: string;
    distance: number;
    duration: number;
    maneuver: {
        type: string;
        instruction: string;
        bearing_before: number;
        bearing_after: number;
    };
}

interface Route {
    distance: number;
    duration: number;
    steps: RouteStep[];
    geometry: {
        type: 'LineString';
        coordinates: [number, number][];
    };
}

interface NavigationOverlayProps {
    origin: Coordinates;
    destination: Coordinates;
    destinationName: string;
    onClose: () => void;
    onStartNavigation: (route: Route) => void;
}

// Helper function to create smooth curved polyline
const createSmoothCurve = (coordinates: [number, number][], smoothness: number = 0.3): [number, number][] => {
    if (coordinates.length < 3) return coordinates;
    
    const smoothCoordinates: [number, number][] = [];
    
    // Add first point
    smoothCoordinates.push(coordinates[0]);
    
    for (let i = 1; i < coordinates.length - 1; i++) {
        const prev = coordinates[i - 1];
        const current = coordinates[i];
        const next = coordinates[i + 1];
        
        // Calculate control points for bezier curve
        const cp1x = current[0] - (next[0] - prev[0]) * smoothness;
        const cp1y = current[1] - (next[1] - prev[1]) * smoothness;
        const cp2x = current[0] + (next[0] - prev[0]) * smoothness;
        const cp2y = current[1] + (next[1] - prev[1]) * smoothness;
        
        // Generate points along the curve
        const steps = 8; // Number of points to generate between each coordinate
        for (let t = 0; t <= 1; t += 1 / steps) {
            const x = Math.pow(1 - t, 3) * prev[0] + 
                     3 * Math.pow(1 - t, 2) * t * cp1x + 
                     3 * (1 - t) * Math.pow(t, 2) * cp2x + 
                     Math.pow(t, 3) * current[0];
            const y = Math.pow(1 - t, 3) * prev[1] + 
                     3 * Math.pow(1 - t, 2) * t * cp1y + 
                     3 * (1 - t) * Math.pow(t, 2) * cp2y + 
                     Math.pow(t, 3) * current[1];
            
            if (t > 0) { // Skip the first point to avoid duplication
                smoothCoordinates.push([x, y]);
            }
        }
    }
    
    // Add last point
    smoothCoordinates.push(coordinates[coordinates.length - 1]);
    
    return smoothCoordinates;
};

// Alternative: Simple curve interpolation
const interpolatePoints = (coordinates: [number, number][]): [number, number][] => {
    if (coordinates.length < 2) return coordinates;
    
    const interpolated: [number, number][] = [];
    
    for (let i = 0; i < coordinates.length - 1; i++) {
        const current = coordinates[i];
        const next = coordinates[i + 1];
        
        interpolated.push(current);
        
        // Add interpolated points between current and next
        const steps = 5;
        for (let j = 1; j < steps; j++) {
            const t = j / steps;
            const x = current[0] + (next[0] - current[0]) * t;
            const y = current[1] + (next[1] - current[1]) * t;
            interpolated.push([x, y]);
        }
    }
    
    interpolated.push(coordinates[coordinates.length - 1]);
    return interpolated;
};

// Helper for Google Maps style icons
const getManeuverIcon = (maneuverType: string) => {
  switch (maneuverType) {
    case 'turn-left':
    case 'left':
      return <MaterialCommunityIcons name="arrow-left-bold" size={36} color="#fff" />;
    case 'turn-right':
    case 'right':
      return <MaterialCommunityIcons name="arrow-right-bold" size={36} color="#fff" />;
    case 'straight':
      return <MaterialCommunityIcons name="arrow-up-bold" size={36} color="#fff" />;
    case 'uturn':
      return <MaterialCommunityIcons name="arrow-u-left-top-bold" size={36} color="#fff" />;
    case 'sharp-left':
      return <MaterialCommunityIcons name="arrow-up-left-bold" size={36} color="#fff" />;
    case 'sharp-right':
      return <MaterialCommunityIcons name="arrow-up-right-bold" size={36} color="#fff" />;
    case 'slight-left':
      return <MaterialCommunityIcons name="arrow-up-left" size={36} color="#fff" />;
    case 'slight-right':
      return <MaterialCommunityIcons name="arrow-up-right" size={36} color="#fff" />;
    case 'roundabout':
      return <MaterialCommunityIcons name="map-marker-radius" size={36} color="#fff" />;
    case 'arrive':
      return <MaterialCommunityIcons name="flag" size={36} color="#fff" />;
    default:
      return <MaterialCommunityIcons name="arrow-up-bold" size={36} color="#fff" />;
  }
};

export function NavigationOverlay({
    origin,
    destination,
    destinationName,
    onClose,
    onStartNavigation
}: NavigationOverlayProps) {
    const insets = useSafeAreaInsets();
    const [route, setRoute] = useState<Route | null>(null);
    const [smoothRoute, setSmoothRoute] = useState<Route | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [navigationStarted, setNavigationStarted] = useState(false);
    const mapRef = useRef<MapboxGL.MapView>(null);
    const { currentPosition, isNavigating } = useNavigation();

    useEffect(() => {
        loadDirections();
    }, []);

    // Update current step based on user's position during navigation
    useEffect(() => {
        if (isNavigating && route && currentPosition) {
            // Find the closest step to current position
            const closestStep = findClosestStep(currentPosition, route.steps);
            if (closestStep !== currentStep) {
                setCurrentStep(closestStep);
                console.log('📋 Navigation step updated to:', closestStep);
            }
        }
    }, [currentPosition, isNavigating, route]);

    // Helper function to find closest step to current position
    const findClosestStep = (position: { latitude: number; longitude: number }, steps: RouteStep[]): number => {
        let closestStep = 0;
        let minDistance = Infinity;

        steps.forEach((step, index) => {
            // Calculate distance to step (simplified)
            const distance = Math.abs(index - currentStep);
            if (distance < minDistance) {
                minDistance = distance;
                closestStep = index;
            }
        });

        return closestStep;
    };

    const loadDirections = async () => {
        setLoading(true);
        try {
            const directions = await directionsService.getDirections(origin, destination);
            if (directions) {
                // Ensure geometry is in correct format
                if (directions.geometry && !directions.geometry.type) {
                    directions.geometry = {
                        type: 'LineString',
                        coordinates: directions.geometry.coordinates
                    };
                }
                
                setRoute(directions);
                
                // Create smooth curved version
                const smoothCoordinates = createSmoothCurve(directions.geometry.coordinates, 0.2);
                const smoothDirections = {
                    ...directions,
                    geometry: {
                        type: 'LineString' as const,
                        coordinates: smoothCoordinates
                    }
                };
                setSmoothRoute(smoothDirections);
                
                console.log('🗺️ Navigation route loaded:', {
                    steps: directions.steps.length,
                    distance: (directions.distance / 1000).toFixed(1) + ' km',
                    duration: Math.round(directions.duration / 60) + ' min',
                    originalPoints: directions.geometry.coordinates.length,
                    smoothPoints: smoothCoordinates.length
                });
            }
        } catch (error) {
            console.error('❌ Failed to load directions:', error);
            Alert.alert('Navigation Error', 'Could not load directions');
        } finally {
            setLoading(false);
        }
    };

    const handleStartNavigation = () => {
        if (route) {
            setNavigationStarted(true);
            onStartNavigation(route);
        }
    };

    const formatDistance = (distance: number): string => {
        if (distance > 1000) {
            return `${(distance / 1000).toFixed(1)} km`;
        }
        return `${Math.round(distance)} m`;
    };

    const formatDuration = (duration: number): string => {
        const minutes = Math.round(duration / 60);
        if (minutes > 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${minutes} min`;
    };

    const getManeuverIcons = (maneuverType: string): string => {
        return directionsService.getManeuverIcon(maneuverType);
    };

    // Calculate bounds for the route
    const getRouteBounds = () => {
        if (!route?.geometry?.coordinates) return null;
        
        const coordinates = route.geometry.coordinates;
        const lngs = coordinates.map(coord => coord[0]);
        const lats = coordinates.map(coord => coord[1]);
        
        return [
            [Math.min(...lngs), Math.min(...lats)], // Southwest
            [Math.max(...lngs), Math.max(...lats)]  // Northeast
        ];
    };

    const MapComponent = () => (
        <MapboxGL.MapView
            ref={mapRef}
            style={{ flex: 1 }}
            styleURL={MapboxGL.StyleURL.Street}
            zoomEnabled={true}
            scrollEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
        >
            <MapboxGL.Camera
                centerCoordinate={[origin.longitude, origin.latitude]}
                zoomLevel={13}
                animationMode="flyTo"
                animationDuration={1000}
                bounds={getRouteBounds() ? {
                    ne: getRouteBounds()[1],
                    sw: getRouteBounds()[0],
                    paddingLeft: 50,
                    paddingRight: 50,
                    paddingTop: 100,
                    paddingBottom: 100
                } : undefined}
            />
            
            {/* Main route polyline - curved and smooth */}
            {smoothRoute?.geometry && (
                <MapboxGL.ShapeSource
                    id="smooth-route-source"
                    shape={{
                        type: 'Feature',
                        properties: {},
                        geometry: smoothRoute.geometry
                    }}
                >
                    <MapboxGL.LineLayer
                        id="smooth-route-line"
                        style={{
                            lineColor: '#1976D2',
                            lineWidth: 6,
                            lineCap: 'round',
                            lineJoin: 'round',
                            lineOpacity: 0.9
                        }}
                    />
                </MapboxGL.ShapeSource>
            )}
            
            {/* Route border/outline for better visibility */}
            {smoothRoute?.geometry && (
                <MapboxGL.ShapeSource
                    id="route-border-source"
                    shape={{
                        type: 'Feature',
                        properties: {},
                        geometry: smoothRoute.geometry
                    }}
                >
                    <MapboxGL.LineLayer
                        id="route-border-line"
                        style={{
                            lineColor: '#ffffff',
                            lineWidth: 8,
                            lineCap: 'round',
                            lineJoin: 'round',
                            lineOpacity: 0.8
                        }}
                        layerIndex={0}
                    />
                </MapboxGL.ShapeSource>
            )}
            
            {/* Origin marker */}
            <MapboxGL.PointAnnotation
                id="origin-marker"
                coordinate={[origin.longitude, origin.latitude]}
            >
                <View style={styles.markerContainer}>
                    <View style={[styles.marker, { backgroundColor: '#4CAF50' }]}>
                        <Ionicons name="location" size={20} color="#fff" />
                    </View>
                </View>
            </MapboxGL.PointAnnotation>
            
            {/* Destination marker */}
            <MapboxGL.PointAnnotation
                id="destination-marker"
                coordinate={[destination.longitude, destination.latitude]}
            >
                <View style={styles.markerContainer}>
                    <View style={[styles.marker, { backgroundColor: '#F44336' }]}>
                        <Ionicons name="flag" size={20} color="#fff" />
                    </View>
                </View>
            </MapboxGL.PointAnnotation>
        </MapboxGL.MapView>
    );

    // --- PREVIEW MODE: Only map, route, and Start Navigation button ---
    if (!loading && route && !navigationStarted) {
        return (
            <View style={[styles.container, { paddingTop: 0 }]}> 
                {/* MapView with route polyline and markers */}
                <View style={{ flex: 1, minHeight: 300 }}>
                    <MapComponent />
                </View>
                
                {/* Route Info Card */}
                <View style={styles.routeInfoCard}>
                    <View style={styles.routeInfoHeader}>
                        <Text style={styles.routeInfoTitle}>Route to {destinationName}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButtonSmall}>
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.routeInfoStats}>
                        <View style={styles.statItem}>
                            <Ionicons name="time-outline" size={16} color="#666" />
                            <Text style={styles.statText}>{formatDuration(route.duration)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="location-outline" size={16} color="#666" />
                            <Text style={styles.statText}>{formatDistance(route.distance)}</Text>
                        </View>
                    </View>
                </View>
                
                {/* Start Navigation Button */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={styles.startButton}
                        onPress={handleStartNavigation}
                    >
                        <Ionicons name="navigate" size={24} color="#fff" />
                        <Text style={styles.startButtonText}>Start Navigation</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- ACTIVE NAVIGATION MODE: Google Maps style turn-by-turn UI ---
    if (!loading && route && navigationStarted) {
        return (
            <View style={[styles.container, { paddingTop: 0 }]}> 
                {/* MapView with route polyline and markers */}
                <View style={{ flex: 1, minHeight: 250 }}>
                    <MapComponent />
                    
                    {/* Navigation Card (like Google Maps) - Overlay on map */}
                    {route.steps[currentStep] && (
                        <View style={styles.turnCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={styles.turnIconContainer}>
                                    {getManeuverIcon(route.steps[currentStep].maneuver.type)}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.turnDistance}>
                                        {formatDistance(route.steps[currentStep].distance)}
                                    </Text>
                                    <Text style={styles.turnInstruction} numberOfLines={2}>
                                        {route.steps[currentStep].instruction}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                    
                    {/* Close button overlay */}
                    <TouchableOpacity 
                        onPress={onClose} 
                        style={styles.closeButtonOverlay}
                    > 
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                
                {/* Header and summary below the map */}
                <View style={styles.header}>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title}>Navigation to {destinationName}</Text>
                        <Text style={styles.subtitle}>
                            {formatDistance(route.distance)} • {formatDuration(route.duration)}
                        </Text>
                    </View>
                </View>
                
                {/* Route Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Ionicons name="time-outline" size={20} color="#666" />
                        <Text style={styles.summaryText}>{formatDuration(route.duration)}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Ionicons name="location-outline" size={20} color="#666" />
                        <Text style={styles.summaryText}>{formatDistance(route.distance)}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Ionicons name="navigate-outline" size={20} color="#666" />
                        <Text style={styles.summaryText}>{route.steps.length} steps</Text>
                    </View>
                </View>
                
                {/* Turn-by-turn Instructions */}
                <ScrollView style={styles.instructionsContainer} showsVerticalScrollIndicator={false}>
                    {route.steps.map((step, index) => (
                        <TouchableOpacity key={index} onPress={() => setCurrentStep(index)}>
                            <View style={[
                                styles.stepContainer, 
                                currentStep === index && styles.stepContainerActive
                            ]}> 
                                <View style={styles.stepIcon}>
                                    <Text style={styles.maneuverIcon}>
                                        {getManeuverIcons(step.maneuver.type)}
                                    </Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepInstruction}>{step.instruction}</Text>
                                    <Text style={styles.stepDistance}>
                                        {formatDistance(step.distance)} • {formatDuration(step.duration)}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    }

    // Loading state
    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Loading Directions...</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <Ionicons name="navigate" size={48} color="#0066CC" />
                    <Text style={styles.loadingText}>Calculating route to {destinationName}</Text>
                </View>
            </View>
        );
    }

    // Error state
    if (!route) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Navigation</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={48} color="#ff4444" />
                    <Text style={styles.errorText}>Could not find route</Text>
                    <TouchableOpacity onPress={loadDirections} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerInfo: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    closeButton: {
        padding: 8,
    },
    closeButtonSmall: {
        padding: 4,
    },
    closeButtonOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    marker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    routeInfoCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    routeInfoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    routeInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    routeInfoStats: {
        flexDirection: 'row',
        gap: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 14,
        color: '#666',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 16,
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        marginTop: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#0066CC',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryText: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    instructionsContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    stepContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    stepContainerActive: {
        backgroundColor: '#e3f2fd',
    },
    stepIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f8ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    maneuverIcon: {
        fontSize: 20,
    },
    stepContent: {
        flex: 1,
    },
    stepInstruction: {
        fontSize: 16,
        color: '#000',
        marginBottom: 4,
    },
    stepDistance: {
        fontSize: 14,
        color: '#666',
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    startButton: {
        backgroundColor: '#1976D2',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    turnCard: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: '#1976D2',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 10,
    },
    turnIconContainer: {
        width: 48, 
        height: 48, 
        borderRadius: 24, 
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 12,
    },
    turnDistance: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    turnInstruction: {
        fontSize: 16,
        color: '#fff',
        lineHeight: 20,
    },
});