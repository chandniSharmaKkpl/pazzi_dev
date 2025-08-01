import React, { useRef, useEffect, useCallback } from 'react';
import { Animated, Dimensions } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

const { width, height } = Dimensions.get('window');

export interface CameraPosition {
    centerCoordinate: [number, number];
    zoomLevel: number;
    heading: number;
    pitch: number;
    animationDuration?: number;
}

export interface NavigationCameraConfig {
    followUser: boolean;
    zoomLevel: number;
    pitch: number;
    animationDuration: number;
    smoothTransitions: boolean;
    autoZoom: boolean;
    showTraffic: boolean;
}

export interface MapCameraControllerRef {
    animateToPosition: (position: CameraPosition) => void;
    animateToLocation: (longitude: number, latitude: number, zoomLevel?: number) => void;
    followUser: (enabled: boolean) => void;
    setZoomLevel: (zoom: number) => void;
    setHeading: (heading: number) => void;
    setPitch: (pitch: number) => void;
    fitBounds: (bounds: [[number, number], [number, number]], padding?: number[]) => void;
    resetCamera: () => void;
}

interface MapCameraControllerProps {
    cameraRef: React.RefObject<any>;
    navigationMode?: 'preview' | 'active' | null;
    userLocation?: { latitude: number; longitude: number } | null;
    userHeading?: number;
    userSpeed?: number;
    routeCoordinates?: [number, number][];
    onCameraMove?: (position: CameraPosition) => void;
    onCameraIdle?: () => void;
}

