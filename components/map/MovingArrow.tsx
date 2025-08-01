import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapboxGL from '@rnmapbox/maps';

interface MovingArrowProps {
    coordinate: [number, number];
    heading: number;
    isActive: boolean;
    speed: number;
}

interface PositionHistory {
    coordinate: [number, number];
    timestamp: number;
    heading: number;
    speed: number;
}

export const MovingArrow: React.FC<MovingArrowProps> = ({
    coordinate,
    heading,
    isActive,
    speed,
}) => {
    const [displayCoordinate, setDisplayCoordinate] = useState<[number, number]>(coordinate);
    const [displayHeading, setDisplayHeading] = useState<number>(heading);
    
    // Position history for smooth interpolation
    const positionHistory = useRef<PositionHistory[]>([]);
    const lastGPSUpdate = useRef<number>(Date.now());
    const smoothingInterval = useRef<NodeJS.Timeout | null>(null);
    
    // Animation refs
    const rotationAnim = useRef(new Animated.Value(heading)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    // Current interpolation state
    const currentState = useRef({
        position: coordinate,
        heading: heading,
        velocity: [0, 0] as [number, number], // Velocity in lng/lat per second
        lastUpdateTime: Date.now()
    });

    // Calculate velocity from position history
    const calculateVelocity = useCallback((newCoordinate: [number, number], timestamp: number): [number, number] => {
        const history = positionHistory.current;
        if (history.length === 0) return [0, 0];
        
        const lastPosition = history[history.length - 1];
        const timeDiff = (timestamp - lastPosition.timestamp) / 1000; // seconds
        
        if (timeDiff <= 0) return [0, 0];
        
        const deltaLng = newCoordinate[0] - lastPosition.coordinate[0];
        const deltaLat = newCoordinate[1] - lastPosition.coordinate[1];
        
        return [deltaLng / timeDiff, deltaLat / timeDiff];
    }, []);

    // Predict position based on velocity (like Google Maps does)
    const predictPosition = useCallback((basePosition: [number, number], velocity: [number, number], timeDelta: number): [number, number] => {
        const predictedLng = basePosition[0] + (velocity[0] * timeDelta);
        const predictedLat = basePosition[1] + (velocity[1] * timeDelta);
        return [predictedLng, predictedLat];
    }, []);

    // Route-based smooth interpolation for polyline sliding
    const smoothInterpolation = useCallback(() => {
        if (!isActive) return;
        
        const now = Date.now();
        const timeSinceLastGPS = (now - lastGPSUpdate.current) / 1000; // seconds
        const state = currentState.current;
        
        // Smooth interpolation for sliding on route polyline
        if (timeSinceLastGPS < 5.0) { // Lenient timing for smooth sliding
            const currentDisplay = displayCoordinate;
            const targetPosition = state.position;
            
            // Smooth interpolation for polyline sliding
            const lerpFactor = speed > 2.0 ? 0.15 : 0.08; // Smoother sliding
            
            const newLng = currentDisplay[0] + (targetPosition[0] - currentDisplay[0]) * lerpFactor;
            const newLat = currentDisplay[1] + (targetPosition[1] - currentDisplay[1]) * lerpFactor;
            
            setDisplayCoordinate([newLng, newLat]);
        } else {
            // Gradually move to target position (no jumps for smooth sliding)
            const currentDisplay = displayCoordinate;
            const targetPosition = state.position;
            const lerpFactor = 0.05; // Very smooth transition
            
            const newLng = currentDisplay[0] + (targetPosition[0] - currentDisplay[0]) * lerpFactor;
            const newLat = currentDisplay[1] + (targetPosition[1] - currentDisplay[1]) * lerpFactor;
            
            setDisplayCoordinate([newLng, newLat]);
        }
    }, [isActive, speed, displayCoordinate]);

    // Start smooth interpolation loop
    useEffect(() => {
        if (isActive) {
            smoothingInterval.current = setInterval(smoothInterpolation, 16); // 60fps
        } else {
            if (smoothingInterval.current) {
                clearInterval(smoothingInterval.current);
                smoothingInterval.current = null;
            }
        }

        return () => {
            if (smoothingInterval.current) {
                clearInterval(smoothingInterval.current);
            }
        };
    }, [isActive, smoothInterpolation]);

    // Handle new GPS coordinate updates with immediate response
    useEffect(() => {
        if (!isActive || !coordinate) return;
        
        const now = Date.now();
        const velocity = calculateVelocity(coordinate, now);
        
        // Update position history
        positionHistory.current.push({
            coordinate,
            timestamp: now,
            heading,
            speed
        });
        
        // Keep only last 5 positions for faster response
        if (positionHistory.current.length > 5) {
            positionHistory.current.shift();
        }
        
        // Update current state immediately
        currentState.current = {
            position: coordinate,
            heading,
            velocity,
            lastUpdateTime: now
        };
        
        lastGPSUpdate.current = now;
        
        // For route-based movement, always smooth transition (no immediate jumps)
        // This ensures smooth sliding on polyline
        
        console.log('📍 Real-time GPS Update - Position:', coordinate, 'Speed:', speed.toFixed(2));
    }, [coordinate, heading, speed, isActive, calculateVelocity]);

    // Fast heading updates for real-time following
    useEffect(() => {
        if (isActive && Math.abs(heading - displayHeading) > 2) { // Update for small changes too
            // Handle 360-degree wrap around
            let targetHeading = heading;
            const diff = heading - displayHeading;
            
            if (diff > 180) {
                targetHeading = heading - 360;
            } else if (diff < -180) {
                targetHeading = heading + 360;
            }

            Animated.timing(rotationAnim, {
                toValue: targetHeading,
                duration: 200, // Faster rotation for real-time response
                useNativeDriver: true,
            }).start(() => {
                setDisplayHeading(heading);
                rotationAnim.setValue(heading);
            });
        }
    }, [heading, isActive, displayHeading]);

    // Pulse animation based on speed
    useEffect(() => {
        if (isActive && speed > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [speed, isActive]);

    if (!isActive) return null;

    return (
        <MapboxGL.PointAnnotation
            id="smooth-navigation-arrow"
            coordinate={displayCoordinate}
        >
            <Animated.View style={[
                styles.arrowContainer,
                {
                    transform: [
                        { rotate: rotationAnim.interpolate({
                            inputRange: [0, 360],
                            outputRange: ['0deg', '360deg']
                        }) },
                        { scale: pulseAnim },
                    ],
                },
            ]}>
                {/* Simple white navigation arrow */}
                <View style={styles.arrowBackground}>
                    <MaterialCommunityIcons 
                        name="navigation" 
                        size={28} 
                        color="#333" 
                    />
                </View>
            </Animated.View>
        </MapboxGL.PointAnnotation>
    );
};

const styles = StyleSheet.create({
    arrowContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
    },
    arrowBackground: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff', // Simple white background
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ddd', // Light gray border
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
});

export default MovingArrow; 