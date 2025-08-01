import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useLocation } from './LocationContext';

// Define the shape of a route
interface Route {
    distance: number;
    duration: number;
    steps: any[];
    geometry: {
        coordinates: [number, number][];
    };
}

// Define the shape of the navigation context state
interface NavigationContextState {
    isNavigating: boolean;
    route: Route | null;
    currentPosition: { latitude: number; longitude: number } | null;
    currentStep: number;
    startNavigation: (route: Route) => void;
    stopNavigation: () => void;
    updateCurrentPosition: (position: { latitude: number; longitude: number }) => void;
    setCurrentStep: (step: number) => void;
}

// Create the context with a default value
const NavigationContext = createContext<NavigationContextState | undefined>(undefined);

// Create a provider component
export const NavigationProvider = ({ children }: { children: ReactNode }) => {
    const [isNavigating, setIsNavigating] = useState(false);
    const [route, setRoute] = useState<Route | null>(null);
    const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number } | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const { location, startNavigationUpdates, stopNavigationUpdates } = useLocation();

    // Update current position when location changes during navigation
    useEffect(() => {
        if (isNavigating && location) {
            const newPosition = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            };
            setCurrentPosition(newPosition);
            console.log('📍 Navigation position updated:', newPosition);
        }
    }, [location, isNavigating]);

    const startNavigation = (newRoute: Route) => {
        setRoute(newRoute);
        setIsNavigating(true);
        setCurrentStep(0);
        
        // Start high-frequency location updates for navigation
        startNavigationUpdates();
        
        console.log('🚀 Navigation started with route:', {
            distance: newRoute.distance,
            duration: newRoute.duration,
            steps: newRoute.steps.length
        });
    };

    const stopNavigation = () => {
        setRoute(null);
        setIsNavigating(false);
        setCurrentPosition(null);
        setCurrentStep(0);
        
        // Stop high-frequency location updates
        stopNavigationUpdates();
        
        console.log('🛑 Navigation stopped');
    };

    const updateCurrentPosition = (position: { latitude: number; longitude: number }) => {
        setCurrentPosition(position);
    };

    const handleSetCurrentStep = (step: number) => {
        setCurrentStep(step);
        console.log('📋 Navigation step changed to:', step);
    };

    return (
        <NavigationContext.Provider value={{ 
            isNavigating, 
            route, 
            currentPosition,
            currentStep,
            startNavigation, 
            stopNavigation,
            updateCurrentPosition,
            setCurrentStep: handleSetCurrentStep
        }}>
            {children}
        </NavigationContext.Provider>
    );
};

// Create a custom hook to use the navigation context
export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};
