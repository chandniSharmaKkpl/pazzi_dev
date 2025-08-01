import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number;
    heading: number;
    altitude: number;
    timestamp: number;
}

export interface LocationTrackingConfig {
    accuracy: Location.Accuracy;
    distanceInterval: number;
    timeInterval: number;
    backgroundUpdates: boolean;
    activityType: Location.ActivityType;
}

export interface LocationCallbacks {
    onLocationUpdate?: (location: LocationData) => void;
    onLocationError?: (error: string) => void;
    onAccuracyChange?: (accuracy: number) => void;
    onSpeedChange?: (speed: number) => void;
    onHeadingChange?: (heading: number) => void;
    onBackgroundLocationStart?: () => void;
    onBackgroundLocationStop?: () => void;
}

class LocationTrackingService {
    private foregroundSubscription: Location.LocationSubscription | null = null;
    private backgroundSubscription: Location.LocationSubscription | null = null;
    private headingSubscription: Location.LocationSubscription | null = null;
    private isTracking = false;
    private isBackgroundTracking = false;
    private callbacks: LocationCallbacks = {};
    private lastLocation: LocationData | null = null;
    private locationHistory: LocationData[] = [];
    private maxHistorySize = 100;

    // Default configuration for navigation
    private defaultConfig: LocationTrackingConfig = {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 1, // 1 meter
        timeInterval: 1000, // 1 second
        backgroundUpdates: true,
        activityType: Location.ActivityType.AutomotiveNavigation,
    };

    // Request permissions
    async requestPermissions(): Promise<boolean> {
        try {
            // Request foreground permissions
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            
            if (foregroundStatus !== 'granted') {
                console.error('❌ Foreground location permission denied');
                return false;
            }

            // Request background permissions
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            
            if (backgroundStatus !== 'granted') {
                console.warn('⚠️ Background location permission not granted - some features may be limited');
            }

            console.log('✅ Location permissions granted');
            return true;
        } catch (error) {
            console.error('❌ Error requesting location permissions:', error);
            return false;
        }
    }

    // Start location tracking
    async startTracking(config: Partial<LocationTrackingConfig> = {}, callbacks: LocationCallbacks = {}) {
        if (this.isTracking) {
            console.warn('⚠️ Location tracking already active');
            return;
        }

        this.callbacks = callbacks;
        const finalConfig = { ...this.defaultConfig, ...config };

        try {
            // Stop any existing subscriptions
            await this.stopTracking();

            // Start foreground location tracking
            await this.startForegroundTracking(finalConfig);

            // Start heading tracking
            await this.startHeadingTracking();

            // Start background tracking if enabled
            if (finalConfig.backgroundUpdates) {
                await this.startBackgroundTracking(finalConfig);
            }

            this.isTracking = true;
            console.log('🚀 Location tracking started with config:', finalConfig);
        } catch (error) {
            console.error('❌ Error starting location tracking:', error);
            this.callbacks.onLocationError?.(error instanceof Error ? error.message : 'Unknown error');
        }
    }

    // Stop location tracking
    async stopTracking() {
        this.isTracking = false;

        // Stop foreground subscription
        if (this.foregroundSubscription) {
            this.foregroundSubscription.remove();
            this.foregroundSubscription = null;
        }

        // Stop background subscription
        if (this.backgroundSubscription) {
            this.backgroundSubscription.remove();
            this.backgroundSubscription = null;
        }

        // Stop heading subscription
        if (this.headingSubscription) {
            this.headingSubscription.remove();
            this.headingSubscription = null;
        }

        // Stop background location updates
        if (this.isBackgroundTracking) {
            await this.stopBackgroundTracking();
        }

        console.log('🛑 Location tracking stopped');
    }

    // Start foreground location tracking
    private async startForegroundTracking(config: LocationTrackingConfig) {
        try {
            this.foregroundSubscription = await Location.watchPositionAsync(
                {
                    accuracy: config.accuracy,
                    distanceInterval: config.distanceInterval,
                    timeInterval: config.timeInterval,
                    mayShowUserSettingsDialog: false,
                },
                (location) => {
                    this.handleLocationUpdate(location);
                }
            );

            console.log('📍 Foreground location tracking started');
        } catch (error) {
            console.error('❌ Error starting foreground location tracking:', error);
            throw error;
        }
    }

    // Start heading tracking
    private async startHeadingTracking() {
        try {
            this.headingSubscription = await Location.watchHeadingAsync((heading) => {
                if (this.lastLocation) {
                    this.lastLocation.heading = heading.trueHeading;
                    this.callbacks.onHeadingChange?.(heading.trueHeading);
                }
            });

            console.log('🧭 Heading tracking started');
        } catch (error) {
            console.error('❌ Error starting heading tracking:', error);
        }
    }

