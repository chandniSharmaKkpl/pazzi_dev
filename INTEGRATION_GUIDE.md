# Enhanced Navigation System - Integration Guide

This guide provides step-by-step instructions for integrating the enhanced navigation system into your existing Pazzi Mobile app.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install the new dependency for voice navigation
npm install expo-speech@~12.0.0
```

### 2. Update Your Main Screen

Replace the existing navigation logic in `app/(tabs)/index.tsx` with the enhanced system:

```typescript
// Add these imports
import locationTrackingService from '../../services/location/locationTrackingService';
import navigationService from '../../services/navigation/navigationService';
import { EnhancedNavigationInstructions } from '../../components/navigation/EnhancedNavigationInstructions';

// Add navigation state
const [navigationState, setNavigationState] = useState<NavigationState>({
    isActive: false,
    currentStep: null,
    nextStep: null,
    distanceToNextTurn: 0,
    timeToNextTurn: 0,
    estimatedArrivalTime: null,
    currentRoadName: '',
    speedLimit: null,
    userSpeed: 0,
    isOffRoute: false,
    offRouteDistance: 0,
});

// Enhanced start navigation function
const handleStartNavigation = async () => {
    if (!location || !navigationRoute) return;
    
    try {
        // Start enhanced location tracking
        await locationTrackingService.startTracking({
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 1,
            timeInterval: 1000,
            backgroundUpdates: true,
        }, {
            onLocationUpdate: (locationData) => {
                // Update navigation state with new location
                navigationService.updateUserPosition(locationData);
            },
            onSpeedChange: (speed) => {
                setNavigationState(prev => ({ ...prev, userSpeed: speed }));
            },
        });

        // Start navigation with route
        await navigationService.startNavigation(navigationRoute, {
            onStepChange: (step, index) => {
                setNavigationState(prev => ({ 
                    ...prev, 
                    currentStep: step,
                    nextStep: navigationRoute.steps[index + 1] || null 
                }));
            },
            onOffRoute: (distance) => {
                setNavigationState(prev => ({ 
                    ...prev, 
                    isOffRoute: true, 
                    offRouteDistance: distance 
                }));
            },
            onArrival: () => {
                // Handle arrival at destination
                Alert.alert('Arrived', 'You have reached your destination!');
                handleStopNavigation();
            },
        });

        setNavigationMode('active');
        setNavigationState(prev => ({ ...prev, isActive: true }));
        
    } catch (error) {
        console.error('Error starting navigation:', error);
        Alert.alert('Navigation Error', 'Could not start navigation');
    }
};

// Enhanced stop navigation function
const handleStopNavigation = async () => {
    try {
        await locationTrackingService.stopTracking();
        await navigationService.stopNavigation();
        
        setNavigationMode(null);
        setNavigationState(prev => ({ ...prev, isActive: false }));
        
    } catch (error) {
        console.error('Error stopping navigation:', error);
    }
};
```

### 3. Add Enhanced Navigation UI

Replace the existing navigation instructions with the enhanced component:

```typescript
// Replace the existing navigation UI with:
{navigationState.isActive && (
    <EnhancedNavigationInstructions
        navigationState={navigationState}
        onStopNavigation={handleStopNavigation}
        onMuteToggle={(muted) => {
            // Handle mute toggle
            console.log('Voice navigation muted:', muted);
        }}
        onRecalculateRoute={async () => {
            // Handle route recalculation
            try {
                await navigationService.recalculateRoute();
                setNavigationState(prev => ({ ...prev, isOffRoute: false }));
            } catch (error) {
                console.error('Error recalculating route:', error);
            }
        }}
    />
)}
```

### 4. Update Map Component

Enhance your map component with the camera controller:

```typescript
// In your MainMap component, add:
import { MapCameraController } from './MapCameraController';

// Add camera controller ref
const cameraControllerRef = useRef<MapCameraControllerRef>(null);

// Add camera controller component
<MapCameraController
    ref={cameraControllerRef}
    cameraRef={cameraRef}
    navigationMode={navigationMode}
    userLocation={location ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
    } : null}
    userHeading={compassHeading}
    userSpeed={navigationState.userSpeed}
    routeCoordinates={navigationRoute?.geometry?.coordinates || []}
    onCameraMove={(position) => {
        // Handle camera movement
    }}
    onCameraIdle={() => {
        // Handle camera idle
    }}
