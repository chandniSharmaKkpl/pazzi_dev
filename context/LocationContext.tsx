import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationContextType {
    location: Location.LocationObject | null;
    errorMsg: string | null;
    requestPermission: () => Promise<boolean>;
    startBackgroundUpdates: () => Promise<void>;
    stopBackgroundUpdates: () => Promise<void>;
    startNavigationUpdates: () => Promise<void>;
    stopNavigationUpdates: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType>({
    location: null,
    errorMsg: null,
    requestPermission: async () => false,
    startBackgroundUpdates: async () => {},
    stopBackgroundUpdates: async () => {},
    startNavigationUpdates: async () => {},
    stopNavigationUpdates: async () => {},
});

export const useLocation = () => useContext(LocationContext);

interface LocationProviderProps {
    children: React.ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [foregroundSubscription, setForegroundSubscription] = useState<Location.LocationSubscription | null>(null);
    const [backgroundUpdateActive, setBackgroundUpdateActive] = useState(false);
    const [navigationSubscription, setNavigationSubscription] = useState<Location.LocationSubscription | null>(null);

    // Request permission and get initial location
    useEffect(() => {
        (async () => {
            await requestPermission();

            // Get initial location
            try {
                const currentLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                setLocation(currentLocation);
            } catch (err: any) {
                setErrorMsg('Error getting current location');
                console.error('Error getting current location:', err);
            }

            // Subscribe to location updates
            startForegroundUpdates();
        })();

        // Cleanup
        return () => {
            if (foregroundSubscription) {
                foregroundSubscription.remove();
            }
            if (navigationSubscription) {
                navigationSubscription.remove();
            }
            stopBackgroundUpdates();
        };
    }, []);

    const requestPermission = async (): Promise<boolean> => {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

            if (foregroundStatus !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return false;
            }

            // Request background permissions too (needed for navigation)
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

            // We can still function without background permission, but inform the user
            if (backgroundStatus !== 'granted') {
                console.log('Background location permission not granted');
            }

            return true;
        } catch (err) {
            setErrorMsg('Error requesting location permission');
            console.error('Error requesting location permission:', err);
            return false;
        }
    };

    const startForegroundUpdates = async () => {
        // Stop any existing subscription
        if (foregroundSubscription) {
            foregroundSubscription.remove();
        }

        // Start new subscription
        const subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.Balanced,
                distanceInterval: 10, // Minimum change (in meters) before update
                timeInterval: 5000, // Minimum time (in ms) between updates
            },
            (newLocation) => {
                setLocation(newLocation);
            }
        );

        setForegroundSubscription(subscription);
    };

    // NEW: High-frequency location updates for navigation
    const startNavigationUpdates = async () => {
        // Stop any existing navigation subscription
        if (navigationSubscription) {
            navigationSubscription.remove();
        }

        // Start high-frequency subscription for navigation
        const subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                distanceInterval: 1, // Update every 1 meter
                timeInterval: 1000, // Update every 1 second
            },
            (newLocation) => {
                setLocation(newLocation);
                console.log('📍 Navigation location update:', {
                    lat: newLocation.coords.latitude,
                    lng: newLocation.coords.longitude,
                    accuracy: newLocation.coords.accuracy,
                    speed: newLocation.coords.speed,
                    heading: newLocation.coords.heading
                });
            }
        );

        setNavigationSubscription(subscription);
        console.log('🚀 Started high-frequency navigation location updates');
    };

    const stopNavigationUpdates = async () => {
        if (navigationSubscription) {
            navigationSubscription.remove();
            setNavigationSubscription(null);
            console.log('🛑 Stopped navigation location updates');
        }
    };

    const startBackgroundUpdates = async () => {
        if (backgroundUpdateActive) return;

        try {
            await Location.startLocationUpdatesAsync('patrol-location-tracking', {
                accuracy: Location.Accuracy.Balanced,
                distanceInterval: 20, // Minimum change (in meters) before update
                timeInterval: 15000, // Minimum time (in ms) between updates
                foregroundService: {
                    notificationTitle: "Patrol Navigation Running",
                    notificationBody: "Tracking your location for navigation and patrol alerts",
                },
                // Android-specific
                activityType: Location.ActivityType.AutomotiveNavigation,
            });

            setBackgroundUpdateActive(true);
        } catch (err) {
            console.error('Error starting background location updates:', err);
        }
    };

    const stopBackgroundUpdates = async () => {
        if (!backgroundUpdateActive) return;

        try {
            const isTaskRegistered = await Location.hasStartedLocationUpdatesAsync('patrol-location-tracking');

            if (isTaskRegistered) {
                await Location.stopLocationUpdatesAsync('patrol-location-tracking');
            }

            setBackgroundUpdateActive(false);
        } catch (err) {
            console.error('Error stopping background location updates:', err);
        }
    };

    return (
        <LocationContext.Provider
            value={{
                location,
                errorMsg,
                requestPermission,
                startBackgroundUpdates,
                stopBackgroundUpdates,
                startNavigationUpdates, // NEW
                stopNavigationUpdates   // NEW
            }}
        >
            {children}
        </LocationContext.Provider>
    );
};