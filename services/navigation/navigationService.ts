import { Alert } from 'react-native';
import * as Location from 'expo-location';
import directionsService from '../map/directionsService';

export interface NavigationStep {
    instruction: string;
    distance: number;
    duration: number;
    maneuver: {
        type: string;
        instruction: string;
        bearing_before: number;
        bearing_after: number;
    };
    coordinates: [number, number][];
    remainingDistance: number;
    remainingDuration: number;
}

export interface NavigationRoute {
    distance: number;
    duration: number;
    steps: NavigationStep[];
    geometry: {
        coordinates: [number, number][];
    };
    trafficInfo?: {
        hasTraffic: boolean;
        delay: number;
    };
}

export interface NavigationState {
    isActive: boolean;
    currentRoute: NavigationRoute | null;
    currentStepIndex: number;
    userPosition: { latitude: number; longitude: number } | null;
    userHeading: number;
    userSpeed: number;
    distanceToNextTurn: number;
    timeToNextTurn: number;
    estimatedArrivalTime: Date | null;
    isOffRoute: boolean;
    offRouteDistance: number;
    currentRoadName: string;
    speedLimit: number | null;
}

export interface NavigationCallbacks {
    onStepChange?: (step: NavigationStep, index: number) => void;
    onOffRoute?: (distance: number) => void;
    onArrival?: () => void;
    onRouteRecalculation?: (newRoute: NavigationRoute) => void;
    onSpeedLimitChange?: (speedLimit: number) => void;
    onRoadNameChange?: (roadName: string) => void;
}

class NavigationService {
    private state: NavigationState = {
        isActive: false,
        currentRoute: null,
        currentStepIndex: 0,
        userPosition: null,
        userHeading: 0,
        userSpeed: 0,
        distanceToNextTurn: 0,
        timeToNextTurn: 0,
        estimatedArrivalTime: null,
        isOffRoute: false,
        offRouteDistance: 0,
        currentRoadName: '',
        speedLimit: null,
    };

    private callbacks: NavigationCallbacks = {};
    private locationSubscription: Location.LocationSubscription | null = null;
    private headingSubscription: Location.LocationSubscription | null = null;
    private offRouteThreshold = 30; // meters
    private recalculateThreshold = 50; // meters
    private updateInterval: NodeJS.Timeout | null = null;

    // Initialize navigation with route
    async startNavigation(route: NavigationRoute, callbacks: NavigationCallbacks = {}) {
        this.state.currentRoute = route;
        this.state.isActive = true;
        this.state.currentStepIndex = 0;
        this.callbacks = callbacks;

        // Start high-frequency location tracking
        await this.startLocationTracking();
        
        // Start navigation updates
        this.startNavigationUpdates();

        console.log('🚀 Navigation started with route:', {
            distance: route.distance,
            duration: route.duration,
            steps: route.steps.length
        });
    }

    // Stop navigation
    stopNavigation() {
        this.state.isActive = false;
        this.state.currentRoute = null;
        this.state.currentStepIndex = 0;
        
        this.stopLocationTracking();
        this.stopNavigationUpdates();
        
        console.log('🛑 Navigation stopped');
    }

    // Start high-frequency location tracking
    private async startLocationTracking() {
        try {
            // Stop existing subscriptions
            if (this.locationSubscription) {
                this.locationSubscription.remove();
            }
            if (this.headingSubscription) {
                this.headingSubscription.remove();
            }

            // Start location tracking with high accuracy
            this.locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    distanceInterval: 1, // Update every 1 meter
                    timeInterval: 1000, // Update every 1 second
                    mayShowUserSettingsDialog: false,
                },
                (location) => {
                    this.updateUserPosition(location);
                }
            );

            // Start heading tracking
            this.headingSubscription = await Location.watchHeadingAsync((heading) => {
                this.state.userHeading = heading.trueHeading;
            });