export const MapCameraController = React.forwardRef<MapCameraControllerRef, MapCameraControllerProps>(({
    cameraRef,
    navigationMode,
    userLocation,
    userHeading = 0,
    userSpeed = 0,
    routeCoordinates = [],
    onCameraMove,
    onCameraIdle,
}, ref) => {
    const currentPosition = useRef<CameraPosition>({
        centerCoordinate: [0, 0],
        zoomLevel: 15,
        heading: 0,
        pitch: 0,
    });

    const navigationConfig = useRef<NavigationCameraConfig>({
        followUser: true,
        zoomLevel: 18,
        pitch: 45,
        animationDuration: 1000,
        smoothTransitions: true,
        autoZoom: true,
        showTraffic: false,
    });

    const isAnimating = useRef(false);
    const animationQueue = useRef<CameraPosition[]>([]);

    // Default configuration for different modes
    const getDefaultConfig = useCallback((mode: 'preview' | 'active' | null): NavigationCameraConfig => {
        switch (mode) {
            case 'active':
                return {
                    followUser: true,
                    zoomLevel: 18,
                    pitch: 45,
                    animationDuration: 500,
                    smoothTransitions: true,
                    autoZoom: true,
                    showTraffic: true,
                };
            case 'preview':
                return {
                    followUser: false,
                    zoomLevel: 15,
                    pitch: 0,
                    animationDuration: 1500,
                    smoothTransitions: true,
                    autoZoom: false,
                    showTraffic: false,
                };
            default:
                return {
                    followUser: true,
                    zoomLevel: 15,
                    pitch: 0,
                    animationDuration: 1000,
                    smoothTransitions: true,
                    autoZoom: false,
                    showTraffic: false,
                };
        }
    }, []);

    // Update configuration when navigation mode changes
    useEffect(() => {
        if (navigationMode !== undefined) {
            navigationConfig.current = getDefaultConfig(navigationMode);
            
            // Apply new configuration
            if (navigationMode === 'active' && userLocation) {
                // Smooth transition to navigation mode
                animateToLocation(
                    userLocation.longitude,
                    userLocation.latitude,
                    navigationConfig.current.zoomLevel
                );
            } else if (navigationMode === 'preview' && routeCoordinates.length > 0) {
                // Fit route bounds for preview
                fitRouteBounds();
            }
        }
    }, [navigationMode, userLocation, routeCoordinates]);

    // Handle user location updates during navigation
    useEffect(() => {
        if (navigationMode === 'active' && userLocation && navigationConfig.current.followUser) {
            // Calculate dynamic zoom based on speed
            const dynamicZoom = calculateDynamicZoom(userSpeed);
            
            // Smooth camera update
            updateCameraPosition({
                centerCoordinate: [userLocation.longitude, userLocation.latitude],
                zoomLevel: dynamicZoom,
                heading: userHeading,
                pitch: navigationConfig.current.pitch,
                animationDuration: 500,
            });
        }
    }, [userLocation, userHeading, userSpeed, navigationMode]);

    // Calculate dynamic zoom based on speed
    const calculateDynamicZoom = useCallback((speed: number): number => {
        const baseZoom = navigationConfig.current.zoomLevel;
        
        if (speed < 2) { // Walking speed
            return Math.min(baseZoom + 2, 20);
        } else if (speed < 10) { // Slow driving
            return Math.min(baseZoom + 1, 19);
        } else if (speed < 30) { // City driving
            return baseZoom;
        } else { // Highway driving
            return Math.max(baseZoom - 1, 16);
        }
    }, []);

    // Animate to specific position
    const animateToPosition = useCallback((position: CameraPosition) => {
        if (!cameraRef.current) return;

        const finalPosition: CameraPosition = {
            ...currentPosition.current,
            ...position,
            animationDuration: position.animationDuration || navigationConfig.current.animationDuration,
        };

        if (isAnimating.current) {
            // Queue animation
            animationQueue.current.push(finalPosition);
            return;
        }

        isAnimating.current = true;
        currentPosition.current = finalPosition;

        cameraRef.current.setCamera({
            centerCoordinate: finalPosition.centerCoordinate,
            zoomLevel: finalPosition.zoomLevel,
            heading: finalPosition.heading,
            pitch: finalPosition.pitch,
            animationDuration: finalPosition.animationDuration,
            animationMode: 'flyTo',
        });

        // Reset animation flag after duration
        setTimeout(() => {
            isAnimating.current = false;
            
            // Process queued animations
            if (animationQueue.current.length > 0) {
                const nextAnimation = animationQueue.current.shift();
                if (nextAnimation) {
                    animateToPosition(nextAnimation);
                }
            }
        }, finalPosition.animationDuration);
    }, [cameraRef]);

    // Animate to specific location
    const animateToLocation = useCallback((longitude: number, latitude: number, zoomLevel?: number) => {
        animateToPosition({
            centerCoordinate: [longitude, latitude],
            zoomLevel: zoomLevel || navigationConfig.current.zoomLevel,
            heading: currentPosition.current.heading,
            pitch: currentPosition.current.pitch,
        });
    }, [animateToPosition]);

    // Follow user mode
    const followUser = useCallback((enabled: boolean) => {
        navigationConfig.current.followUser = enabled;
        
        if (enabled && userLocation) {
            animateToLocation(userLocation.longitude, userLocation.latitude);
        }
    }, [userLocation, animateToLocation]);

    // Set zoom level
    const setZoomLevel = useCallback((zoom: number) => {
        navigationConfig.current.zoomLevel = zoom;
        animateToPosition({
            ...currentPosition.current,
            zoomLevel: zoom,
        });
    }, [animateToPosition]);

    // Set heading
    const setHeading = useCallback((heading: number) => {
        animateToPosition({
            ...currentPosition.current,
            heading,
        });
    }, [animateToPosition]);

    // Set pitch
    const setPitch = useCallback((pitch: number) => {
        animateToPosition({
            ...currentPosition.current,
            pitch,
        });
    }, [animateToPosition]);

    // Fit bounds
    const fitBounds = useCallback((bounds: [[number, number], [number, number]], padding: number[] = [50, 50, 50, 50]) => {
        if (!cameraRef.current) return;

        cameraRef.current.fitBounds(
            bounds[0],
            bounds[1],
            padding,
            navigationConfig.current.animationDuration
        );
    }, [cameraRef]);

    // Fit route bounds
    const fitRouteBounds = useCallback(() => {
        if (routeCoordinates.length === 0) return;

        const bounds = calculateBounds(routeCoordinates);
        fitBounds(bounds);
    }, [routeCoordinates, fitBounds]);

    // Calculate bounds from coordinates
    const calculateBounds = useCallback((coordinates: [number, number][]): [[number, number], [number, number]] => {
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

        return [[minLng, minLat], [maxLng, maxLat]];
    }, []);

    // Update camera position smoothly
    const updateCameraPosition = useCallback((position: Partial<CameraPosition>) => {
        if (!cameraRef.current) return;

        const newPosition = {
            ...currentPosition.current,
            ...position,
        };

        currentPosition.current = newPosition;

        cameraRef.current.setCamera({
            centerCoordinate: newPosition.centerCoordinate,
            zoomLevel: newPosition.zoomLevel,
            heading: newPosition.heading,
            pitch: newPosition.pitch,
            animationDuration: 500,
            animationMode: 'easeTo',
        });
    }, [cameraRef]);

    // Reset camera to default position
    const resetCamera = useCallback(() => {
        if (!userLocation) return;

        animateToPosition({
            centerCoordinate: [userLocation.longitude, userLocation.latitude],
            zoomLevel: 15,
            heading: 0,
            pitch: 0,
            animationDuration: 1000,
        });
    }, [userLocation, animateToPosition]);

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
        animateToPosition,
        animateToLocation,
        followUser,
        setZoomLevel,
        setHeading,
        setPitch,
        fitBounds,
        resetCamera,
    }), [animateToPosition, animateToLocation, followUser, setZoomLevel, setHeading, setPitch, fitBounds, resetCamera]);

    return null; // This component doesn't render anything
});

export default MapCameraController; 