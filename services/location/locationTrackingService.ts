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
        accuracy: Location.Accuracy.High, // Use High instead of BestForNavigation to prevent crashes
        distanceInterval: 5, // 5 meters to reduce load
        timeInterval: 2000, // 2 seconds to reduce frequency
        backgroundUpdates: false, // Disabled by default to avoid task manager errors
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

            // Skip background permissions - not needed without expo-task-manager
            console.log('📱 Background location permission skipped - not supported without expo-task-manager');

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

            // Skip background tracking completely - not supported without expo-task-manager
            if (finalConfig.backgroundUpdates) {
                console.log('📱 Background location tracking disabled - using foreground tracking only');
                console.log('💡 To enable background tracking, install expo-task-manager');
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
            // Add validation to prevent crashes
            if (!config) {
                throw new Error('Invalid config provided for location tracking');
            }

            this.foregroundSubscription = await Location.watchPositionAsync(
                {
                    accuracy: config.accuracy || Location.Accuracy.High,
                    distanceInterval: Math.max(config.distanceInterval || 5, 1), // Minimum 1 meter
                    timeInterval: Math.max(config.timeInterval || 2000, 1000), // Minimum 1 second
                    mayShowUserSettingsDialog: false,
                },
                (location) => {
                    try {
                        this.handleLocationUpdate(location);
                    } catch (updateError) {
                        console.error('❌ Error handling location update:', updateError);
                        this.callbacks.onLocationError?.(updateError instanceof Error ? updateError.message : 'Location update error');
                    }
                }
            );

            console.log('📍 Foreground location tracking started');
        } catch (error) {
            console.error('❌ Error starting foreground location tracking:', error);
            this.callbacks.onLocationError?.(error instanceof Error ? error.message : 'Location tracking error');
            throw error;
        }
    }

    // Start heading tracking
    private async startHeadingTracking() {
        try {
            this.headingSubscription = await Location.watchHeadingAsync((heading) => {
                try {
                    if (this.lastLocation && heading && typeof heading.trueHeading === 'number') {
                        this.lastLocation.heading = heading.trueHeading;
                        this.callbacks.onHeadingChange?.(heading.trueHeading);
                    }
                } catch (headingError) {
                    console.error('❌ Error handling heading update:', headingError);
                }
            });

            console.log('🧭 Heading tracking started');
        } catch (error) {
            console.error('❌ Error starting heading tracking:', error);
            // Don't throw here - heading is not critical for navigation
        }
    }

    // Start background location tracking - DISABLED
    private async startBackgroundTracking(config: LocationTrackingConfig) {
        // Background location tracking completely disabled to prevent crashes
        console.log('📱 Background location tracking disabled - requires expo-task-manager');
        return Promise.resolve();
    }

    // Stop background location tracking - DISABLED
    private async stopBackgroundTracking() {
        // Background location tracking completely disabled 
        this.isBackgroundTracking = false;
        console.log('📱 Background location stop skipped - not active');
        return Promise.resolve();
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