    // Start background location tracking
    private async startBackgroundTracking(config: LocationTrackingConfig) {
        try {
            const taskName = 'background-location-tracking';
            
            // Check if task is already registered
            const isTaskRegistered = await Location.hasStartedLocationUpdatesAsync(taskName);
            
            if (isTaskRegistered) {
                await Location.stopLocationUpdatesAsync(taskName);
            }

            // Start background location updates
            await Location.startLocationUpdatesAsync(taskName, {
                accuracy: config.accuracy,
                distanceInterval: config.distanceInterval,
                timeInterval: config.timeInterval,
                foregroundService: {
                    notificationTitle: "Navigation Active",
                    notificationBody: "Tracking your location for navigation",
                    notificationColor: "#0066CC",
                },
                activityType: config.activityType,
                showsBackgroundLocationIndicator: true,
                // Android-specific options
                ...(Platform.OS === 'android' && {
                    startForeground: true,
                    stopForeground: false,
                }),
            });

            this.isBackgroundTracking = true;
            this.callbacks.onBackgroundLocationStart?.();
            console.log('🔄 Background location tracking started');
        } catch (error) {
            console.error('❌ Error starting background location tracking:', error);
        }
    }

    // Stop background location tracking
    private async stopBackgroundTracking() {
        try {
            const taskName = 'background-location-tracking';
            const isTaskRegistered = await Location.hasStartedLocationUpdatesAsync(taskName);
            
            if (isTaskRegistered) {
                await Location.stopLocationUpdatesAsync(taskName);
            }

            this.isBackgroundTracking = false;
            this.callbacks.onBackgroundLocationStop?.();
            console.log('🛑 Background location tracking stopped');
        } catch (error) {
            console.error('❌ Error stopping background location tracking:', error);
        }
    }

    // Handle location updates
    private handleLocationUpdate(location: Location.LocationObject) {
        const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            speed: location.coords.speed || 0,
            heading: location.coords.heading || 0,
            altitude: location.coords.altitude || 0,
            timestamp: location.timestamp,
        };

        // Update last location
        this.lastLocation = locationData;

        // Add to history
        this.locationHistory.push(locationData);
        if (this.locationHistory.length > this.maxHistorySize) {
            this.locationHistory.shift();
        }

        // Call callbacks
        this.callbacks.onLocationUpdate?.(locationData);
        this.callbacks.onAccuracyChange?.(locationData.accuracy);
        this.callbacks.onSpeedChange?.(locationData.speed);

        console.log('📍 Location update:', {
            lat: locationData.latitude.toFixed(6),
            lng: locationData.longitude.toFixed(6),
            accuracy: locationData.accuracy.toFixed(1),
            speed: locationData.speed.toFixed(1),
            heading: locationData.heading.toFixed(1),
        });
    }

    // Get current location
    async getCurrentLocation(): Promise<LocationData | null> {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
            });

            const locationData: LocationData = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || 0,
                speed: location.coords.speed || 0,
                heading: location.coords.heading || 0,
                altitude: location.coords.altitude || 0,
                timestamp: location.timestamp,
            };

            this.lastLocation = locationData;
            return locationData;
        } catch (error) {
            console.error('❌ Error getting current location:', error);
            return null;
        }
    }

    // Get last known location
    getLastLocation(): LocationData | null {
        return this.lastLocation;
    }

    // Get location history
    getLocationHistory(): LocationData[] {
        return [...this.locationHistory];
    }

    // Calculate average speed from recent locations
    getAverageSpeed(): number {
        if (this.locationHistory.length < 2) return 0;

        const recentLocations = this.locationHistory.slice(-10);
        let totalSpeed = 0;
        let validSpeeds = 0;

        for (const location of recentLocations) {
            if (location.speed > 0) {
                totalSpeed += location.speed;
                validSpeeds++;
            }
        }

        return validSpeeds > 0 ? totalSpeed / validSpeeds : 0;
    }

    // Calculate distance traveled
    getDistanceTraveled(): number {
        if (this.locationHistory.length < 2) return 0;

        let totalDistance = 0;
        for (let i = 1; i < this.locationHistory.length; i++) {
            const prev = this.locationHistory[i - 1];
            const curr = this.locationHistory[i];
            totalDistance += this.calculateDistance(
                prev.latitude, prev.longitude,
                curr.latitude, curr.longitude
            );
        }

        return totalDistance;
    }

    // Calculate distance between two points (Haversine formula)
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

    // Check if location is accurate enough for navigation
    isLocationAccurateForNavigation(): boolean {
        if (!this.lastLocation) return false;
        
        // Check accuracy (should be better than 10 meters for navigation)
        if (this.lastLocation.accuracy > 10) return false;
        
        // Check if we have recent location (within last 5 seconds)
        const now = Date.now();
        const timeDiff = now - this.lastLocation.timestamp;
        if (timeDiff > 5000) return false;
        
        return true;
    }

    // Get formatted speed
    getFormattedSpeed(): string {
        const speed = this.lastLocation?.speed || 0;
        if (speed === 0) return '0 km/h';
        
        const speedKmh = speed * 3.6; // Convert m/s to km/h
        return `${speedKmh.toFixed(1)} km/h`;
    }

    // Get formatted accuracy
    getFormattedAccuracy(): string {
        const accuracy = this.lastLocation?.accuracy || 0;
        return `${accuracy.toFixed(1)} m`;
    }

    // Check if tracking is active
    isTrackingActive(): boolean {
        return this.isTracking;
    }

    // Check if background tracking is active
    isBackgroundTrackingActive(): boolean {
        return this.isBackgroundTracking;
    }
}

export const locationTrackingService = new LocationTrackingService();
export default locationTrackingService; 