/>
```

## 🔧 Advanced Configuration

### Location Tracking Configuration

```typescript
// Custom location tracking configuration
const locationConfig = {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 1, // Update every 1 meter
    timeInterval: 1000,  // Update every 1 second
    backgroundUpdates: true,
    activityType: Location.ActivityType.AutomotiveNavigation,
};

// Start with custom config
await locationTrackingService.startTracking(locationConfig, {
    onLocationUpdate: (locationData) => {
        // Handle location updates
        console.log('Location update:', locationData);
    },
    onSpeedChange: (speed) => {
        // Handle speed changes
        console.log('Speed change:', speed);
    },
    onHeadingChange: (heading) => {
        // Handle heading changes
        console.log('Heading change:', heading);
    },
});
```

### Navigation Service Configuration

```typescript
// Custom navigation configuration
const navigationConfig = {
    offRouteThreshold: 30, // meters
    recalculateThreshold: 50, // meters
    voiceEnabled: true,
    autoRecalculate: true,
};

// Start navigation with custom config
await navigationService.startNavigation(route, {
    onStepChange: (step, index) => {
        // Handle step changes
        console.log('Step change:', step, index);
    },
    onOffRoute: (distance) => {
        // Handle off-route detection
        console.log('Off route by:', distance, 'meters');
    },
    onArrival: () => {
        // Handle arrival
        console.log('Arrived at destination');
    },
    onRouteRecalculation: (newRoute) => {
        // Handle route recalculation
        console.log('Route recalculated:', newRoute);
    },
});
```

## 🎯 Key Features to Test

### 1. Real-time Location Tracking
- [ ] High-precision GPS updates
- [ ] Background location tracking
- [ ] Speed and heading detection
- [ ] Battery optimization

### 2. Dynamic Map Zooming
- [ ] Automatic user following
- [ ] Speed-based zoom levels
- [ ] Smooth camera transitions
- [ ] 3D navigation view

### 3. Turn-by-Turn Navigation
- [ ] Real-time instructions
- [ ] Voice navigation
- [ ] Distance announcements
- [ ] Visual turn indicators

### 4. Advanced Features
- [ ] Off-route detection
- [ ] Route recalculation
- [ ] Multiple route alternatives
- [ ] ETA calculations

## 🚦 Performance Tips

### 1. Battery Optimization
```typescript
// Use lower accuracy when not navigating
const standardConfig = {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 10,
    timeInterval: 5000,
    backgroundUpdates: false,
};

// Use high accuracy only during navigation
const navigationConfig = {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 1,
    timeInterval: 1000,
    backgroundUpdates: true,
};
```

### 2. Memory Management
```typescript
// Clean up subscriptions
useEffect(() => {
    return () => {
        locationTrackingService.stopTracking();
        navigationService.stopNavigation();
    };
}, []);
```

### 3. Error Handling
```typescript
// Handle location errors gracefully
const handleLocationError = (error: string) => {
    console.error('Location error:', error);
    // Fall back to lower accuracy or show user message
};
```

## 🔄 Migration from Existing Code

### 1. Replace LocationContext Usage
```typescript
// Old way
const { location, startNavigationUpdates, stopNavigationUpdates } = useLocation();

// New way
const locationData = locationTrackingService.getLastLocation();
const isTracking = locationTrackingService.isTrackingActive();
```

### 2. Update Navigation State
```typescript
// Old way
const [navigationMode, setNavigationMode] = useState<'preview' | 'active' | null>(null);

// New way
const [navigationState, setNavigationState] = useState<NavigationState>({
    isActive: false,
    // ... other state properties
});
```

### 3. Replace Navigation Instructions
```typescript
// Old way
<NavigationInstructions />

// New way
<EnhancedNavigationInstructions
    navigationState={navigationState}
    onStopNavigation={handleStopNavigation}
    onMuteToggle={handleMuteToggle}
    onRecalculateRoute={handleRecalculateRoute}
/>
```

## 🎯 Testing Checklist

- [ ] Install expo-speech dependency
- [ ] Update main screen with enhanced navigation
- [ ] Test location tracking accuracy
- [ ] Verify voice navigation works
- [ ] Test off-route detection
- [ ] Check battery usage
- [ ] Test background location tracking
- [ ] Verify camera controls work
- [ ] Test route recalculation
- [ ] Check error handling

## 🚀 Next Steps

1. **Test the integration** with the provided examples
2. **Customize the UI** to match your app's design
3. **Add additional features** like traffic data integration
4. **Optimize performance** based on your specific use case
5. **Add offline support** for cached navigation data

The enhanced navigation system provides a complete, professional-grade solution that addresses all the core issues while maintaining excellent performance and user experience. 