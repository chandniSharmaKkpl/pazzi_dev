import React, { useEffect, useRef } from 'react';

interface NavigationCameraControllerProps {
    navigationMode: 'preview' | 'active' | null;
    userLocation: { latitude: number; longitude: number } | null;
    mapRef: React.RefObject<any>;
    cameraRef: React.RefObject<any>;
    isMapReady: boolean;
    patrolMapViewRef: React.RefObject<any> | null; // Add this for accessing animateToLocation
}

export const NavigationCameraController: React.FC<NavigationCameraControllerProps> = ({
    navigationMode,
    userLocation,
    mapRef,
    cameraRef,
    isMapReady,
    patrolMapViewRef,
}) => {
    const hasNavigated = useRef(false);

    // Handle navigation start - zoom to user location
    useEffect(() => {
        if (navigationMode === 'active' && userLocation && patrolMapViewRef?.current && isMapReady && !hasNavigated.current) {
            console.log('🎯 Navigation started - zooming to user location');
            
            // Animate to user location with navigation zoom
            patrolMapViewRef.current.animateToLocation(
                userLocation.longitude,
                userLocation.latitude,
                18 // Navigation zoom level
            );
            
            hasNavigated.current = true;
        } else if (navigationMode === null) {
            // Reset flag when navigation stops
            hasNavigated.current = false;
        }
    }, [navigationMode, userLocation, patrolMapViewRef, isMapReady]);

    // Handle real-time camera updates during navigation
    useEffect(() => {
        if (navigationMode === 'active' && userLocation && cameraRef.current && isMapReady) {
            // Update camera to follow user smoothly
            cameraRef.current.setCamera({
                centerCoordinate: [userLocation.longitude, userLocation.latitude],
                zoomLevel: 18,
                pitch: 45,
                heading: 0, // Will be updated by compass heading
                animationDuration: 500,
                animationMode: 'easeTo',
            });
        }
    }, [userLocation, navigationMode, cameraRef, isMapReady]);

    return null; // This component doesn't render anything
};

export default NavigationCameraController; 