            console.log('📍 High-frequency location tracking started');
        } catch (error) {
            console.error('❌ Error starting location tracking:', error);
        }
    }

    // Stop location tracking
    private stopLocationTracking() {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }
        if (this.headingSubscription) {
            this.headingSubscription.remove();
            this.headingSubscription = null;
        }
    }

    // Update user position and process navigation logic
    private updateUserPosition(location: Location.LocationObject) {
        const newPosition = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };

        this.state.userPosition = newPosition;
        this.state.userSpeed = location.coords.speed || 0;
        this.state.userHeading = location.coords.heading || 0;

        if (this.state.isActive && this.state.currentRoute) {
            this.processNavigationUpdate();
        }
    }

    // Process navigation updates
    private processNavigationUpdate() {
        if (!this.state.currentRoute || !this.state.userPosition) return;

        const currentStep = this.state.currentRoute.steps[this.state.currentStepIndex];
        if (!currentStep) return;

        // Calculate distance to next turn
        const distanceToTurn = this.calculateDistanceToNextTurn();
        this.state.distanceToNextTurn = distanceToTurn;

        // Check if user has reached the current step
        if (distanceToTurn <= 20) { // Within 20 meters of turn
            this.advanceToNextStep();
        }

        // Check for off-route
        this.checkOffRoute();

        // Update ETA
        this.updateETA();

        // Update road information
        this.updateRoadInformation();
    }

    // Calculate distance to next turn
    private calculateDistanceToNextTurn(): number {
        if (!this.state.userPosition || !this.state.currentRoute) return 0;

        const currentStep = this.state.currentRoute.steps[this.state.currentStepIndex];
        if (!currentStep) return 0;

        // Calculate distance from user to the end of current step
        const stepEndCoord = currentStep.coordinates[currentStep.coordinates.length - 1];
        if (!stepEndCoord) return 0;

        return this.getDistance(
            this.state.userPosition.latitude,
            this.state.userPosition.longitude,
            stepEndCoord[1],
            stepEndCoord[0]
        );
    }

    // Advance to next navigation step
    private advanceToNextStep() {
        if (!this.state.currentRoute) return;

        const nextStepIndex = this.state.currentStepIndex + 1;
        
        if (nextStepIndex < this.state.currentRoute.steps.length) {
            this.state.currentStepIndex = nextStepIndex;
            const newStep = this.state.currentRoute.steps[nextStepIndex];
            
            // Call step change callback
            this.callbacks.onStepChange?.(newStep, nextStepIndex);
            
            console.log('📋 Advanced to step:', nextStepIndex, newStep.instruction);
        } else {
            // Arrived at destination
            this.callbacks.onArrival?.();
            console.log('🎯 Arrived at destination');
        }
    }

    // Check if user is off route
    private checkOffRoute() {
        if (!this.state.userPosition || !this.state.currentRoute) return;

        const routeCoords = this.state.currentRoute.geometry.coordinates;
        let minDistance = Infinity;

        // Find minimum distance to route
        for (const coord of routeCoords) {
            const distance = this.getDistance(
                this.state.userPosition.latitude,
                this.state.userPosition.longitude,
                coord[1],
                coord[0]
            );
            if (distance < minDistance) {
                minDistance = distance;
            }
        }

        this.state.offRouteDistance = minDistance;
        this.state.isOffRoute = minDistance > this.offRouteThreshold;

        if (this.state.isOffRoute) {
            this.callbacks.onOffRoute?.(minDistance);
            
            // Recalculate route if significantly off route
            if (minDistance > this.recalculateThreshold) {
                this.recalculateRoute();
            }
        }
    }

    // Recalculate route
    private async recalculateRoute() {
        if (!this.state.userPosition || !this.state.currentRoute) return;

        try {
            // Get destination from current route
            const destination = this.state.currentRoute.geometry.coordinates[
                this.state.currentRoute.geometry.coordinates.length - 1
            ];

            const newRoute = await directionsService.getDirections(
                {
                    latitude: this.state.userPosition.latitude,
                    longitude: this.state.userPosition.longitude
                },
                {
                    latitude: destination[1],
                    longitude: destination[0]
                }
            );

            if (newRoute) {
                const enhancedRoute = this.enhanceRouteWithNavigationData(newRoute);
                this.state.currentRoute = enhancedRoute;
                this.state.currentStepIndex = 0;
                this.state.isOffRoute = false;
                
                this.callbacks.onRouteRecalculation?.(enhancedRoute);
                console.log('🔄 Route recalculated');
            }
        } catch (error) {
            console.error('❌ Error recalculating route:', error);
        }
    }

    // Update ETA
    private updateETA() {
        if (!this.state.currentRoute) return;

        const remainingDuration = this.calculateRemainingDuration();
        const now = new Date();
        this.state.estimatedArrivalTime = new Date(now.getTime() + remainingDuration * 1000);
    }

    // Calculate remaining duration
    private calculateRemainingDuration(): number {
        if (!this.state.currentRoute) return 0;

        let remainingDuration = 0;
        
        // Add duration of remaining steps
        for (let i = this.state.currentStepIndex; i < this.state.currentRoute.steps.length; i++) {
            remainingDuration += this.state.currentRoute.steps[i].duration;
        }

        return remainingDuration;
    }

    // Update road information
    private updateRoadInformation() {
        // This would typically involve reverse geocoding to get road names
        // For now, we'll use a placeholder
        this.state.currentRoadName = 'Current Road';
        this.state.speedLimit = 50; // Default speed limit
        
        this.callbacks.onRoadNameChange?.(this.state.currentRoadName);
        this.callbacks.onSpeedLimitChange?.(this.state.speedLimit);
    }

    // Start navigation updates
    private startNavigationUpdates() {
        this.updateInterval = setInterval(() => {
            if (this.state.isActive) {
                this.processNavigationUpdate();
            }
        }, 1000); // Update every second
    }

    // Stop navigation updates
    private stopNavigationUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Enhance route with navigation data
    private enhanceRouteWithNavigationData(route: any): NavigationRoute {
        const enhancedSteps: NavigationStep[] = route.steps.map((step: any, index: number) => {
            // Calculate remaining distance and duration
            let remainingDistance = 0;
            let remainingDuration = 0;
            
            for (let i = index; i < route.steps.length; i++) {
                remainingDistance += route.steps[i].distance;
                remainingDuration += route.steps[i].duration;
            }

            return {
                ...step,
                remainingDistance,
                remainingDuration,
                coordinates: this.extractStepCoordinates(step, route.geometry.coordinates, index)
            };
        });

        return {
            ...route,
            steps: enhancedSteps
        };
    }

    // Extract coordinates for a specific step
    private extractStepCoordinates(step: any, routeCoordinates: [number, number][], stepIndex: number): [number, number][] {
        // This is a simplified implementation
        // In a real implementation, you would map step coordinates to route coordinates
        return routeCoordinates.slice(stepIndex * 10, (stepIndex + 1) * 10);
    }

    // Get current navigation state
    getNavigationState(): NavigationState {
        return { ...this.state };
    }

    // Get current step
    getCurrentStep(): NavigationStep | null {
        if (!this.state.currentRoute || this.state.currentStepIndex >= this.state.currentRoute.steps.length) {
            return null;
        }
        return this.state.currentRoute.steps[this.state.currentStepIndex];
    }

    // Get formatted distance to next turn
    getFormattedDistanceToNextTurn(): string {
        const distance = this.state.distanceToNextTurn;
        if (distance >= 1000) {
            return `${(distance / 1000).toFixed(1)} km`;
        }
        return `${Math.round(distance)} m`;
    }

    // Get formatted ETA
    getFormattedETA(): string {
        if (!this.state.estimatedArrivalTime) return '';
        
        const now = new Date();
        const eta = this.state.estimatedArrivalTime;
        const diffMs = eta.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / (1000 * 60));
        
        if (diffMins < 60) {
            return `${diffMins} min`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        }
    }

    // Get turn instruction with distance
    getTurnInstruction(): string {
        const currentStep = this.getCurrentStep();
        if (!currentStep) return '';

        const distance = this.getFormattedDistanceToNextTurn();
        return `${currentStep.instruction} in ${distance}`;
    }

    // Calculate distance between two points (Haversine formula)
    private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}

export const navigationService = new NavigationService();
export default navigationService;