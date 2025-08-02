import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import * as Location from 'expo-location';
import { Patrol } from '../../types/patrol';
import { PatrolMarker } from './PatrolMarker';
import { UserLocationMarker } from './UserLocationMarker';
import { PlaceMarker, FallbackPlaceMarker } from './PlaceMarker';
import { useNavigation } from '../../context/NavigationContext';
import MapboxGL from '@rnmapbox/maps';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { MapCameraController, MapCameraControllerRef } from './MapCameraController';
import locationTrackingService, { LocationData } from '../../services/location/locationTrackingService';
import navigationService, { NavigationState } from '../../services/navigation/navigationService';
import { MovingArrow } from './MovingArrow';
import { RouteProgressIndicator } from './RouteProgressIndicator';
import { RealTimeDirectionIndicator } from '../navigation/RealTimeDirectionIndicator';
import { Place } from '../../services/map/placesService';
const { width, height } = Dimensions.get('window');

// Check if we're in Expo Go - simpler approach
const isExpoGo = Platform.OS === 'web' || (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative');
console.log('isExpoGo', isExpoGo);
// Conditional imports
let Mapbox: any = null;
let MapView: any = null;
let PointAnnotation: any = null;
let ShapeSource: any = null;
let LineLayer: any = null;
let CircleLayer: any = null;
let SymbolLayer: any = null;
let Images: any = null;

if (isExpoGo) {
  try {
    const mapboxModule = require('@rnmapbox/maps');
    Mapbox = mapboxModule.default;
    MapView = mapboxModule.MapView;
    PointAnnotation = mapboxModule.PointAnnotation;
    ShapeSource = mapboxModule.ShapeSource;
    LineLayer = mapboxModule.LineLayer;
    CircleLayer = mapboxModule.CircleLayer;
    SymbolLayer = mapboxModule.SymbolLayer;
    Images = mapboxModule.Images;
    
    // Set Mapbox access token
    Mapbox.setAccessToken("pk.eyJ1IjoibWlraWpha292IiwiYSI6ImNtYjlscWc3YzB6N2Iya3M2cmQxY2Y5eWEifQ.u_y6rM-a77gBQBhZJ8KkNw");
  } catch (error) {
    console.warn('Mapbox not available, using fallback');
  }
}

// Fallback for Expo Go


interface PatrolMapViewProps {
    location: Location.LocationObject | null;
    patrols: Patrol[];
    mapType: 'standard' | 'satellite' | 'hybrid';
    onPatrolSelect: (patrol: Patrol) => void;
    onMapReady?: () => void;
    navigationRoute?: any;
    navigationMode?: 'preview' | 'active' | null;
    navigationDestination?: any;
    routes?: any[];
    selectedRouteIndex?: number;
    onRouteSelect?: (index: number) => void;
    navigationStartLocation?: any;
    compassHeading?: number;
    nearbyPlaces?: Place[];
    onPlaceSelect?: (place: Place) => void;
}

export interface PatrolMapViewRef {
    animateToLocation: (longitude: number, latitude: number, zoomLevel?: number) => void;
    fitRouteBounds: (coordinates: [number, number][], padding?: number) => void;
    animateToRegion: (region: any, duration?: number) => void;
}

export const PatrolMapView = forwardRef<PatrolMapViewRef, PatrolMapViewProps>(({
                                  location,
                                  patrols,
                                  mapType,
                                  onPatrolSelect,
                                  onMapReady,
                                  navigationRoute,
                                  navigationMode,
                                  navigationDestination,
                                  routes = [],
                                  selectedRouteIndex = 0,
                                  onRouteSelect,
                                  compassHeading,
                                  nearbyPlaces = [],
                                  onPlaceSelect
                              }, ref) => {
    const mapRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const { isNavigating, route } = useNavigation();
    const [centerCoordinate, setCenterCoordinate] = useState<[number, number]>([20.5, 44.4]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [followUser, setFollowUser] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;

    // Animate map elements on load
    useEffect(() => {
        if (isMapReady) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isMapReady]);

    // Update map center when location changes with improved smoothing
    useEffect(() => {
        if (location && followUser && isMapReady) {
            const newCoordinate: [number, number] = [location.coords.longitude, location.coords.latitude];
            setCenterCoordinate(newCoordinate);
            
            // Smooth camera update only if location is accurate
            if (cameraRef.current && location.coords.accuracy && location.coords.accuracy < 15) {
                const animationDuration = navigationMode === 'active' ? 200 : 800; // Faster updates during navigation
                
                cameraRef.current.setCamera({
                    centerCoordinate: newCoordinate,
                    animationDuration,
                    animationMode: 'easeTo',
                });
            }
        }
    }, [location, followUser, isMapReady, navigationMode]);

    // Enhanced: Center map on user location when navigation starts
    useEffect(() => {
        if (navigationMode === 'active' && location) {
            console.log('🎯 Navigation started - centering map on user location');
            setCenterCoordinate([location.coords.longitude, location.coords.latitude]);
            setFollowUser(true); // Enable user following during navigation
        }
    }, [navigationMode, location]);

    // Enhanced: Zoom to user location when navigation starts (disabled auto-zoom)
    useEffect(() => {
        if (navigationMode === 'active' && location && cameraRef.current && isMapReady) {
            console.log('🎯 Navigation mode active - maintaining current zoom level');
            // Auto-zoom disabled - only center on user location without changing zoom
            // animateToLocation(
            //     location.coords.longitude,
            //     location.coords.latitude,
            //     18 // Navigation zoom level
            // );
        }
    }, [navigationMode, location, isMapReady]);

    // Enhanced: Real-time camera updates during navigation (disabled auto-zoom)
    useEffect(() => {
        if (navigationMode === 'active' && location && cameraRef.current && isMapReady) {
            // Update camera to follow user smoothly during navigation without changing zoom
            // cameraRef.current.setCamera({
            //     centerCoordinate: [location.coords.longitude, location.coords.latitude],
            //     zoomLevel: 18,
            //     pitch: 45,
            //     heading: compassHeading || location.coords.heading || 0,
            //     animationDuration: 500,
            //     animationMode: 'easeTo',
            // });
        }
    }, [location, navigationMode, isMapReady, compassHeading]);

    // Animate camera to fit the route when navigation starts
    useEffect(() => {
        if (isNavigating && route && cameraRef.current && isMapReady) {
            setFollowUser(false);
            const coordinates = route.geometry.coordinates;
            const bounds = getBounds(coordinates);
            
            cameraRef.current.fitBounds(
                [bounds.sw[0], bounds.sw[1]],
                [bounds.ne[0], bounds.ne[1]],
                [80, 80, 80, 80], // padding
                1500 // duration
            );
        }
    }, [isNavigating, route, isMapReady]);

    // Calculate bounds for coordinates
    const getBounds = (coordinates: number[][]) => {
        let minLng = coordinates[0][0];
        let maxLng = coordinates[0][0];
        let minLat = coordinates[0][1];
        let maxLat = coordinates[0][1];

        coordinates.forEach(coord => {
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
        });

        return {
            sw: [minLng, minLat],
            ne: [maxLng, maxLat]
        };
    };

    // Get mapbox style URL based on map type
    const getMapStyle = () => {
        if (!Mapbox) return null;
        switch (mapType) {
            case 'satellite':
                return Mapbox.StyleURL.Satellite;
            case 'hybrid':
                return Mapbox.StyleURL.SatelliteStreet;
            default:
                return Mapbox.StyleURL.Street;
        }
    };

    // Expose camera ref for external control
    const animateToLocation = (longitude: number, latitude: number, zoomLevel: number = 15) => {
        if (cameraRef.current) {
            if (Mapbox) {
                cameraRef.current.setCamera({
                    centerCoordinate: [longitude, latitude],
                    zoomLevel,
                    animationDuration: 1200,
                    animationMode: 'easeTo',
                });
            }
        }
    };

    // Show all patrols on map
    // const showAllPatrols = () => {
    //     if (patrols.length > 0 && cameraRef.current) {
    //         const coordinates = patrols.map(patrol => [patrol.location.longitude, patrol.location.latitude]);
    //         const bounds = getBounds(coordinates);
            
    //         cameraRef.current.fitBounds(
    //             [bounds.sw[0], bounds.sw[1]],
    //             [bounds.ne[0], bounds.ne[1]],
    //             [100, 100, 100, 100],
    //             1500
    //         );
    //         setFollowUser(false);
    //     }
    // };

    // Center on user location
    const centerOnUser = () => {
        if (location) {
            setFollowUser(true);
            animateToLocation(location.coords.longitude, location.coords.latitude, 16);
        }
    };

    // Fit route bounds on map
    const fitRouteBounds = (coordinates: [number, number][], padding: number = 100) => {
        if (!coordinates || coordinates.length === 0 || !cameraRef.current) return;
        
        // Calculate bounds
        let minLat = coordinates[0][1];
        let maxLat = coordinates[0][1];
        let minLng = coordinates[0][0];
        let maxLng = coordinates[0][0];
        
        coordinates.forEach(coord => {
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
        });
        
        // Fit bounds using camera
        if (Mapbox && cameraRef.current.fitBounds) {
            cameraRef.current.fitBounds(
                [minLng, minLat], // southwest
                [maxLng, maxLat], // northeast
                [padding, padding, padding, padding], // padding
                1500 // duration
            );
        }
        
        setFollowUser(false); // Disable follow user when fitting route
    };

    // Expose the camera control function
    React.useImperativeHandle(ref, ()=> ({
        animateToLocation,
        fitRouteBounds,
        animateToRegion: (region: any, duration = 1000) => {
            if (mapRef.current) {
              mapRef.current.animateToRegion(region, duration);
            }
          },
          centerOnUser,
    }));
    const handleMapReady = () => {
        setIsMapReady(true);
        onMapReady?.();
    };

    // Add getDistance helper (copy from parent if not present)
    function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
    }

    // Calculate heading based on route direction
    const calculateRouteHeading = (coordinates: [number, number][]) => {
        if (!coordinates || coordinates.length < 2) return 0;
        
        const start = coordinates[0];
        const end = coordinates[1];
        
        // Safety checks for coordinate values
        if (!start || !end || start.length !== 2 || end.length !== 2) return 0;
        if (isNaN(start[0]) || isNaN(start[1]) || isNaN(end[0]) || isNaN(end[1])) return 0;
        
        // Calculate bearing between first two points
        const toRad = (degrees: number) => degrees * (Math.PI / 180);
        const toDeg = (radians: number) => radians * (180 / Math.PI);
        
        const dLon = toRad(end[0] - start[0]);
        const lat1 = toRad(start[1]);
        const lat2 = toRad(end[1]);
        
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        
        let bearing = toDeg(Math.atan2(y, x));
        bearing = (bearing + 360) % 360; // Normalize to 0-360
        
        return bearing;
    };

    // State for smooth arrow progression
    const smoothProgressRef = useRef<number>(0);
    const lastUpdateTime = useRef<number>(Date.now());

    // Smooth route progress with continuous interpolation
    function getSmoothRouteProgress(userLat: number, userLng: number, routeCoords: [number, number][]): {
        index: number,
        coordinate: [number, number],
        heading: number,
        distanceAlongRoute: number
    } {
        if (routeCoords.length < 2) {
            return { index: 0, coordinate: routeCoords[0] || [0, 0], heading: 0, distanceAlongRoute: 0 };
        }

        // Find closest point on entire route
        let minDist = Infinity;
        let closestIdx = 0;
        let closestProjection: [number, number] = [0, 0];
        let distanceAlongRoute = 0;
        let segmentProgress = 0;

        for (let i = 0; i < routeCoords.length - 1; i++) {
            const segStart = routeCoords[i];
            const segEnd = routeCoords[i + 1];
            
            // Project user position onto this segment
            const projection = projectPointOnSegment([userLng, userLat], segStart, segEnd);
            const distToProjection = getDistance(userLat, userLng, projection[1], projection[0]);
            
            if (distToProjection < minDist) {
                minDist = distToProjection;
                closestIdx = i;
                closestProjection = projection;
                
                // Calculate progress along this segment (0-1)
                const segmentLength = getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
                const distFromStart = getDistance(segStart[1], segStart[0], projection[1], projection[0]);
                segmentProgress = segmentLength > 0 ? Math.min(1, distFromStart / segmentLength) : 0;
            }
        }

        // Calculate total distance along route to this point
        distanceAlongRoute = 0;
        for (let i = 0; i < closestIdx; i++) {
            const segStart = routeCoords[i];
            const segEnd = routeCoords[i + 1];
            distanceAlongRoute += getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
        }
        
        // Add partial distance for current segment
        if (closestIdx < routeCoords.length - 1) {
            const segStart = routeCoords[closestIdx];
            const segEnd = routeCoords[closestIdx + 1];
            const segmentLength = getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
            distanceAlongRoute += segmentLength * segmentProgress;
        }

        // Enhanced smooth progress with reduced lag
        const currentTime = Date.now();
        const deltaTime = currentTime - lastUpdateTime.current;
        lastUpdateTime.current = currentTime;

        // Only move forward or allow small backwards movements
        const targetProgress = distanceAlongRoute;
        const maxBackwardDistance = 15; // meters - reduced for better accuracy
        const smoothingFactor = Math.min(deltaTime / 200, 1); // Faster response - 200ms

        if (targetProgress > smoothProgressRef.current) {
            // Moving forward - immediate update with minimal smoothing for real-time feel
            const forwardSmoothingFactor = Math.min(smoothingFactor * 5, 1); // Very responsive forward movement
            smoothProgressRef.current = smoothProgressRef.current + (targetProgress - smoothProgressRef.current) * forwardSmoothingFactor;
        } else if (targetProgress < smoothProgressRef.current - maxBackwardDistance) {
            // Large backward jump (GPS error or route recalculation) - allow it immediately
            smoothProgressRef.current = targetProgress;
        } else if (minDist < 10) {
            // User is very close to route - allow more responsive movement
            smoothProgressRef.current = Math.max(targetProgress, smoothProgressRef.current - 3 * smoothingFactor);
        } else {
            // User is farther from route - be more conservative but still responsive
            smoothProgressRef.current = Math.max(targetProgress, smoothProgressRef.current - smoothingFactor);
        }

        // Convert smooth progress back to coordinate and index
        const smoothedCoordinate = getCoordinateAtDistance(routeCoords, smoothProgressRef.current);
        const smoothedIndex = getIndexAtDistance(routeCoords, smoothProgressRef.current);

        // Calculate heading based on route direction at this point (look ahead for better accuracy)
        const lookAheadDistance = Math.min(3, routeCoords.length - smoothedIndex - 1); // Look ahead 3 points or to end
        const nextIdx = Math.min(smoothedIndex + lookAheadDistance, routeCoords.length - 1);
        const currentPoint = routeCoords[smoothedIndex];
        const nextPoint = routeCoords[nextIdx];
        const heading = calculateRouteHeading([currentPoint, nextPoint]);

        return {
            index: smoothedIndex,
            coordinate: smoothedCoordinate,
            heading: heading,
            distanceAlongRoute: smoothProgressRef.current
        };
    }

    // Helper function to project a point onto a line segment
    function projectPointOnSegment(point: [number, number], segStart: [number, number], segEnd: [number, number]): [number, number] {
        const [px, py] = point;
        const [ax, ay] = segStart;
        const [bx, by] = segEnd;
        
        const dx = bx - ax;
        const dy = by - ay;
        
        if (dx === 0 && dy === 0) return segStart;
        
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
        
        return [ax + t * dx, ay + t * dy];
    }

    // Get coordinate at specific distance along route
    function getCoordinateAtDistance(routeCoords: [number, number][], targetDistance: number): [number, number] {
        if (routeCoords.length < 2) return routeCoords[0] || [0, 0];
        
        let accumulatedDistance = 0;
        
        for (let i = 0; i < routeCoords.length - 1; i++) {
            const segStart = routeCoords[i];
            const segEnd = routeCoords[i + 1];
            const segmentLength = getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
            
            if (accumulatedDistance + segmentLength >= targetDistance) {
                // Target distance is within this segment
                const remainingDistance = targetDistance - accumulatedDistance;
                const t = segmentLength > 0 ? remainingDistance / segmentLength : 0;
                
                return [
                    segStart[0] + (segEnd[0] - segStart[0]) * t,
                    segStart[1] + (segEnd[1] - segStart[1]) * t
                ];
            }
            
            accumulatedDistance += segmentLength;
        }
        
        // Target distance is beyond route end
        return routeCoords[routeCoords.length - 1];
    }

    // Get index at specific distance along route
    function getIndexAtDistance(routeCoords: [number, number][], targetDistance: number): number {
        if (routeCoords.length < 2) return 0;
        
        let accumulatedDistance = 0;
        
        for (let i = 0; i < routeCoords.length - 1; i++) {
            const segStart = routeCoords[i];
            const segEnd = routeCoords[i + 1];
            const segmentLength = getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
            
            if (accumulatedDistance + segmentLength >= targetDistance) {
                return i;
            }
            
            accumulatedDistance += segmentLength;
        }
        
        return routeCoords.length - 1;
    }

    // Get current route direction based on polyline
    function getCurrentRouteDirection(userLat: number, userLng: number, routeCoords: [number, number][], currentIndex: number): {
        direction: 'straight' | 'left' | 'right' | 'sharp-left' | 'sharp-right' | 'slight-left' | 'slight-right' | 'u-turn',
        bearing: number,
        nextTurnDistance: number
    } {
        // Safety checks
        if (!routeCoords || routeCoords.length < 3 || currentIndex >= routeCoords.length - 2 || currentIndex < 0) {
            return { direction: 'straight', bearing: 0, nextTurnDistance: 0 };
        }
        
        if (!userLat || !userLng || isNaN(userLat) || isNaN(userLng)) {
            return { direction: 'straight', bearing: 0, nextTurnDistance: 0 };
        }

        // Look ahead to find the next significant turn
        const lookAheadDistance = 50; // meters - reduced for more responsive detection
        let accumulatedDistance = 0;
        let nextTurnIndex = currentIndex + 1;
        
        // Find next significant direction change within lookAheadDistance
        for (let i = currentIndex; i < routeCoords.length - 2; i++) {
            const segStart = routeCoords[i];
            const segEnd = routeCoords[i + 1];
            const segmentLength = getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
            
            if (accumulatedDistance + segmentLength >= lookAheadDistance) {
                nextTurnIndex = i + 1;
                break;
            }
            
            accumulatedDistance += segmentLength;
            
            // Check for significant bearing change
            const currentBearing = calculateRouteHeading([routeCoords[i], routeCoords[i + 1]]);
            const nextBearing = calculateRouteHeading([routeCoords[i + 1], routeCoords[i + 2]]);
            const bearingDiff = Math.abs(nextBearing - currentBearing);
            const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;
            
            if (normalizedDiff > 10) { // Reduced threshold for more sensitive turn detection
                nextTurnIndex = i + 1;
                break;
            }
        }

        // Calculate current segment bearing
        const currentSegment = routeCoords[currentIndex];
        const nextSegment = routeCoords[Math.min(currentIndex + 1, routeCoords.length - 1)];
        const currentBearing = calculateRouteHeading([currentSegment, nextSegment]);

        // Calculate next turn bearing if found
        if (nextTurnIndex < routeCoords.length - 1) {
            const turnPoint = routeCoords[nextTurnIndex];
            const afterTurnPoint = routeCoords[nextTurnIndex + 1];
            const nextBearing = calculateRouteHeading([turnPoint, afterTurnPoint]);
            
            // Calculate turn angle
            let turnAngle = nextBearing - currentBearing;
            if (turnAngle > 180) turnAngle -= 360;
            if (turnAngle < -180) turnAngle += 360;
            
            // Classify turn direction - more sensitive thresholds
            let direction: 'straight' | 'left' | 'right' | 'sharp-left' | 'sharp-right' | 'slight-left' | 'slight-right' | 'u-turn';
            
            if (Math.abs(turnAngle) < 10) {
                direction = 'straight';
            } else if (Math.abs(turnAngle) > 150) {
                direction = 'u-turn';
            } else if (turnAngle > 0) {
                // Right turn
                if (turnAngle > 100) direction = 'sharp-right';
                else if (turnAngle > 30) direction = 'right';
                else direction = 'slight-right';
            } else {
                // Left turn
                if (turnAngle < -100) direction = 'sharp-left';
                else if (turnAngle < -30) direction = 'left';
                else direction = 'slight-left';
            }
            
            // Calculate distance to next turn
            let distanceToTurn = 0;
            for (let i = currentIndex; i < nextTurnIndex; i++) {
                const segStart = routeCoords[i];
                const segEnd = routeCoords[i + 1];
                distanceToTurn += getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
            }
            
            return {
                direction,
                bearing: currentBearing,
                nextTurnDistance: distanceToTurn
            };
        }

        return { direction: 'straight', bearing: currentBearing, nextTurnDistance: 0 };
    }

    // --- Enhanced navigation with full route display ---
    let fullRouteCoords = [];
    let traveledRouteCoords = [];
    let arrowCoord = null;
    let arrowHeading = 0;
    let userProgress = 0;
    let currentRouteDirection: { direction: 'straight' | 'left' | 'right' | 'sharp-left' | 'sharp-right' | 'slight-left' | 'slight-right' | 'u-turn', bearing: number, nextTurnDistance: number } = { direction: 'straight', bearing: 0, nextTurnDistance: 0 };
    
    if (
        navigationMode === 'active' &&
        location && location.coords &&
        navigationRoute && navigationRoute.geometry &&
        navigationRoute.geometry.coordinates &&
        navigationRoute.geometry.coordinates.length > 1
    ) {
        const userLat = location.coords.latitude;
        const userLng = location.coords.longitude;
        const routeCoords = navigationRoute.geometry.coordinates;
        fullRouteCoords = routeCoords; // Always show full route
        
        // Get smooth route progress
        const progress = getSmoothRouteProgress(userLat, userLng, routeCoords);
        userProgress = progress.distanceAlongRoute;
        
        // Create traveled portion up to user's current position
        traveledRouteCoords = [];
        let accumulatedDistance = 0;
        
        // Always start with first point
        traveledRouteCoords.push(routeCoords[0]);
        
        for (let i = 0; i < routeCoords.length - 1; i++) {
            const segStart = routeCoords[i];
            const segEnd = routeCoords[i + 1];
            const segmentLength = getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
            
            if (accumulatedDistance + segmentLength <= userProgress) {
                // This entire segment is traveled
                traveledRouteCoords.push(segEnd);
            } else if (accumulatedDistance < userProgress) {
                // User is partway through this segment
                const remainingDistance = userProgress - accumulatedDistance;
                const t = remainingDistance / segmentLength;
                const interpolatedPoint: [number, number] = [
                    segStart[0] + (segEnd[0] - segStart[0]) * t,
                    segStart[1] + (segEnd[1] - segStart[1]) * t
                ];
                traveledRouteCoords.push(interpolatedPoint);
                break;
            } else {
                break;
            }
            
            accumulatedDistance += segmentLength;
        }
        
        // Set arrow position and heading
        arrowCoord = progress.coordinate;
        arrowHeading = progress.heading;
        
        // Calculate real-time route direction for navigation instructions
        try {
            currentRouteDirection = getCurrentRouteDirection(userLat, userLng, routeCoords, progress.index);
            
            // Log current route direction for debugging
            console.log('🧭 Current Route Direction:', currentRouteDirection.direction, 'Distance to turn:', currentRouteDirection.nextTurnDistance.toFixed(1) + 'm');
        } catch (error) {
            console.error('❌ Error calculating route direction:', error);
            currentRouteDirection = { direction: 'straight', bearing: 0, nextTurnDistance: 0 };
        }
        
        // Check if user is off-route and needs recalculation
        const distanceFromRoute = getDistance(userLat, userLng, progress.coordinate[1], progress.coordinate[0]);
        if (distanceFromRoute > 50) { // 50 meters threshold
            console.log('🔄 User is off-route! Distance from route:', distanceFromRoute.toFixed(1), 'meters');
            // Here you can trigger route recalculation
            // onRouteRecalculation?.();
        }
        
        console.log('🏃‍♂️ Navigation Progress - Distance:', userProgress.toFixed(1), 'Traveled:', traveledRouteCoords.length, 'Full route:', fullRouteCoords.length, 'Route distance:', distanceFromRoute.toFixed(1));
    }

    // If Mapbox is available, use it
    if (Mapbox && MapView && PointAnnotation) {
        return (
            <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                styleURL={getMapStyle()}
                zoomEnabled={true}
                scrollEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
                compassEnabled={true}
                scaleBarEnabled={false}
                logoEnabled={false}
                attributionEnabled={false}
                    onDidFinishLoadingMap={handleMapReady}
                    onTouchStart={() => setFollowUser(false)}
            >
                <MapboxGL.Camera
                    ref={cameraRef}
                    centerCoordinate={centerCoordinate}
                    // zoomLevel={12}
                    pitch={navigationMode === 'active' ? 45 : 0}
                    // heading={navigationMode === 'active' && typeof compassHeading === 'number' ? compassHeading : (location?.coords?.heading ?? 0)} // Auto-rotation disabled
                    animationMode="flyTo"
                    animationDuration={1000}
                />

                {/* Load navigation icon image */}
                {Images && (
                    <Images
                        images={{
                            'navigation-arrow-icon': require('../../assets/icons8-navigation-96.png'),
                        }}
                    />
                )}

                {/* User location marker */}
                {location && location.coords &&
                 typeof location.coords.longitude === 'number' &&
                 typeof location.coords.latitude === 'number' &&navigationMode !== 'active' && (
                  <UserLocationMarker
                    coordinate={[location.coords.longitude, location.coords.latitude]}
                  />
                )}

                {/* {navigationMode === 'active' && location && location.coords && true && navigationRoute && navigationRoute.geometry && navigationRoute.geometry.coordinates && navigationRoute.geometry.coordinates.length > 0 && (
  <MapboxGL.PointAnnotation
    id="user-arrow"
    coordinate={navigationRoute.geometry.coordinates[0]}
  >
    <View style={{
      transform: [{ rotate: `${calculateRouteHeading(navigationRoute.geometry.coordinates)}deg` }],
      alignItems: 'center',
      justifyContent: 'center',
    }}>
        <Image source={require('../../assets/icons8-navigation-96.png')} style={{ width: 40, height: 40 }} />
        
    </View>
  </MapboxGL.PointAnnotation>
)} */}

                {/* Enhanced navigation with progressive route coloring */}
                {navigationMode === 'active' && fullRouteCoords.length > 0 && (
                  <>
                    {/* Create single route with gradient from blue to grey based on user progress */}
                    <ShapeSource 
                        id="progressive-route" 
                        shape={{
                            type: 'Feature',
                            properties: {
                                traveledDistance: userProgress,
                                totalDistance: (() => {
                                    let total = 0;
                                    for (let i = 0; i < fullRouteCoords.length - 1; i++) {
                                        const segStart = fullRouteCoords[i];
                                        const segEnd = fullRouteCoords[i + 1];
                                        total += getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
                                    }
                                    return total;
                                })()
                            },
                            geometry: {
                                type: 'LineString',
                                coordinates: fullRouteCoords,
                            }
                        }}
                    >
                        <LineLayer
                            id="progressive-route-line"
                            style={{
                                lineColor: '#1976D2',
                                lineWidth: 10,
                                lineCap: 'round',
                                lineJoin: 'round',
                                lineOpacity: 0.9,
                                lineSortKey: 10,
                            }}
                        />
                    </ShapeSource>
                    
                    {/* Backup: Fallback to separate lines if gradient not supported */}
                    {traveledRouteCoords.length >= 2 && (
                      <ShapeSource id="traveled-route-fallback" shape={{
                          type: 'Feature',
                          geometry: {
                              type: 'LineString',
                              coordinates: traveledRouteCoords,
                          }
                      }}>
                          <LineLayer
                              id="traveled-route-line-fallback"
                              style={{
                                  lineColor: '#CCCCCC',
                                  lineWidth: 10,
                                  lineCap: 'round',
                                  lineJoin: 'round',
                                  lineOpacity: 0.8,
                                  lineSortKey: 2,
                              }}
                          />
                      </ShapeSource>
                    )}
                    
                    {/* Remaining portion (blue) - fallback */}
                    {(() => {
                        const remainingCoords = [];
                        if (traveledRouteCoords.length > 0 && fullRouteCoords.length > 0) {
                            const lastTraveledPoint = traveledRouteCoords[traveledRouteCoords.length - 1];
                            remainingCoords.push(lastTraveledPoint);
                            
                            let startIndex = 0;
                            for (let i = 0; i < fullRouteCoords.length; i++) {
                                if (Math.abs(fullRouteCoords[i][0] - lastTraveledPoint[0]) < 0.0001 && 
                                    Math.abs(fullRouteCoords[i][1] - lastTraveledPoint[1]) < 0.0001) {
                                    startIndex = i;
                                    break;
                                }
                            }
                            
                            for (let i = startIndex + 1; i < fullRouteCoords.length; i++) {
                                remainingCoords.push(fullRouteCoords[i]);
                            }
                        } else {
                            remainingCoords.push(...fullRouteCoords);
                        }
                        
                        return remainingCoords.length >= 2 ? (
                            <ShapeSource id="remaining-route-fallback" shape={{
                                type: 'Feature',
                                geometry: {
                                    type: 'LineString',
                                    coordinates: remainingCoords,
                                }
                            }}>
                                <LineLayer
                                    id="remaining-route-line-fallback"
                                    style={{
                                        lineColor: '#1976D2',
                                        lineWidth: 10,
                                        lineCap: 'round',
                                        lineJoin: 'round',
                                        lineOpacity: 0.8,
                                        lineSortKey: 1,
                                    }}
                                />
                            </ShapeSource>
                        ) : null;
                    })()}
                  </>
                )}


                {/* Route progress indicator */}
                {navigationMode === 'active' && fullRouteCoords.length > 0 && (
                    <RouteProgressIndicator
                        routeCoordinates={fullRouteCoords}
                        userCoordinate={location ? [location.coords.longitude, location.coords.latitude] : null}
                        isActive={navigationMode === 'active'}
                    />
                )}

                {/* Render all route options with different styling */}
                {navigationMode !== 'active' && routes && routes.length > 0 && (
                    <>
                        {routes.map((route, index) => {
                            const isSelected = index === selectedRouteIndex;
                            const routeColor = isSelected ? '#1976D2' : '#CCCCCC'; // Blue for selected, light grey for others
                            
                            return (
                                <React.Fragment key={`route-fragment-${index}`}>
                                    <ShapeSource
                                        key={`route-${index}`}
                                        id={`route-${index}`}
                                        shape={{
                                            type: 'Feature',
                                            geometry: {
                                                type: 'LineString',
                                                coordinates: route.geometry.coordinates,
                                            }
                                        }}
                                    >
                                        <LineLayer
                                            id={`route-line-${index}`}
                                            style={{
                                                lineColor: routeColor,
                                                lineWidth: isSelected ? 8 : 6,
                                                lineOpacity: isSelected ? 0.9 : 0.6,
                                                lineCap: 'round',
                                                lineJoin: 'round',
                                                lineSortKey: isSelected ? 10 : 3,
                                            }}
                                        />
                                    </ShapeSource>
                                    
                                    {/* Route selection area - wider invisible line */}
                                    <ShapeSource
                                        key={`route-touch-${index}`}
                                        id={`route-touch-${index}`}
                                        shape={{
                                            type: 'Feature',
                                            geometry: {
                                                type: 'LineString',
                                                coordinates: route.geometry.coordinates,
                                            }
                                        }}
                                        onPress={() => {
                                            console.log(`🎯 Route ${index} selected`);
                                            onRouteSelect && onRouteSelect(index);
                                        }}
                                    >
                                        <LineLayer
                                            id={`route-touch-line-${index}`}
                                            style={{
                                                lineColor: 'rgba(0,0,0,0.01)', // Almost transparent but not fully transparent
                                                lineWidth: 25, // Even wider for easier tapping
                                                lineCap: 'round',
                                                lineJoin: 'round',
                                                lineSortKey: 15, // Higher priority for touch
                                            }}
                                        />
                                    </ShapeSource>
                                </React.Fragment>
                            );
                        })}
                        
                        {/* End point markers for all routes */}
                        {routes.map((route, index) => {
                            const endPoint = route.geometry.coordinates[route.geometry.coordinates.length - 1];
                            const isSelected = index === selectedRouteIndex;
                            const markerColor = isSelected ? '#1976D2' : '#CCCCCC'; // Blue for selected, light grey for others
                            
                            return (
                                <PointAnnotation
                                    key={`endpoint-${index}`}
                                    id={`endpoint-${index}`}
                                    coordinate={endPoint}
                                    onSelected={() => onRouteSelect && onRouteSelect(index)}
                                >
                                    <View style={{
                                        width: isSelected ? 24 : 20,
                                        height: isSelected ? 24 : 20,
                                        borderRadius: isSelected ? 12 : 10,
                                        backgroundColor: markerColor,
                                        borderWidth: 3,
                                        borderColor: '#FFFFFF',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        shadowColor: '#000',
                                        shadowOpacity: 0.3,
                                        shadowRadius: 3,
                                        elevation: 5,
                                    }}>
                                        <View style={{
                                            width: isSelected ? 8 : 6,
                                            height: isSelected ? 8 : 6,
                                            borderRadius: isSelected ? 4 : 3,
                                            backgroundColor: '#FFFFFF',
                                        }} />
                                    </View>
                                </PointAnnotation>
                            );
                        })}
                    </>
                )}

                {/* Draw navigation route if present and no alternatives */}
                {(!routes || routes.length === 0) && navigationRoute && navigationRoute.geometry && ShapeSource && LineLayer && (
                    <>
                        {/* Route shadow/outline */}
                        <ShapeSource id="routeShadowSource" shape={{
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: navigationRoute.geometry.coordinates,
                            }
                        }}>
                            <LineLayer
                                id="routeShadowLayer"
                                style={{
                                    lineColor: '#000000',
                                    lineWidth: 8,
                                    lineOpacity: 0.3,
                                    lineBlur: 2,
                                    lineSortKey: 4,
                                }}
                            />
                        </ShapeSource>
                        {/* Main route line */}
                        <ShapeSource id="routeSource" shape={{
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: navigationRoute.geometry.coordinates,
                            }
                        }}>
                            <LineLayer
                                id="routeLayer"
                                style={{
                                    lineColor: '#1976D2',
                                    lineWidth: 6,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                    lineOpacity: 0.9,
                                }}
                            />
                        </ShapeSource>
                    </>
                )}

                {/* Patrol markers */}
                {patrols.map((patrol) => (
                    patrol && patrol.location &&
                    typeof patrol.location.longitude === 'number' &&
                    typeof patrol.location.latitude === 'number' && (
                        <PatrolMarker
                            key={patrol.id}
                            patrol={patrol}
                            onPress={() => onPatrolSelect(patrol)}
                        />
                    )
                ))}

                {/* Place markers (only show when not navigating) */}
                {navigationMode !== 'active' && nearbyPlaces.map((place) => (
                    <PlaceMarker
                        key={place.id}
                        place={place}
                        onPress={(place) => onPlaceSelect && onPlaceSelect(place)}
                    />
                ))}

                {/* Navigation Arrow - using ShapeSource for better layering control */}
                {navigationMode === 'active' && arrowCoord && ShapeSource && (
                    <>
                        {/* Arrow background circle */}
                        <ShapeSource
                            id="navigation-arrow-bg"
                            shape={{
                                type: 'Feature',
                                geometry: {
                                    type: 'Point',
                                    coordinates: arrowCoord,
                                }
                            }}
                        >
                            <CircleLayer
                                id="navigation-arrow-bg-layer"
                                style={{
                                    circleRadius: 20,
                                    circleColor: 'rgba(255, 255, 255, 0.04)',
                                    circleStrokeColor: '#1976d207',
                                    circleStrokeWidth: 3,
                                    circleSortKey: 99998,
                                }}
                            />
                            <SymbolLayer
                                id="navigation-arrow-symbol"
                                style={{
                                    iconImage: 'navigation-arrow-icon',
                                    iconSize: 0.4,
                                    iconRotate: arrowHeading -180, // Rotate arrow to match movement direction
                                    iconAnchor: 'center',
                                    symbolSortKey: 99999,
                                    iconAllowOverlap: true,                           
                                    iconIgnorePlacement: true,
                                }}
                            />
                        </ShapeSource>
                    </>
                )}

            </MapView>

                {/* Real-time Direction Indicator */}
                {navigationMode === 'active' && currentRouteDirection && (
                    <RealTimeDirectionIndicator 
                        direction={currentRouteDirection.direction}
                        distance={currentRouteDirection.nextTurnDistance}
                        isVisible={currentRouteDirection.nextTurnDistance > 0 || currentRouteDirection.direction !== 'straight'}
                    />
                )}

                {/* Overlay UI Elements */}
                {/* <StatsPanel />
                <MapControls />
                 */}
                {/* Loading indicator */}
                {!isMapReady && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingContent}>
                            <Text style={styles.loadingText}>Loading Map...</Text>
                            <View style={styles.loadingBar}>
                                <Animated.View 
                                    style={[
                                        styles.loadingProgress,
                                        { width: '70%' }
                                    ]} 
                                />
                            </View>
                        </View>
                    </View>
                )}
            </View>
        );
    }

    // Fallback for react-native-maps (enhanced)
    if (typeof ReactNativeMaps !== 'undefined') {
        const MapViewFallback = ReactNativeMaps.default;
        const Marker = ReactNativeMaps.Marker;
        
        return (
            <View style={styles.container}>
            <MapViewFallback
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: centerCoordinate[1],
                    longitude: centerCoordinate[0],
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                    onMapReady={handleMapReady}
                showsUserLocation={true}
                showsMyLocationButton={false}
                    showsCompass={false}
                showsScale={false}
                showsTraffic={true}
                showsIndoors={true}
                showsBuildings={true}
                showsPointsOfInterest={true}
                    mapType={mapType}
            >
                {/* Patrol markers */}
                {patrols.map((patrol) => (
                    <Marker
                        key={patrol.id}
                        coordinate={{
                            latitude: patrol.location.latitude,
                            longitude: patrol.location.longitude,
                        }}
                        onPress={() => onPatrolSelect(patrol)}
                        // pinColor={patrol.probability > 0.7 ? 'blue' : patrol.probability > 0.4 ? 'orange' : 'yellow'}
                        >
                        <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FF0000',
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
      }}
    />
    </Marker>
                ))}
                
                {/* Place markers (fallback) */}
                {navigationMode !== 'active' && nearbyPlaces.map((place) => (
                    <FallbackPlaceMarker
                        key={place.id}
                        place={place}
                        onPress={(place) => onPlaceSelect && onPlaceSelect(place)}
                        Marker={Marker}
                    />
                ))}
            </MapViewFallback>
</View>
        );
    }

    // Final fallback - just show a placeholder
    return (
        <View style={[styles.map, styles.placeholder]}>
            <View style={styles.placeholderContent}>
                <Text style={styles.placeholderText}>
                    Map not available in Expo Go
                </Text>
                <Text style={styles.placeholderSubtext}>
                    Use development build for full map features
                </Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingContent: {
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    loadingBar: {
        width: 200,
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingProgress: {
        height: '100%',
        backgroundColor: '#1976D2',
        borderRadius: 2,
    },
    placeholder: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderContent: {
        alignItems: 'center',
        padding: 20,
    },
    placeholderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
    },
    placeholderSubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
});