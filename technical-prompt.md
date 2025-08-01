## Important Implementation Notes

1. **WebSocket Implementation Priority**: The application must use WebSockets specifically for real-time map and patrol updates. This is a critical feature that allows users to see new patrols appear on the map instantly without manually refreshing.

2. **Separation of Concerns**: All code should follow a clean architecture with proper separation of UI components from business logic. Each feature should be contained in its own directory with relevant components, hooks, and services.

3. **Performance Focus**: The app will be used while driving, so performance optimization for map rendering and real-time updates is essential. Target a smooth 60 FPS when panning and zooming the map, even with numerous patrol markers visible.

4. **Code Quality**: Maintain high code quality standards with proper TypeScript typing, ESLint compliance, and comprehensive test coverage. All components should be well-documented with clear comments explaining complex logic.

5. **Accessibility Requirements**: The app must be fully accessible to all users, including those with visual or motor impairments. Ensure large touch targets (minimum 48dp), high contrast options, and VoiceOver/TalkBack compatibility.

## Additional Requirements for Claude Implementation

When implementing this technical specification, please follow these guidelines:

1. Consider the target audience of older and less tech-savvy users while maintaining a clean, professional appearance.

2. Prioritize driver safety by minimizing the need for attention to the screen and maximizing the size of interactive elements.

3. Implement all real-time features with fallback mechanisms for poor connectivity scenarios.

4. Ensure the map and navigation system works efficiently even in areas with limited internet connectivity.

5. Follow all appropriate Expo and React Native best practices for performance and stability.// Cache a navigation route
export const cacheRoute = async (origin: string, destination: string, route: Route): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.CACHED_ROUTES);
    const cachedRoutes = existingData ? JSON.parse(existingData) : {};
    
    const routeKey = `${origin}_${destination}`;
    cachedRoutes[routeKey] = {
      route,
      timestamp: Date.now(),
    };
    
    // Limit cache size to last 10 routes
    const routeKeys = Object.keys(cachedRoutes);
    if (routeKeys.length > 10) {
      // Sort by timestamp and remove oldest
      const oldestKey = routeKeys
        .map(key => ({ key, timestamp: cachedRoutes[key].timestamp }))
        .sort((a, b) => a.timestamp - b.timestamp)[0].key;
      
      delete cachedRoutes[oldestKey];
    }
    
    await AsyncStorage.setItem(KEYS.CACHED_ROUTES, JSON.stringify(cachedRoutes));
  } catch (error) {
    console.error('Error caching route:', error);
  }
};

// Get a cached route
export const getCachedRoute = async (origin: string, destination: string): Promise<Route | null> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.CACHED_ROUTES);
    const cachedRoutes = existingData ? JSON.parse(existingData) : {};
    
    const routeKey = `${origin}_${destination}`;
    const cachedData = cachedRoutes[routeKey];
    
    // Return null if no cached route or if it's older than 24 hours
    if (!cachedData || Date.now() - cachedData.timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }
    
    return cachedData.route;
  } catch (error) {
    console.error('Error getting cached route:', error);
    return null;
  }
};

// Check if the device is online
export const isOnline = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected === true;
};

// Sync pending reports when online
export const syncPendingReports = async (
  submitReportFunction: (report: PatrolReport) => Promise<Patrol>
): Promise<boolean> => {
  try {
    const isDeviceOnline = await isOnline();
    if (!isDeviceOnline) {
      return false;
    }
    
    const pendingReports = await getPendingPatrolReports();
    if (pendingReports.length === 0) {
      return true;
    }
    
    let allSuccessful = true;
    
    // Process each pending report
    for (let i = 0; i < pendingReports.length; i++) {
      try {
        await submitReportFunction(pendingReports[i]);
        await removePendingReport(i);
      } catch (error) {
        console.error(`Failed to sync report ${i}:`, error);
        allSuccessful = false;
      }
    }
    
    return allSuccessful;
  } catch (error) {
    console.error('Error in syncPendingReports:', error);
    return false;
  }
};

// Clear outdated cache items
export const cleanupOldCacheData = async (): Promise<void> => {
  try {
    // Remove patrol data older than 24 hours
    const patrols = await getLocalPatrols();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const filteredPatrols = patrols.filter(patrol => patrol.timestamp > oneDayAgo);
    
    if (filteredPatrols.length !== patrols.length) {
      await savePatrolsLocally(filteredPatrols);
    }
    
    // Clean up old cached routes
    const existingData = await AsyncStorage.getItem(KEYS.CACHED_ROUTES);
    if (existingData) {
      const cachedRoutes = JSON.parse(existingData);
      let hasChanges = false;
      
      for (const key in cachedRoutes) {
        if (cachedRoutes[key].timestamp < oneDayAgo) {
          delete cachedRoutes[key];
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        await AsyncStorage.setItem(KEYS.CACHED_ROUTES, JSON.stringify(cachedRoutes));
      }
    }
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
};
```

## Detailed OpenStreetMap Integration

The app requires robust integration with OpenStreetMap for both map display and navigation features:

### 1. Map Initialization and Configuration

```typescript
// services/map/openStreetMapService.ts
import * as FileSystem from 'expo-file-system';
import { Region } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// Base URL for OpenStreetMap tiles
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Directory for caching map tiles
const TILE_CACHE_DIRECTORY = `${FileSystem.cacheDirectory}map_tiles/`;

// Ensure the cache directory exists
const ensureCacheDirectory = async (): Promise<void> => {
  const dirInfo = await FileSystem.getInfoAsync(TILE_CACHE_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(TILE_CACHE_DIRECTORY, { intermediates: true });
  }
};

// Get a map tile, either from cache or network
export const getMapTile = async (z: number, x: number, y: number): Promise<string> => {
  await ensureCacheDirectory();
  
  const tileFilename = `${z}_${x}_${y}.png`;
  const localTilePath = `${TILE_CACHE_DIRECTORY}${tileFilename}`;
  
  try {
    // Check if tile exists in cache
    const fileInfo = await FileSystem.getInfoAsync(localTilePath);
    
    if (fileInfo.exists) {
      // Check if the tile is older than 30 days
      const now = new Date();
      const modificationTime = new Date(fileInfo.modificationTime * 1000);
      const ageInDays = (now.getTime() - modificationTime.getTime()) / (1000 * 60 * 60 * 24);
      
      if (ageInDays < 30) {
        return localTilePath;
      }
    }
    
    // If online and tile doesn't exist or is too old, download it
    const isConnected = (await NetInfo.fetch()).isConnected;
    if (isConnected) {
      const remoteUrl = OSM_TILE_URL
        .replace('{z}', z.toString())
        .replace('{x}', x.toString())
        .replace('{y}', y.toString());
      
      await FileSystem.downloadAsync(remoteUrl, localTilePath);
      return localTilePath;
    } else if (fileInfo.exists) {
      // If offline but we have an old cached tile, use it anyway
      return localTilePath;
    } else {
      // If offline and no cached tile, return a placeholder
      return Platform.OS === 'android'
        ? 'file:///android_asset/map_placeholder.png'
        : 'map_placeholder.png';
    }
  } catch (error) {
    console.error('Error getting map tile:', error);
    // Return placeholder on error
    return Platform.OS === 'android'
      ? 'file:///android_asset/map_placeholder.png'
      : 'map_placeholder.png';
  }
};

// Pre-cache tiles for a region
export const preCacheTiles = async (
  region: Region,
  minZoom: number = 12,
  maxZoom: number = 16
): Promise<void> => {
  try {
    const isConnected = (await NetInfo.fetch()).isConnected;
    if (!isConnected) {
      return; // Don't try to pre-cache when offline
    }
    
    await ensureCacheDirectory();
    
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    const north = latitude + latitudeDelta / 2;
    const south = latitude - latitudeDelta / 2;
    const east = longitude + longitudeDelta / 2;
    const west = longitude - longitudeDelta / 2;
    
    // For each zoom level
    for (let z = minZoom; z <= maxZoom; z++) {
      // Convert lat/lng to tile coordinates
      const northTile = lat2tile(north, z);
      const southTile = lat2tile(south, z);
      const eastTile = long2tile(east, z);
      const westTile = long2tile(west, z);
      
      // Get all tiles in the region
      for (let x = westTile; x <= eastTile; x++) {
        for (let y = northTile; y <= southTile; y++) {
          // Don't await each download to parallelize
          getMapTile(z, x, y).catch(err => {
            console.warn(`Failed to pre-cache tile ${z}/${x}/${y}:`, err);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error pre-caching tiles:', error);
  }
};

// Convert latitude to tile Y coordinate
const lat2tile = (lat: number, zoom: number): number => {
  return Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
  );
};

// Convert longitude to tile X coordinate
const long2tile = (lon: number, zoom: number): number => {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
};

// Clear expired or unused tiles to free up space
export const clearOldTiles = async (maxAgeInDays: number = 30): Promise<void> => {
  try {
    await ensureCacheDirectory();
    
    const files = await FileSystem.readDirectoryAsync(TILE_CACHE_DIRECTORY);
    const now = new Date().getTime();
    
    for (const file of files) {
      const filePath = `${TILE_CACHE_DIRECTORY}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists && fileInfo.modificationTime) {
        const fileDate = new Date(fileInfo.modificationTime * 1000).getTime();
        const ageInDays = (now - fileDate) / (1000 * 60 * 60 * 24);
        
        if (ageInDays > maxAgeInDays) {
          await FileSystem.deleteAsync(filePath);
        }
      }
    }
  } catch (error) {
    console.error('Error clearing old tiles:', error);
  }
};
```

### 2. Enhanced Map Component with OpenStreetMap Integration

```typescript
// components/map/EnhancedMapView.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { PROVIDER_DEFAULT, UrlTile, Region, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useMapContext } from '../../context/MapContext';
import { usePatrolContext } from '../../context/PatrolContext';
import { useTheme } from '../../context/ThemeContext';
import { Patrol } from '../../types/patrol';
import PatrolMarker from './PatrolMarker';
import PatrolCluster from './PatrolCluster';
import { groupPatrolsByProximity } from '../../utils/mapHelpers';
import { preCacheTiles } from '../../services/map/openStreetMapService';
import Config from '../../constants/config';

interface EnhancedMapViewProps {
  onPatrolPress: (patrol: Patrol) => void;
  onLongPress?: (event: { coordinate: { latitude: number; longitude: number } }) => void;
  showUserLocation?: boolean;
  followUserLocation?: boolean;
  zoomLevel?: number;
  includePatrols?: boolean;
  children?: React.ReactNode;
}

export const EnhancedMapView: React.FC<EnhancedMapViewProps> = ({
  onPatrolPress,
  onLongPress,
  showUserLocation = true,
  followUserLocation = false,
  zoomLevel = 15,
  includePatrols = true,
  children,
}) => {
  const mapRef = useRef<MapView>(null);
  const { isDark } = useTheme();
  const { region, setRegion } = useMapContext();
  const { patrols } = usePatrolContext();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Get initial user location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.warn('Location permission denied');
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });
        
        // Only update region if we don't have one yet
        if (!region || (region.latitude === 0 && region.longitude === 0)) {
          const newRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.01 * (20 - zoomLevel),
            longitudeDelta: 0.01 * (20 - zoomLevel),
          };
          setRegion(newRegion);
          
          // Animate to the user's location
          mapRef.current?.animateToRegion(newRegion, 1000);
          
          // Pre-cache map tiles for this area
          preCacheTiles(newRegion).catch(console.error);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };
    
    getLocation();
  }, []);
  
  // Watch user location if following is enabled
  useEffect(() => {
    if (!followUserLocation) return;
    
    let locationSubscription: Location.LocationSubscription;
    
    const watchLocation = async () => {
      try {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Update every 10 meters
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            setUserLocation({ latitude, longitude });
            
            if (followUserLocation && mapRef.current) {
              const newRegion = {
                latitude,
                longitude,
                latitudeDelta: region?.latitudeDelta || 0.01,
                longitudeDelta: region?.longitudeDelta || 0.01,
              };
              mapRef.current.animateToRegion(newRegion, 500);
            }
          }
        );
      } catch (error) {
        console.error('Error watching location:', error);
      }
    };
    
    watchLocation();
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [followUserLocation]);
  
  // Group patrols into clusters based on zoom level
  const clusteredPatrols = useMemo(() => {
    if (!includePatrols || !patrols || patrols.length === 0) {
      return [];
    }
    
    // Determine clustering distance based on zoom level
    // Lower zoom = more clustering
    const distanceThreshold = region?.latitudeDelta 
      ? Math.max(0.2, region.latitudeDelta * 15)
      : 0.5;
    
    return groupPatrolsByProximity(patrols, distanceThreshold);
  }, [includePatrols, patrols, region?.latitudeDelta]);
  
  // Handle region change
  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    
    // Pre-cache tiles for the new region
    preCacheTiles(newRegion).catch(console.error);
  };
  
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={region || undefined}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={showUserLocation}
        followsUserLocation={followUserLocation}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        showsTraffic={false}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
        onLongPress={onLongPress ? (e) => onLongPress(e.nativeEvent) : undefined}
        maxZoomLevel={19}
        minZoomLevel={5}
      >
        {/* OpenStreetMap tiles */}
        <UrlTile
          urlTemplate={
            isDark
              ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
              : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />
        
        {/* Display clustered patrols */}
        {includePatrols && clusteredPatrols.map((cluster, index) => {
          if (cluster.patrols.length === 1) {
            // Single patrol, not clustered
            return (
              <PatrolMarker
                key={`patrol-${cluster.patrols[0].id}`}
                patrol={cluster.patrols[0]}
                onPress={onPatrolPress}
              />
            );
          } else {
            // Cluster of multiple patrols
            return (
              <PatrolCluster
                key={`cluster-${index}`}
                coordinate={{
                  latitude: cluster.latitude,
                  longitude: cluster.longitude,
                }}
                count={cluster.patrols.length}
                onPress={() => {
                  // If pressed directly, show all patrols in this cluster
                  // You could implement a modal or panel to show these
                  console.log(`Cluster with ${cluster.patrols.length} patrols pressed`);
                  
                  // If zoom level is not too high, zoom in to the cluster
                  if (region && region.latitudeDelta > 0.01) {
                    mapRef.current?.animateToRegion({
                      latitude: cluster.latitude,
                      longitude: cluster.longitude,
                      latitudeDelta: region.latitudeDelta / 2,
                      longitudeDelta: region.longitudeDelta / 2,
                    }, 500);
                  } else {
                    // Otherwise show a list of patrols in this cluster
                    // This would typically open a bottom sheet or modal
                    // For this example, just use the first patrol in the cluster
                    if (cluster.patrols.length > 0) {
                      onPatrolPress(cluster.patrols[0]);
                    }
                  }
                }}
              />
            );
          }
        })}
        
        {/* Additional children (e.g., route polylines, custom markers) */}
        {children}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
```

### 3. Navigation with OpenStreetMap Routing Service

```typescript
// services/map/osrmService.ts
import Config from '../../constants/config';
import { Route, RouteLeg, RouteStep, Location } from '../../types/navigation';

// OSRM is an open-source routing engine that works with OpenStreetMap data
const OSRM_API_URL = 'https://router.project-osrm.org/route/v1';

// Available routing profiles
export enum RoutingProfile {
  DRIVING = 'driving',
  WALKING = 'walking',
  CYCLING = 'cycling',
}

interface OsrmRouteOptions {
  alternatives?: boolean;
  steps?: boolean;
  geometries?: 'polyline' | 'polyline6' | 'geojson';
  overview?: 'simplified' | 'full' | 'false';
  annotations?: boolean;
}

export const calculateRoute = async (
  origin: Location,
  destination: Location,
  profile: RoutingProfile = RoutingProfile.DRIVING,
  options: OsrmRouteOptions = {
    steps: true,
    geometries: 'geojson',
    overview: 'full',
    annotations: true,
  }
): Promise<Route> => {
  try {
    // Build coordinates string: lon,lat;lon,lat
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      steps: options.steps?.toString() || 'true',
      geometries: options.geometries || 'geojson',
      overview: options.overview || 'full',
      annotations: options.annotations?.toString() || 'true',
    }).toString();
    
    // Make request to OSRM API
    const response = await fetch(
      `${OSRM_API_URL}/${profile}/${coordinates}?${queryParams}`
    );
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }
    
    // Transform OSRM response to our Route model
    const osrmRoute = data.routes[0];
    
    // Process route legs and steps
    const legs: RouteLeg[] = osrmRoute.legs.map((leg: any) => {
      const steps: RouteStep[] = leg.steps.map((step: any) => ({
        distance: step.distance,
        duration: step.duration,
        instruction: step.maneuver.instruction || getInstructionFromType(step.maneuver.type, step.maneuver.modifier),
        type: step.maneuver.type,
        name: step.name,
        coordinates: {
          latitude: step.maneuver.location[1],
          longitude: step.maneuver.location[0],
        },
      }));
      
      return {
        distance: leg.distance,
        duration: leg.duration,
        steps,
      };
    });
    
    // Create our Route object
    const route: Route = {
      distance: osrmRoute.distance,
      duration: osrmRoute.duration,
      geometry: osrmRoute.geometry,
      legs,
    };
    
    return route;
  } catch (error) {
    console.error('Error calculating route:', error);
    throw error;
  }
};

// Get human-readable instruction from maneuver type and modifier
const getInstructionFromType = (type: string, modifier?: string): string => {
  switch (type) {
    case 'turn':
      return `Turn ${modifier || 'ahead'}`;
    case 'new name':
      return 'Continue straight';
    case 'depart':
      return 'Start driving';
    case 'arrive':
      return 'Arrive at destination';
    case 'merge':
      return `Merge ${modifier || 'ahead'}`;
    case 'on ramp':
      return `Take the ramp ${modifier || 'ahead'}`;
    case 'off ramp':
      return `Exit ${modifier || 'ahead'}`;
    case 'fork':
      return `Keep ${modifier || 'straight'} at the fork`;
    case 'end of road':
      return `Turn ${modifier || 'ahead'} at the end of the road`;
    case 'use lane':
      return `Use the ${modifier || 'lane'}`;
    case 'continue':
      return `Continue ${modifier || 'straight'}`;
    case 'roundabout':
      return 'Enter the roundabout';
    case 'rotary':
      return 'Enter the rotary';
    case 'roundabout turn':
      return `Take the ${modifier || 'exit'} at the roundabout`;
    case 'exit roundabout':
      return 'Exit the roundabout';
    case 'exit rotary':
      return 'Exit the rotary';
    default:
      return 'Continue to the next point';
  }
};

// Calculate a route that avoids patrol areas
export const calculatePatrolAwareRoute = async (
  origin: Location,
  destination: Location,
  patrols: Location[],
  profile: RoutingProfile = RoutingProfile.DRIVING
): Promise<Route> => {
  try {
    // First, get a standard route
    const standardRoute = await calculateRoute(origin, destination, profile);
    
    // If there are no patrols to avoid, return the standard route
    if (!patrols || patrols.length === 0) {
      return standardRoute;
    }
    
    // TODO: For a real implementation, you would need to:
    // 1. Convert patrol points to areas to avoid
    // 2. Make an API call to a routing service that supports "avoid areas"
    // 3. Process the response to ensure it actually avoids the patrol areas
    
    // For this example, we'll just return the standard route with a note
    console.log('Patrol-aware routing requested, but using standard route for now');
    return standardRoute;
    
    // In a real implementation, you might use a service like GraphHopper or
    // your own OSRM instance with custom constraints
  } catch (error) {
    console.error('Error calculating patrol-aware route:', error);
    throw error;
  }
};
```

## Performance Optimization Strategies

### 1. Map Rendering Optimization

```typescript
// hooks/useMapOptimization.ts
import { useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Region } from 'react-native-maps';
import { useTheme } from '../context/ThemeContext';
import { Patrol } from '../types/patrol';

export const useMapOptimization = (patrols: Patrol[]) => {
  const patrolsRef = useRef<Patrol[]>(patrols);
  const regionRef = useRef<Region | null>(null);
  const renderCountRef = useRef(0);
  const { isDark } = useTheme();
  
  // Determine if we need to render all patrols or a subset based on performance metrics
  const getOptimizedPatrols = useCallback((region: Region | null): Patrol[] => {
    renderCountRef.current += 1;
    
    // Store the latest reference values
    patrolsRef.current = patrols;
    regionRef.current = region;
    
    // If no region or no patrols, return empty array
    if (!region || patrols.length === 0) {
      return [];
    }
    
    // On lower-end devices or with many patrols, optimize by filtering
    const shouldOptimize = Platform.OS === 'android' || patrols.length > 100;
    
    if (shouldOptimize) {
      // Only show patrols within the visible region with some padding
      const padding = 0.5; // 50% padding around visible region
      
      const north = region.latitude + (region.latitudeDelta * (1 + padding) / 2);
      const south = region.latitude - (region.latitudeDelta * (1 + padding) / 2);
      const east = region.longitude + (region.longitudeDelta * (1 + padding) / 2);
      const west = region.longitude - (region.longitudeDelta * (1 + padding) / 2);
      
      return patrols.filter(patrol => 
        patrol.latitude <= north &&
        patrol.latitude >= south &&
        patrol.longitude <= east &&
        patrol.longitude >= west
      );
    }
    
    // On higher-end devices with fewer patrols, show all
    return patrols;
  }, [patrols]);
  
  // Get optimized tile provider based on theme and performance
  const getTileProvider = useCallback(() => {
    // Different tile providers for dark/light mode
    const osmUrl = isDark
      ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      
    // If we're getting low performance, use a lower detail tile source
    const isLowPerformance = Platform.OS === 'android' && Platform.Version < 28;
    
    if (isLowPerformance) {
      // Use a lower detail tile source for older devices
      return {
        urlTemplate: osmUrl,
        maximumZ: 17, // Lower max zoom
        tileCacheMaxAge: 1000 * 60 * 60 * 24 * 7, // Cache for 7 days
        zIndex: -1,
      };
    }
    
    return {
      urlTemplate: osmUrl,
      maximumZ: 19,
      tileCacheMaxAge: 1000 * 60 * 60 * 24, // Cache for 1 day
      zIndex: -1,
    };
  }, [isDark]);
  
  return {
    getOptimizedPatrols,
    getTileProvider,
    renderCount: renderCountRef.current,
  };
};
```

### 2. Memory and Battery Optimization

```typescript
// services/optimization/resourceManager.ts
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Battery from 'expo-battery';
import { clearOldTiles } from '../map/openStreetMapService';

// Resource usage state
let isBackgroundMode = false;
let lastBatteryLevel = 100;
let isLowPowerMode = false;
let locationUpdateInterval = 5000; // Default: 5 seconds

// Update resource state based on battery and app state
export const updateResourceState = async (): Promise<void> => {
  try {
    // Get current battery level
    const batteryLevel = await Battery.getBatteryLevelAsync();
    lastBatteryLevel = batteryLevel * 100;
    
    // Check if device is in power saving mode
    isLowPowerMode = await Battery.isLowPowerModeEnabledAsync();
    
    // Adjust location update interval based on battery and power mode
    if (isLowPowerMode || lastBatteryLevel < 20) {
      // Conserve battery when low or in power saving mode
      locationUpdateInterval = 15000; // 15 seconds
    } else if (lastBatteryLevel < 50) {
      // Medium battery conservation
      locationUpdateInterval = 10000; // 10 seconds
    } else {
      // Normal operation
      locationUpdateInterval = 5000; // 5 seconds
    }
    
    // Clear map tile cache if storage is getting low
    if (Platform.OS === 'android') {
      try {
        const devices = require('react-native-device-info');
        const freeDiskStorage = await devices.getFreeDiskStorage();
        
        // If less than 500MB free, clear old tile cache
        if (freeDiskStorage < 500 * 1024 * 1024) {
          await clearOldTiles(7); // Clear tiles older than 7 days
        }
      } catch (err) {
        console.log('Unable to check disk storage:', err);
      }
    }
  } catch (error) {
    console.error('Error updating resource state:', error);
  }
};

// Handle app state changes
export const initializeResourceManager = (): void => {
  AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      isBackgroundMode = false;
      // Restore normal operation when app comes to foreground
      updateResourceState();
    } else if (nextAppState === 'background') {
      isBackgroundMode = true;
      // Additional resource cleanup when app goes to background
      if (Platform.OS === 'ios') {
        // iOS-specific cleanup
      }
    }
  });
  
  // Set up battery level monitoring
  Battery.addBatteryLevelListener(({ batteryLevel }) => {
    const newLevel = batteryLevel * 100;
    // Only update if battery level changed significantly
    if (Math.abs(newLevel - lastBatteryLevel) >= 5) {
      lastBatteryLevel = newLevel;
      updateResourceState();
    }
  });
  
  // Set up low power mode monitoring
  Battery.addLowPowerModeListener(({ lowPowerMode }) => {
    if (isLowPowerMode !== lowPowerMode) {
      isLowPowerMode = lowPowerMode;
      updateResourceState();
    }
  });
  
  // Initial state update
  updateResourceState();
};

// Get the current recommended location update interval
export const getLocationUpdateInterval = (): number => {
  return isBackgroundMode ? Math.max(60000, locationUpdateInterval * 3) : locationUpdateInterval;
};

// Get resource-aware settings for map rendering
export const getMapRenderSettings = () => {
  return {
    // Reduce animation duration when battery is low
    animationDuration: isLowPowerMode || lastBatteryLevel < 30 ? 100 : 300,
    
    // Reduce maximum zoom level when battery is low
    maxZoomLevel: isLowPowerMode || lastBatteryLevel < 20 ? 17 : 19,
    
    // Disable certain features in low power mode
    enablePatrolClustering: true,
    enableMapRotation: !isLowPowerMode,
    enablePerspective: !isLowPowerMode && lastBatteryLevel > 50,
    
    // Reduce tile quality in low power mode
    tileDetail: isLowPowerMode ? 'low' : lastBatteryLevel < 30 ? 'medium' : 'high',
  };
};
```

## Data Flow Architecture

The application follows a unidirectional data flow pattern similar to Redux/Flux architecture, but using React Context API for simplicity:

```
┌─────────────────┐     ┌────────────────┐     ┌────────────────┐
│     Actions     │────▶│    Services    │────▶│     State      │
│ (User Events)   │     │ (Business Logic)│     │ (Context API)  │
└─────────────────┘     └────────────────┘     └────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐                         ┌────────────────┐
│     Hooks       │◀────────────────────────│  Components    │
│  (Logic Units)  │                         │     (UI)       │
└─────────────────┘                         └────────────────┘
```

### 1. State Management Flow Example

```typescript
// Example data flow for patrol reporting feature

// 1. User Action: User submits a patrol report
// app/report/index.tsx
const handleSubmit = async () => {
  if (!selectedType) {
    Alert.alert('Error', 'Please select patrol type');
    return;
  }
  
  setIsSubmitting(true);
  try {
    // Call the hook, which calls the service
    await submitPatrolReport(selectedType, comment);
    Alert.alert('Success', 'Patrol reported successfully');
    router.back();
  } catch (error) {
    Alert.alert('Error', 'Failed to report patrol. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

// 2. Hook: Business logic and service coordination
// hooks/usePatrols.ts
export const usePatrols = () => {
  const { addPatrol } = usePatrolContext(); // Get state mutation function
  const { currentLocation } = useLocation(); // Get current location
  const { isOnline } = useNetworkStatus(); // Check if device is online
  
  const submitPatrolReport = async (patrolType: PatrolType, comment?: string) => {
    try {
      if (!currentLocation) {
        throw new Error('Location unavailable');
      }
      
      const reportData: PatrolReport = {
        type: patrolType,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        comment
      };
      
      let newPatrol: Patrol;
      
      if (isOnline) {
        // If online, submit directly
        newPatrol = await patrolService.reportPatrol(reportData);
      } else {
        // If offline, queue for later and create temporary patrol
        await offlineStorageService.queuePatrolReport(reportData);
        newPatrol = {
          id: `temp-${Date.now()}`,
          type: patrolType,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          timestamp: Date.now(),
          comment,
          confirmedCount: 1,
          deniedCount: 0,
          isTemporary: true
        };
      }
      
      // Update state
      addPatrol(newPatrol);
      
      // Provide user feedback
      hapticFeedback.success();
      voiceService.confirmPatrolReport(patrolType);
      
      return newPatrol;
    } catch (error) {
      console.error('Failed to report patrol:', error);
      hapticFeedback.error();
      throw error;
    }
  };
  
  return {
    submitPatrolReport,
    // Other patrol-related functions...
  };
};

// 3. Service: Direct API communication
// services/patrol/patrolService.ts
export const reportPatrol = async (report: PatrolReport): Promise<Patrol> => {
  try {
    const response = await apiClient.post('/patrols', report);
    return response.data;
  } catch (error) {
    console.error('API error reporting patrol:', error);
    throw error;
  }
};

// 4. Context: State management
// context/PatrolContext.tsx (excerpt)
export const PatrolContextProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [state, dispatch] = useReducer(patrolReducer, initialState);
  
  // State update function passed to hooks
  const addPatrol = (patrol: Patrol) => {
    dispatch({ type: 'ADD_PATROL', payload: patrol });
  };
  
  // Other context functions...
  
  return (
    <PatrolContext.Provider value={{ 
      patrols: state.patrols,
      loading: state.loading,
      error: state.error,
      addPatrol,
      // Other values and functions...
    }}>
      {children}
    </PatrolContext.Provider>
  );
};
```

## Real-Time WebSocket Integration for Map Updates

The app requires real-time patrol updates to ensure users always have the latest information. Implement WebSocket communication specifically for map/patrol updates:

```typescript
// services/websocket/patrolWebSocketService.ts
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Config from '../../constants/config';
import { Patrol } from '../../types/patrol';
import { usePatrolContext } from '../../context/PatrolContext';
import { useAuthContext } from '../../context/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

// Hook for managing WebSocket connection for real-time patrol updates
export const usePatrolWebSocket = () => {
  const { addPatrol, updatePatrol, removePatrol, setPatrols } = usePatrolContext();
  const { user } = useAuthContext();
  const { isConnected } = useNetworkStatus();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  
  // Connect to WebSocket server
  const connect = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }
    
    try {
      setIsConnecting(true);
      setError(null);
      
      // Get auth token for secure connection
      const token = user?.token || '';
      
      // Create WebSocket connection
      wsRef.current = new WebSocket(`${Config.WS_BASE_URL}/patrols?token=${token}`);
      
      // Connection opened
      wsRef.current.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setIsConnecting(false);
        
        // Send initial subscription message to specify region of interest
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          sendMessage({
            type: 'subscribe',
            data: {
              // Default to a wide area, will be updated with actual location
              bounds: {
                north: 90,
                south: -90,
                east: 180,
                west: -180,
              },
            },
          });
        }
      };
      
      // Listen for messages
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      // Connection closed
      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Auto-reconnect if not closed intentionally
        if (event.code !== 1000) {
          setTimeout(() => {
            if (isConnected && !wsRef.current) {
              connect();
            }
          }, 5000); // Reconnect after 5 seconds
        }
      };
      
      // Connection error
      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Failed to connect to patrol update server');
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setError('Failed to connect to patrol update server');
      setIsConnected(false);
      setIsConnecting(false);
    }
  };
  
  // Disconnect from WebSocket server
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
      setIsConnected(false);
    }
  };
  
  // Send message to WebSocket server
  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, unable to send message');
    }
  };
  
  // Update subscription region based on map viewport
  const updateSubscriptionRegion = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    sendMessage({
      type: 'subscribe',
      data: {
        bounds,
      },
    });
  };
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'patrol_added':
        // New patrol reported
        addPatrol(message.data);
        break;
        
      case 'patrol_updated':
        // Existing patrol updated
        updatePatrol(message.data);
        break;
        
      case 'patrol_removed':
        // Patrol removed (expired or deleted)
        removePatrol(message.data.id);
        break;
        
      case 'patrol_batch':
        // Initial batch of patrols or region update
        setPatrols(message.data.patrols);
        break;
        
      case 'ping':
        // Server ping to keep connection alive
        sendMessage({ type: 'pong' });
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  };
  
  // Auto-connect when network is available
  useEffect(() => {
    if (isConnected && !wsRef.current) {
      connect();
    }
  }, [isConnected]);
  
  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Reconnect when app comes to foreground
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connect();
        }
      } else if (nextAppState === 'background') {
        // Optionally disconnect when app goes to background to save battery
        // This depends on whether you want background updates
        // For a patrol app, you might want to keep it connected
        // disconnect();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      disconnect();
    };
  }, []);
  
  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    updateSubscriptionRegion,
  };
};
```

### Integration with Map Component

Update the map component to use the WebSocket service for real-time patrol updates:

```typescript
// components/map/EnhancedMapView.tsx (excerpt with WebSocket integration)
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { usePatrolWebSocket } from '../../services/websocket/patrolWebSocketService';
import { usePatrolContext } from '../../context/PatrolContext';

export const EnhancedMapView = ({ /* existing props */ }) => {
  const { region, setRegion } = useMapContext();
  const { patrols } = usePatrolContext();
  const { updateSubscriptionRegion, isConnected } = usePatrolWebSocket();
  
  // Update subscription region when map region changes
  useEffect(() => {
    if (region && isConnected) {
      // Calculate bounds from region
      const bounds = {
        north: region.latitude + region.latitudeDelta / 2,
        south: region.latitude - region.latitudeDelta / 2,
        east: region.longitude + region.longitudeDelta / 2,
        west: region.longitude - region.longitudeDelta / 2,
      };
      
      // Add some padding to ensure we get patrols just outside the visible area
      const paddedBounds = {
        north: bounds.north + region.latitudeDelta * 0.2,
        south: bounds.south - region.latitudeDelta * 0.2,
        east: bounds.east + region.longitudeDelta * 0.2,
        west: bounds.west - region.longitudeDelta * 0.2,
      };
      
      // Update WebSocket subscription with new region
      updateSubscriptionRegion(paddedBounds);
    }
  }, [region, isConnected]);
  
  // ... rest of component implementation
};
```

### WebSocket Configuration in Different Environments

```typescript
// constants/config.ts (excerpt with WebSocket configuration)
interface Config {
  // Existing config properties
  WS_BASE_URL: string;
  WS_RECONNECT_INTERVAL: number;
  WS_PING_INTERVAL: number;
}

// Environment-specific configurations
const envConfigs = {
  development: {
    // Existing development config
    WS_BASE_URL: 'ws://dev-ws.patrolapp.example.com',
    WS_RECONNECT_INTERVAL: 5000, // 5 seconds
    WS_PING_INTERVAL: 30000, // 30 seconds
  },
  staging: {
    // Existing staging config
    WS_BASE_URL: 'wss://staging-ws.patrolapp.example.com',
    WS_RECONNECT_INTERVAL: 5000,
    WS_PING_INTERVAL: 30000,
  },
  production: {
    // Existing production config
    WS_BASE_URL: 'wss://ws.patrolapp.example.com',
    WS_RECONNECT_INTERVAL: 10000, // 10 seconds (less frequent in production)
    WS_PING_INTERVAL: 45000, // 45 seconds
  },
};
```

### WebSocket Fallback Mechanism

Implement a fallback mechanism to handle cases where WebSocket connections are not available:

```typescript
// services/patrol/patrolSyncService.ts
import { usePatrolWebSocket } from '../websocket/patrolWebSocketService';
import { usePatrolContext } from '../../context/PatrolContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import apiClient from '../api/client';

export const usePatrolSync = () => {
  const { isConnected: isWebSocketConnected } = usePatrolWebSocket();
  const { isOnline } = useNetworkStatus();
  const { setPatrols } = usePatrolContext();
  
  // Fetch patrols using REST API as fallback when WebSocket is not available
  const fetchPatrolsFallback = async (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    // Only use fallback if WebSocket is not connected but we have internet
    if (!isWebSocketConnected && isOnline) {
      try {
        const response = await apiClient.get('/patrols', {
          params: {
            north: bounds.north,
            south: bounds.south,
            east: bounds.east,
            west: bounds.west,
          },
        });
        
        if (response.data && Array.isArray(response.data.patrols)) {
          setPatrols(response.data.patrols);
        }
      } catch (error) {
        console.error('Error fetching patrols via REST fallback:', error);
      }
    }
  };
  
  return {
    fetchPatrolsFallback,
    isUsingWebSocket: isWebSocketConnected,
  };
};
```
```

## Deployment Guidelines

### 1. Environment Setup

```typescript
// constants/config.ts
import { Platform } from 'react-native';
import { version } from '../../package.json';

interface Config {
  APP_VERSION: string;
  BUILD_NUMBER: string;
  ENV: 'development' | 'staging' | 'production';
  API_BASE_URL: string;
  OSM_TILE_URL: string;
  OSRM_API_URL: string;
  PATROL_SYNC_INTERVAL: number;
  DEBUG_MODE: boolean;
  ANALYTICS_ENABLED: boolean;
  SENTRY_DSN?: string;
}

// Default configuration
const defaultConfig: Config = {
  APP_VERSION: version,
  BUILD_NUMBER: '1',
  ENV: 'development',
  API_BASE_URL: 'https://dev-api.patrolapp.example.com/v1',
  OSM_TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  OSRM_API_URL: 'https://router.project-osrm.org/route/v1',
  PATROL_SYNC_INTERVAL: 30000, // 30 seconds
  DEBUG_MODE: __DEV__,
  ANALYTICS_ENABLED: false,
};

// Environment-specific configurations
const envConfigs = {
  development: {
    ...defaultConfig,
  },
  staging: {
    ...defaultConfig,
    API_BASE_URL: 'https://staging-api.patrolapp.example.com/v1',
    DEBUG_MODE: true,
    ANALYTICS_ENABLED: true,
    SENTRY_DSN: 'https://your-staging-sentry-dsn',
  },
  production: {
    ...defaultConfig,
    API_BASE_URL: 'https://api.patrolapp.example.com/v1',
    DEBUG_MODE: false,
    ANALYTICS_ENABLED: true,
    SENTRY_DSN: 'https://your-production-sentry-dsn',
    // Use premium tile provider for production
    OSM_TILE_URL: 'https://maps.patrolapp.example.com/tiles/{z}/{x}/{y}.png',
  },
};

// Determine environment from env variables or use development as default
const currentEnv = process.env.APP_ENV || 'development';

// Get config for current environment
const config: Config = {
  ...defaultConfig,
  ...envConfigs[currentEnv as keyof typeof envConfigs],
};

export default config;
```

### 2. Build Configuration

```typescript
// app.config.js (Expo config)
const IS_DEV = process.env.APP_ENV === 'development';
const IS_STAGING = process.env.APP_ENV === 'staging';
const IS_PROD = process.env.APP_ENV === 'production';

// Define different app IDs for each environment
const APP_ID_SUFFIX = IS_DEV ? '.dev' : IS_STAGING ? '.staging' : '';
const APP_ID = `com.example.patrolapp${APP_ID_SUFFIX}`;

export default {
  name: IS_PROD ? "Police Patrol App" : `Police Patrol App ${IS_DEV ? '(Dev)' : '(Staging)'}`,
  slug: "patrol-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: APP_ID,
    infoPlist: {
      UIBackgroundModes: [
        "location",
        "fetch"
      ],
      NSLocationWhenInUseUsageDescription: "We need your location to show you nearby police patrols and provide navigation.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "We need your location to show you nearby police patrols and provide navigation even when the app is in the background."
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: APP_ID,
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE"
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID
      }
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  plugins: [
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "We need your location to show you nearby police patrols and provide navigation even when the app is in the background."
      }
    ],
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          deploymentTarget: "13.0"
        },
        android: {
          compileSdkVersion: 33,
          targetSdkVersion: 33,
          minSdkVersion: 21
        }
      }
    ],
    "expo-router"
  ],
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID
    },
    APP_ENV: process.env.APP_ENV || "development"
  },
  runtimeVersion: {
    policy: "sdkVersion"
  },
  updates: {
    url: process.env.EAS_UPDATE_URL,
    enabled: IS_STAGING || IS_PROD,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 30000
  },
  owner: "your-expo-organization"
};
```

### 3. EAS Build Configuration

```javascript
// eas.json
{
  "cli": {
    "version": ">= 3.15.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "APP_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "staging",
      "env": {
        "APP_ENV": "staging"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "path/to/service-account.json",
        "track": "production"
      }
    }
  }
}
```

## Best Practices for Code Quality

### 1. TypeScript Strict Configuration

```json
// tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js"
  ]
}
```

### 2. ESLint and Prettier Configuration

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    'universe/native',
    'universe/shared/typescript-analysis',
    'plugin:react-hooks/recommended',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.d.ts'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  ],
  rules: {
    // Custom rules for this project
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
  },
};

// .prettierrc.js
module.exports = {
  bracketSpacing: true,
  bracketSameLine: false,
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  semi: true,
  printWidth: 100,
  endOfLine: 'auto',
};
```

### 3. Code Quality Hooks

```bash
# Add pre-commit hooks with Husky and lint-staged
npm install --save-dev husky lint-staged

# Configure hooks
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
// package.json (lint-staged config)
{
  "lint-staged": {
    "*.{js,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

## Performance Benchmarks and Optimization Targets

To ensure the app meets the requirements for smooth performance while driving, the following performance benchmarks should be targeted:

### 1. Startup Performance

```
- Cold start time: < 2.5 seconds on mid-range devices
- Time to interactive map: < 3.5 seconds
- Initial data load: < 1 second for local data
```

### 2. Map Rendering Performance

```
- Map scroll/pan: 60 FPS (16.7ms per frame)
- Zoom operations: < 100ms response time
- Marker rendering (100+ markers): < 500ms
- Route calculation: < 2 seconds
- Route rendering: < 500ms
```

### 3. Memory Usage

```
- Baseline memory usage: < 100MB
- Peak memory usage during navigation: < 250MB
- Memory leaks: None after 1 hour of continuous use
```

### 4. Battery Consumption

```
- Background location tracking: < 3% battery per hour
- Foreground with active navigation: < 10% battery per hour
- Screen on time with map displayed: Comparable to Google Maps (+/- 20%)
```

### 5. Network Usage

```
- Initial app load: < 5MB
- Map tiles: < 20MB per hour of active use
- Patrol data sync: < 50KB per minute
```

### 6. Storage

```
- App installation size: < 50MB
- Cache size after regular use: < 200MB
- Map tile cache: Configurable with default max of 500MB
```

## Security Considerations

### 1. Data Protection

```typescript
// services/security/encryptionService.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// Encrypt sensitive user data before storing
export const encryptAndStore = async (key: string, data: string): Promise<void> => {
  try {
    // Generate a random salt
    const salt = await Crypto.getRandomBytesAsync(16);
    const saltHex = Buffer.from(salt).toString('hex');
    
    // Derive a key using PBKDF2
    const keyMaterial = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${saltHex}:${data}`
    );
    
    // Store the encrypted data with salt
    await SecureStore.setItemAsync(key, `${saltHex}:${keyMaterial}`);
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw new Error('Failed to securely store data');
  }
};

// Retrieve and decrypt user data
export const retrieveAndDecrypt = async (key: string): Promise<string | null> => {
  try {
    const storedValue = await SecureStore.getItemAsync(key);
    
    if (!storedValue) {
      return null;
    }
    
    // The real decryption would be more complex in a production app
    // This is a simplified example
    const [saltHex, encryptedData] = storedValue.split(':');
    
    // In a real app, you would decrypt the data here
    // For this example, we're just verifying the data integrity
    
    return storedValue;
  } catch (error) {
    console.error('Error decrypting data:', error);
    return null;
  }
};

// Clear sensitive data
export const clearSecureData = async (keys: string[]): Promise<void> => {
  try {
    await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)));
  } catch (error) {
    console.error('Error clearing secure data:', error);
  }
};
```

### 2. API Security Configuration

```typescript
// api/securityInterceptor.ts
import axios, { AxiosRequestConfig } from 'axios';
import * as Crypto from 'expo-crypto';
import DeviceInfo from 'react-native-device-info';
import Config from '../constants/config';

// Add security headers to API requests
export const addSecurityHeaders = async (config: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
  // Get device information
  const deviceId = await DeviceInfo.getUniqueId();
  const appVersion = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();
  
  // Generate timestamp
  const timestamp = Date.now().toString();
  
  // Generate request signature
  // In a real app, this would be a more sophisticated algorithm
  const signatureInput = `${deviceId}:${timestamp}:${Config.API_SECRET_KEY}`;
  const signature = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    signatureInput
  );
  
  // Add headers
  if (!config.headers) {
    config.headers = {};
  }
  
  config.headers['X-App-Version'] = appVersion;
  config.headers['X-Build-Number'] = buildNumber;
  config.headers['X-Device-ID'] = deviceId;
  config.headers['X-Timestamp'] = timestamp;
  config.headers['X-Signature'] = signature;
  
  return config;
};

// Validate response security
export const validateResponseSecurity = (response: any): boolean => {
  // In a real app, you would validate response integrity
  // For example, checking a server-provided signature
  
  return true;
};
```

### 3. Certificate Pinning

```typescript
// api/certificatePinning.ts
import { Platform } from 'react-native';
import Config from '../constants/config';

// Configure certificate pinning based on environment
export const configureCertificatePinning = () => {
  if (Platform.OS === 'ios') {
    // iOS implementation using TrustKit
    if (global.TrustKit) {
      global.TrustKit.initializeWithConfiguration({
        TSKSwizzleNetworkDelegates: true,
        TSKPinnedDomains: {
          [new URL(Config.API_BASE_URL).hostname]: {
            TSKPublicKeyHashes: [
              // Add your certificate public key hashes here
              Config.SSL_PIN_KEY_1,
              Config.SSL_PIN_KEY_2, // Backup key
            ],
            TSKIncludeSubdomains: true,
          },
        },
      });
    }
  } else if (Platform.OS === 'android') {
    // Android implementation
    // In a real app, you would configure OkHttp with CertificatePinner
    console.log('Android certificate pinning should be configured in native code');
  }
};
```

## Final Implementation Recommendations

### 1. Development Approach

1. **Phased Implementation:**
   - Phase 1: Core map functionality with OpenStreetMap integration
   - Phase 2: Patrol reporting and visualization system
   - Phase 3: Navigation features
   - Phase 4: Social features and user accounts
   - Phase 5: Optimization and fine-tuning

2. **Prioritize User Experience:**
   - Focus on the primary use case: reporting and viewing patrols while driving
   - Ensure all touch targets are large and easily accessible
   - Minimize required interactions for core functions
   - Implement voice commands early in development

3. **Performance Testing:**
   - Test on a range of devices, especially lower-end Android phones
   - Create automated performance tests that measure render times and memory usage
   - Establish performance budgets for each screen and feature

### 2. Code Organization Best Practices

1. **Component Structure:**
   - Keep components small and focused on a single responsibility
   - Use composition over inheritance
   - Create a clear separation between presentational and container components

   ```typescript
   // Example of component structure
   // components/patrol/PatrolList.tsx (Presentational component)
   import React from 'react';
   import { FlatList, StyleSheet, View, Text } from 'react-native';
   import { Patrol } from '../../types/patrol';
   import { PatrolListItem } from './PatrolListItem';
   
   interface PatrolListProps {
     patrols: Patrol[];
     onPatrolPress: (patrol: Patrol) => void;
   }
   
   export const PatrolList: React.FC<PatrolListProps> = ({
     patrols,
     onPatrolPress,
   }) => {
     if (patrols.length === 0) {
       return (
         <View style={styles.emptyContainer}>
           <Text style={styles.emptyText}>No patrols found in this area</Text>
         </View>
       );
     }
     
     return (
       <FlatList
         data={patrols}
         keyExtractor={(item) => item.id}
         renderItem={({ item }) => (
           <PatrolListItem
             patrol={item}
             onPress={() => onPatrolPress(item)}
           />
         )}
         style={styles.list}
       />
     );
   };
   
   const styles = StyleSheet.create({
     list: {
       flex: 1,
     },
     emptyContainer: {
       flex: 1,
       justifyContent: 'center',
       alignItems: 'center',
       padding: 20,
     },
     emptyText: {
       fontSize: 16,
       color: '#666',
       textAlign: 'center',
     },
   });
   
   // screens/PatrolListScreen.tsx (Container component)
   import React, { useEffect } from 'react';
   import { View, StyleSheet } from 'react-native';
   import { useRouter } from 'expo-router';
   import { usePatrols } from '../../hooks/usePatrols';
   import { useGeolocation } from '../../hooks/useGeolocation';
   import { PatrolList } from '../../components/patrol/PatrolList';
   import { LoadingSpinner } from '../../components/common/LoadingSpinner';
   import { ErrorView } from '../../components/common/ErrorView';
   
   export default function PatrolListScreen() {
     const router = useRouter();
     const { patrols, loading, error, fetchPatrols } = usePatrols();
     const { currentLocation } = useGeolocation();
     
     useEffect(() => {
       if (currentLocation) {
         fetchPatrols();
       }
     }, [currentLocation]);
     
     const handlePatrolPress = (patrol) => {
       router.push({
         pathname: '/patrol/[id]',
         params: { id: patrol.id }
       });
     };
     
     if (loading) {
       return <LoadingSpinner />;
     }
     
     if (error) {
       return <ErrorView message={error} onRetry={fetchPatrols} />;
     }
     
     return (
       <View style={styles.container}>
         <PatrolList
           patrols={patrols}
           onPatrolPress={handlePatrolPress}
         />
       </View>
     );
   }
   
   const styles = StyleSheet.create({
     container: {
       flex: 1,
     },
   });
   ```

2. **Custom Hooks:**
   - Extract complex logic into custom hooks
   - Keep hooks focused on a single responsibility
   - Make hooks reusable across components

   ```typescript
   // Example of a focused custom hook
   // hooks/usePatrolFilter.ts
   import { useState, useMemo } from 'react';
   import { Patrol, PatrolType } from '../types/patrol';
   
   interface FilterOptions {
     showSpeedRadar: boolean;
     showAlcotest: boolean;
     showGeneral: boolean;
     maxAge: number; // in milliseconds
   }
   
   export const usePatrolFilter = (patrols: Patrol[]) => {
     const [filters, setFilters] = useState<FilterOptions>({
       showSpeedRadar: true,
       showAlcotest: true,
       showGeneral: true,
       maxAge: 4 * 60 * 60 * 1000, // 4 hours by default
     });
     
     // Apply filters to patrols
     const filteredPatrols = useMemo(() => {
       const now = Date.now();
       
       return patrols.filter(patrol => {
         // Filter by type
         if (patrol.type === PatrolType.SPEED_RADAR && !filters.showSpeedRadar) {
           return false;
         }
         
         if (patrol.type === PatrolType.ALCOTEST && !filters.showAlcotest) {
           return false;
         }
         
         if (patrol.type === PatrolType.GENERAL && !filters.showGeneral) {
           return false;
         }
         
         // Filter by age
         if (now - patrol.timestamp > filters.maxAge) {
           return false;
         }
         
         return true;
       });
     }, [patrols, filters]);
     
     // Update a single filter
     const updateFilter = (key: keyof FilterOptions, value: boolean | number) => {
       setFilters(prev => ({
         ...prev,
         [key]: value,
       }));
     };
     
     // Reset filters to default
     const resetFilters = () => {
       setFilters({
         showSpeedRadar: true,
         showAlcotest: true,
         showGeneral: true,
         maxAge: 4 * 60 * 60 * 1000,
       });
     };
     
     return {
       filters,
       filteredPatrols,
       updateFilter,
       resetFilters,
     };
   };
   ```

3. **File Structure:**
   - Group related files by feature rather than by type
   - Keep index files to simplify imports
   - Use barrel files to export multiple components from a directory

   ```typescript
   // Example of feature-based organization
   src/
   ├── features/
   │   ├── patrol/
   │   │   ├── components/
   │   │   │   ├── PatrolMarker.tsx
   │   │   │   ├── PatrolList.tsx
   │   │   │   ├── PatrolListItem.tsx
   │   │   │   ├── PatrolDetailView.tsx
   │   │   │   └── index.ts  // Barrel file for exporting components
   │   │   ├── hooks/
   │   │   │   ├── usePatrols.ts
   │   │   │   ├── usePatrolReporting.ts
   │   │   │   └── index.ts
   │   │   ├── services/
   │   │   │   ├── patrolService.ts
   │   │   │   ├── realtimePatrolService.ts
   │   │   │   └── index.ts
   │   │   └── types/
   │   │       ├── patrol.ts
   │   │       └── index.ts
   │   ├── navigation/
   │   │   ├── components/
   │   │   ├── hooks/
   │   │   ├── services/
   │   │   └── types/
   │   └── user/
   │       ├── components/
   │       ├── hooks/
   │       ├── services/
   │       └── types/
   ├── shared/  // Shared utilities and components
   │   ├── components/
   │   │   ├── Button.tsx
   │   │   ├── LoadingSpinner.tsx
   │   │   └── index.ts
   │   ├── hooks/
   │   │   ├── useGeolocation.ts
   │   │   ├── useNetworkStatus.ts
   │   │   └── index.ts
   │   ├── utils/
   │   │   ├── formatters.ts
   │   │   ├── validation.ts
   │   │   └── index.ts
   │   └── types/
   │       ├── location.ts
   │       └── index.ts
   ├── app/     // Expo Router screens
   │   ├── _layout.tsx
   │   ├── index.tsx
   │   ├── patrol/
   │   │   ├── _layout.tsx
   │   │   ├── index.tsx
   │   │   └── [id].tsx
   │   └── // other routes
   └── // other files
   ```

### 3. Performance Optimizations

1. **Map Optimizations:**
   - Implement tile caching for OpenStreetMap tiles
   - Use marker clustering for densely populated areas
   - Implement virtualization for large lists of patrols
   - Use React.memo for map components to prevent unnecessary re-renders

2. **Rendering Optimizations:**
   - Use useCallback and useMemo for expensive computations
   - Implement lazy loading for screens not immediately needed
   - Use React.PureComponent or React.memo for component memoization
   - Optimize images and assets for mobile

3. **Location and Battery Optimizations:**
   - Adjust location accuracy based on user activity and battery level
   - Implement intelligent background location tracking
   - Cache map data to reduce network requests
   - Adjust refresh rates based on device capabilities

```typescript
// Example of optimized list rendering
// components/patrol/OptimizedPatrolList.tsx
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Patrol } from '../../types/patrol';
import { PatrolListItem } from './PatrolListItem';

interface OptimizedPatrolListProps {
  patrols: Patrol[];
  onPatrolPress: (patrol: Patrol) => void;
}

export const OptimizedPatrolList: React.FC<OptimizedPatrolListProps> = React.memo(({
  patrols,
  onPatrolPress,
}) => {
  // Use FlashList for better performance with large lists
  return (
    <FlashList
      data={patrols}
      keyExtractor={(item) => item.id}
      renderItem={useCallback(({ item }) => (
        <PatrolListItem
          patrol={item}
          onPress={() => onPatrolPress(item)}
        />
      ), [onPatrolPress])}
      estimatedItemSize={80}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
});
```

### 4. Cross-Platform Considerations

1. **Platform-Specific Code:**
   - Use platform-specific files where needed (e.g., `Component.ios.tsx` and `Component.android.tsx`)
   - Use the Platform API for conditional logic
   - Create platform-specific abstractions for native functionality

   ```typescript
   // Example of platform-specific implementation
   // hooks/useMapRenderer.ios.ts and hooks/useMapRenderer.android.ts
   // hooks/useMapRenderer.ios.ts
   import { useRef, useEffect } from 'react';
   import MapView from 'react-native-maps';
   
   export const useMapRenderer = () => {
     const mapRef = useRef<MapView>(null);
     
     // iOS-specific optimization
     useEffect(() => {
       // iOS-specific setup for map rendering
       return () => {
         // iOS-specific cleanup
       };
     }, []);
     
     return {
       mapRef,
       // iOS-specific methods and properties
     };
   };
   
   // hooks/useMapRenderer.android.ts
   import { useRef, useEffect } from 'react';
   import MapView from 'react-native-maps';
   
   export const useMapRenderer = () => {
     const mapRef = useRef<MapView>(null);
     
     // Android-specific optimization
     useEffect(() => {
       // Android-specific setup for map rendering
       return () => {
         // Android-specific cleanup
       };
     }, []);
     
     return {
       mapRef,
       // Android-specific methods and properties
     };
   };
   ```

2. **Responsive Design:**
   - Use relative units (percentages, flex) instead of fixed pixel values
   - Test on multiple device sizes and orientations
   - Implement adaptive layouts that work well on different screen sizes

3. **Native Module Fallbacks:**
   - Create fallbacks for platform-specific native modules
   - Use capability detection to provide alternative implementations
   - Handle platform differences in a clean, maintainable way

### 5. Final Tips and Recommendations

1. **Start With a Simplified MVP:**
   - Begin with the core map functionality and simple patrol reporting
   - Validate the OpenStreetMap integration early
   - Get user feedback on the basic functionality before adding more features

2. **Monitor Performance:**
   - Implement performance monitoring from the start
   - Set up crash reporting and analytics
   - Use performance profiling tools during development

3. **Iterative Development:**
   - Release early and often
   - Prioritize user feedback
   - Focus on stability and performance before adding new features

4. **Documentation:**
   - Document API integrations and custom components
   - Create architecture diagrams
   - Keep README files up to date with setup and development instructions
  ## Accessibility Implementation

Implementing accessibility features is crucial, especially given the app's target audience includes older users and those who will be using it while driving.

### 1. Large Touch Targets

All interactive elements should meet the minimum size requirements:

```typescript
// constants/theme.ts - Design system standards
export const TOUCH_TARGET = {
  MINIMUM: 48, // minimum size in dp
  SPACING: 8,  // minimum spacing between targets
};

// components/common/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { TOUCH_TARGET } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  icon,
  style,
  textStyle,
  disabled = false,
  loading = false,
}) => {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: theme.colors.primary },
        disabled && { backgroundColor: theme.colors.disabled },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <>
          {icon && (
            <FontAwesome
              name={icon}
              size={20}
              color="white"
              style={styles.icon}
            />
          )}
          <Text style={[styles.title, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: TOUCH_TARGET.MINIMUM,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  icon: {
    marginRight: 8,
  },
});
```

### 2. High Contrast UI

Implement a high contrast mode and ensure all UI elements meet accessibility contrast ratios:

```typescript
// constants/theme.ts - High contrast theme
export const lightTheme: Theme = {
  colors: {
    primary: '#0066CC',
    background: '#FFFFFF',
    card: '#F5F5F5',
    text: '#000000',
    border: '#DDDDDD',
    notification: '#FF3B30',
    disabled: '#BBBBBB',
    patrolHigh: '#FF0000',
    patrolMedium: '#FFA500',
    patrolLow: '#FFFF00',
    patrolHistorical: '#888888',
  },
  // ...other theme properties
};

export const darkTheme: Theme = {
  colors: {
    primary: '#0088FF',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    border: '#333333',
    notification: '#FF453A',
    disabled: '#555555',
    patrolHigh: '#FF6666',
    patrolMedium: '#FFB266',
    patrolLow: '#FFFF66',
    patrolHistorical: '#AAAAAA',
  },
  // ...other theme properties
};

export const highContrastLightTheme: Theme = {
  colors: {
    primary: '#0000FF',
    background: '#FFFFFF',
    card: '#EEEEEE',
    text: '#000000',
    border: '#000000',
    notification: '#FF0000',
    disabled: '#888888',
    patrolHigh: '#FF0000',
    patrolMedium: '#FF6600',
    patrolLow: '#CC9900',
    patrolHistorical: '#666666',
  },
  // ...other theme properties
};

export const highContrastDarkTheme: Theme = {
  colors: {
    primary: '#00BBFF',
    background: '#000000',
    card: '#222222',
    text: '#FFFFFF',
    border: '#FFFFFF',
    notification: '#FF6666',
    disabled: '#AAAAAA',
    patrolHigh: '#FF6666',
    patrolMedium: '#FFCC66',
    patrolLow: '#FFFF66',
    patrolHistorical: '#CCCCCC',
  },
  // ...other theme properties
};
```

### 3. Screen Reader Support

Add proper accessibility attributes to all components:

```typescript
// components/map/PatrolMarker.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import { Patrol, PatrolType } from '../../types/patrol';
import { getPatrolIcon, getPatrolProbabilityColor } from '../../utils/patrolHelpers';
import { formatTimeAgo } from '../../utils/timeFormatters';

interface PatrolMarkerProps {
  patrol: Patrol;
  onPress: (patrol: Patrol) => void;
}

export const PatrolMarker: React.FC<PatrolMarkerProps> = React.memo(
  ({ patrol, onPress }) => {
    const { type, latitude, longitude, timestamp } = patrol;
    const timeAgo = formatTimeAgo(timestamp);
    const color = getPatrolProbabilityColor(patrol);
    const icon = getPatrolIcon(type);
    const patrolTypeText = type === PatrolType.SPEED_RADAR 
      ? 'Speed radar' 
      : type === PatrolType.ALCOTEST 
        ? 'Alcohol test' 
        : 'Police patrol';
    
    const accessibilityLabel = `${patrolTypeText} reported ${timeAgo}`;
    const accessibilityHint = 'Double tap for details';
    
    return (
      <Marker
        coordinate={{ latitude, longitude }}
        onPress={() => onPress(patrol)}
        tracksViewChanges={false}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <View style={styles.markerContainer}>
          <FontAwesome
            name={icon}
            size={24}
            color={color}
            style={styles.icon}
            testID="patrol-icon"
          />
        </View>
      </Marker>
    );
  }
);

const styles = StyleSheet.create({
  markerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  icon: {
    textAlign: 'center',
  },
});
```

### 4. Voice Commands and Audio Feedback

Enhance the voice command system to be more robust:

```typescript
// services/voice/voiceService.ts
import * as Speech from 'expo-speech';
import { PatrolType } from '../../types/patrol';
import { Route, RouteStep } from '../../types/navigation';

// Speech synthesis options
const speechOptions = {
  rate: 0.9,
  pitch: 1.0,
  language: 'en-US',
};

// Speak navigation instructions
export const speakNavigationInstruction = (step: RouteStep): void => {
  const { instruction, distance } = step;
  const distanceText = distance < 1000 
    ? `${Math.round(distance)} meters` 
    : `${(distance / 1000).toFixed(1)} kilometers`;
    
  const text = `In ${distanceText}, ${instruction}`;
  Speech.speak(text, speechOptions);
};

// Announce nearby patrol
export const announcePatrol = (type: PatrolType, distance: number): void => {
  let patrolText = '';
  
  switch (type) {
    case PatrolType.SPEED_RADAR:
      patrolText = 'Speed radar';
      break;
    case PatrolType.ALCOTEST:
      patrolText = 'Alcohol checkpoint';
      break;
    default:
      patrolText = 'Police patrol';
  }
  
  const distanceText = distance < 1000 
    ? `${Math.round(distance)} meters` 
    : `${(distance / 1000).toFixed(1)} kilometers`;
    
  const text = `Caution. ${patrolText} reported ${distanceText} ahead`;
  Speech.speak(text, {
    ...speechOptions,
    rate: 1.0, // Slightly faster for alerts
  });
};

// Confirm patrol report submission
export const confirmPatrolReport = (type: PatrolType): void => {
  let patrolText = '';
  
  switch (type) {
    case PatrolType.SPEED_RADAR:
      patrolText = 'Speed radar';
      break;
    case PatrolType.ALCOTEST:
      patrolText = 'Alcohol checkpoint';
      break;
    default:
      patrolText = 'Police patrol';
  }
  
  const text = `${patrolText} has been reported. Thank you for contributing.`;
  Speech.speak(text, speechOptions);
};

// Stop all voice outputs
export const stopSpeaking = (): void => {
  Speech.stop();
};
```

### 5. Driver-Focused Design Features

```typescript
// services/settings/drivingModeService.ts
import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { useSettings } from '../../hooks/useSettings';
import { useBrightness } from '../../hooks/useBrightness';

// Configuration for driving mode
const DRIVING_SPEED_THRESHOLD = 10; // km/h
const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds
const BRIGHTNESS_CHECK_INTERVAL = 30000; // 30 seconds

export const useDrivingMode = () => {
  const [isDriving, setIsDriving] = useState(false);
  const [speed, setSpeed] = useState(0);
  const { settings } = useSettings();
  const { adjustBrightness } = useBrightness();
  
  // Check if user is likely driving based on speed
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;
    
    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return;
      }
      
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10, // meters
          timeInterval: LOCATION_UPDATE_INTERVAL,
        },
        (location) => {
          if (location.coords.speed !== null) {
            // Convert m/s to km/h
            const speedKmh = location.coords.speed * 3.6;
            setSpeed(speedKmh);
            setIsDriving(speedKmh >= DRIVING_SPEED_THRESHOLD);
          }
        }
      );
    };
    
    if (settings.autoDrivingMode) {
      startLocationTracking();
    }
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [settings.autoDrivingMode]);
  
  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && settings.autoDrivingMode && isDriving) {
        // Re-enable any driving mode features that might have been disabled
        if (settings.autoAdjustBrightness) {
          adjustBrightness();
        }
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [settings.autoDrivingMode, isDriving, settings.autoAdjustBrightness]);
  
  // Automatic brightness adjustment
  useEffect(() => {
    let brightnessInterval: NodeJS.Timeout;
    
    if (settings.autoAdjustBrightness && isDriving) {
      brightnessInterval = setInterval(() => {
        adjustBrightness();
      }, BRIGHTNESS_CHECK_INTERVAL);
    }
    
    return () => {
      if (brightnessInterval) {
        clearInterval(brightnessInterval);
      }
    };
  }, [settings.autoAdjustBrightness, isDriving]);
  
  return {
    isDriving,
    speed,
    // Additional methods to manually enable/disable driving mode
    enableDrivingMode: () => setIsDriving(true),
    disableDrivingMode: () => setIsDriving(false),
  };
};
```

## API Layer Implementation

For communication with backend services, implement a standardized API layer:

```typescript
// api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/config';

// Create a custom axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token expiration and refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post(
          `${Config.API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );
        
        const { token, refreshToken: newRefreshToken } = response.data;
        
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', newRefreshToken);
        
        // Update the failed request with new token and retry
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
        // Handle logout logic
        return Promise.reject(refreshError);
      }
    }
    
    // Handle network errors
    if (!error.response) {
      // Network error or server not responding
      return Promise.reject({
        ...error,
        isNetworkError: true,
        message: 'Network error. Please check your connection and try again.',
      });
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

## Data Models and Type Definitions

Define robust TypeScript interfaces for app data structures:

```typescript
// types/patrol.ts
export enum PatrolType {
  GENERAL = 'general',
  SPEED_RADAR = 'speed_radar',
  ALCOTEST = 'alcotest',
  SPEED_CAMERA = 'speed_camera',
  CHECKPOINT = 'checkpoint',
}

export interface Patrol {
  id: string;
  type: PatrolType;
  latitude: number;
  longitude: number;
  timestamp: number;
  reportedBy?: string;
  comment?: string;
  confirmedCount: number;
  deniedCount: number;
  // Calculated properties
  probability?: number; // Based on confirmations/denials
  isHistorical?: boolean; // Based on timestamp
}

export interface PatrolReport {
  type: PatrolType;
  latitude: number;
  longitude: number;
  comment?: string;
}

export interface PatrolCluster {
  latitude: number;
  longitude: number;
  patrols: Patrol[];
}

// types/navigation.ts
export interface Location {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  distance: number;
  duration: number;
  instruction: string;
  type: string;
  name: string;
  coordinates: Location;
}

export interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
}

export interface Route {
  distance: number;
  duration: number;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  legs: RouteLeg[];
}

export interface NavigationState {
  active: boolean;
  currentRoute: Route | null;
  destination: Location | null;
  currentStep: RouteStep | null;
  distanceToNextStep: number;
  estimatedArrival: number | null;
  nearbyPatrols: Patrol[];
}

// types/user.ts
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  reputation: number;
  reportCount: number;
  confirmedReportCount: number;
  createdAt: number;
  lastActive: number;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto' | 'high_contrast';
  mapType: 'standard' | 'satellite' | 'hybrid';
  voiceGuidance: boolean;
  voiceAlerts: boolean;
  alertDistance: number; // Distance in meters to announce patrols
  autoAdjustBrightness: boolean;
  autoDrivingMode: boolean;
  patrolVisibility: {
    [key in PatrolType]: boolean;
  };
  showHistoricalPatrols: boolean;
  distanceUnit: 'metric' | 'imperial';
  soundEffects: boolean;
  vibration: boolean;
  dataUsage: 'low' | 'medium' | 'high';
}
```

## Offline Support Implementation

Implement robust offline handling for critical app functionality:

```typescript
// services/storage/offlineStorageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Patrol, PatrolReport } from '../../types/patrol';
import { Route } from '../../types/navigation';

// Keys for AsyncStorage
const KEYS = {
  RECENT_PATROLS: 'recent_patrols',
  PENDING_REPORTS: 'pending_patrol_reports',
  CACHED_ROUTES: 'cached_routes',
  MAP_TILES: 'map_tiles',
  LAST_SYNC: 'last_sync_timestamp',
};

// Save patrols to local storage
export const savePatrolsLocally = async (patrols: Patrol[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.RECENT_PATROLS, JSON.stringify(patrols));
    await AsyncStorage.setItem(KEYS.LAST_SYNC, Date.now().toString());
  } catch (error) {
    console.error('Error saving patrols locally:', error);
  }
};

// Get locally stored patrols
export const getLocalPatrols = async (): Promise<Patrol[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.RECENT_PATROLS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting local patrols:', error);
    return [];
  }
};

// Queue a patrol report for later submission
export const queuePatrolReport = async (report: PatrolReport): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.PENDING_REPORTS);
    const pendingReports = existingData ? JSON.parse(existingData) : [];
    pendingReports.push({
      ...report,
      queuedAt: Date.now(),
    });
    await AsyncStorage.setItem(KEYS.PENDING_REPORTS, JSON.stringify(pendingReports));
  } catch (error) {
    console.error('Error queuing patrol report:', error);
  }
};

// Get pending patrol reports
export const getPendingPatrolReports = async (): Promise<(PatrolReport & { queuedAt: number })[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PENDING_REPORTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting pending reports:', error);
    return [];
  }
};

// Remove a pending report (after successful submission)
export const removePendingReport = async (index: number): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(KEYS.PENDING_REPORTS);
    const pendingReports = existingData ? JSON.parse(existingData) : [];
    pendingReports.splice(index, 1);
    await AsyncStorage.setItem(KEYS.PENDING_REPORTS, JSON.stringify(pendingReports));
  } catch (error) {
    console.error('Error removing pending report:', error);
  }
};

// Cache a navigation route
export const cacheRoute = async (origin: string, destination: string, route: Route): Promise<voi# Police Patrol Mapping & Navigation App - Technical Implementation Prompt

## Technology Stack Requirements

- **Framework**: Expo SDK 52
- **Core**: React Native
- **Navigation**: Expo Router with file-based navigation
- **Map Integration**: OpenStreetMap
- **Real-time Communication**: WebSockets for patrol updates
- **State Management**: React Context API + Hooks for simpler states, Redux Toolkit for complex global states
- **API Communication**: React Query for data fetching and caching
- **Styling**: React Native StyleSheet with a design system approach
- **Geolocation**: Expo Location API
- **Voice Commands**: Expo Speech API
- **Storage**: AsyncStorage for local data, Secure Store for sensitive information
- **Testing**: Jest and React Native Testing Library

## Architecture Overview

The application should follow a clean architecture approach with clear separation of:

1. **Presentation Layer**: UI components, screens, and layouts
2. **Business Logic Layer**: Services, hooks, and state management
3. **Data Layer**: API clients, local storage, and data models

### File Structure

```
src/
├── app/                           # Expo Router file-based routing
│   ├── _layout.tsx                # Root layout with navigation setup
│   ├── index.tsx                  # Main Map Screen
│   ├── report/                    # Report patrol flow
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── navigate/                  # Navigation features
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   └── more/                      # More section screens
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── profile.tsx
│       ├── settings.tsx
│       └── help.tsx
├── components/                    # Reusable UI components
│   ├── map/                       # Map-related components
│   │   ├── MapView.tsx
│   │   ├── PatrolMarker.tsx
│   │   ├── NavigationOverlay.tsx
│   │   └── ...
│   ├── navigation/                # Navigation-related components
│   │   ├── BottomNav.tsx
│   │   └── ...
│   ├── report/                    # Reporting-related components
│   │   ├── ReportButton.tsx
│   │   ├── PatrolTypeSelector.tsx
│   │   └── ...
│   └── common/                    # Shared UI components
│       ├── Button.tsx
│       ├── BottomSheet.tsx
│       └── ...
├── hooks/                         # Custom React hooks
│   ├── useMap.ts
│   ├── usePatrols.ts
│   ├── useNavigation.ts
│   ├── useGeolocation.ts
│   ├── useVoiceCommands.ts
│   └── ...
├── services/                      # Business logic services
│   ├── patrol/
│   │   ├── patrolService.ts       # Patrol data handling
│   │   └── reportService.ts       # Patrol reporting logic
│   ├── map/
│   │   ├── mapService.ts          # Map rendering logic
│   │   └── routingService.ts      # Route calculation logic
│   ├── navigation/
│   │   └── navigationService.ts   # Turn-by-turn navigation logic
│   └── user/
│       └── userService.ts         # User profile and settings
├── context/                       # React Context for state management
│   ├── MapContext.tsx
│   ├── PatrolContext.tsx
│   ├── NavigationContext.tsx
│   ├── ThemeContext.tsx
│   └── UserContext.tsx
├── api/                           # API integration
│   ├── client.ts                  # Base API client setup
│   ├── patrolApi.ts               # Patrol-related API calls
│   ├── routingApi.ts              # Navigation-related API calls
│   └── userApi.ts                 # User-related API calls
├── utils/                         # Utility functions
│   ├── geolocation.ts
│   ├── permissions.ts
│   ├── mapHelpers.ts
│   └── timeFormatters.ts
├── constants/                     # App constants
│   ├── theme.ts                   # Design system tokens
│   ├── mapSettings.ts
│   └── patrolTypes.ts
└── types/                         # TypeScript type definitions
    ├── patrol.ts
    ├── navigation.ts
    └── user.ts
```

## Core Features Implementation Guidelines

### 1. Map Integration with OpenStreetMap

Use `react-native-maps` with custom tile overlays for OpenStreetMap integration.

```typescript
// components/map/MapView.tsx
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import { useMapContext } from '../../context/MapContext';
import { usePatrolContext } from '../../context/PatrolContext';
import PatrolMarker from './PatrolMarker';

export const Map = () => {
  const { mapRef, region, setRegion } = useMapContext();
  const { patrols } = usePatrolContext();
  
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
        {patrols.map(patrol => (
          <PatrolMarker 
            key={patrol.id} 
            patrol={patrol} 
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
```

### 2. Clean Architecture with Separation of Concerns

Example for patrol reporting feature:

```typescript
// hooks/usePatrols.ts - Business logic hook
import { usePatrolContext } from '../context/PatrolContext';
import { reportPatrol } from '../services/patrol/patrolService';
import { useLocation } from './useLocation';
import { PatrolType } from '../types/patrol';

export const usePatrols = () => {
  const { patrols, addPatrol, loading } = usePatrolContext();
  const { currentLocation } = useLocation();
  
  const submitPatrolReport = async (patrolType: PatrolType, comment?: string) => {
    try {
      if (!currentLocation) {
        throw new Error('Location unavailable');
      }
      
      const newPatrol = await reportPatrol({
        type: patrolType,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        comment
      });
      
      addPatrol(newPatrol);
      return newPatrol;
    } catch (error) {
      // Handle error
      console.error('Failed to report patrol:', error);
      throw error;
    }
  };
  
  return {
    patrols,
    loading,
    submitPatrolReport
  };
};

// components/report/ReportButton.tsx - UI component
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';

export const ReportButton = () => {
  const router = useRouter();
  
  const handlePress = () => {
    router.push('/report');
  };
  
  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <FontAwesome name="exclamation-triangle" size={24} color="white" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
```

### 3. Expo Router File-Based Navigation

Setup for the bottom tab navigation:

```typescript
// app/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { BottomNav } from '../components/navigation/BottomNav';
import { COLORS } from '../constants/theme';
import { MapContextProvider } from '../context/MapContext';
import { PatrolContextProvider } from '../context/PatrolContext';
import { NavigationContextProvider } from '../context/NavigationContext';
import { ThemeContextProvider } from '../context/ThemeContext';
import { UserContextProvider } from '../context/UserContext';

export default function AppLayout() {
  return (
    <ThemeContextProvider>
      <UserContextProvider>
        <MapContextProvider>
          <PatrolContextProvider>
            <NavigationContextProvider>
              <Tabs
                screenOptions={{
                  headerShown: false,
                  tabBarShowLabel: true,
                  tabBarActiveTintColor: COLORS.primary,
                  tabBarInactiveTintColor: COLORS.gray,
                  tabBarStyle: {
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                  },
                }}
                tabBar={(props) => <BottomNav {...props} />}
              >
                <Tabs.Screen
                  name="index"
                  options={{
                    title: 'Map',
                    tabBarIcon: ({ color }) => (
                      <FontAwesome name="map" size={24} color={color} />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="report/index"
                  options={{
                    title: 'Report',
                    tabBarIcon: ({ color }) => (
                      <FontAwesome name="exclamation-triangle" size={24} color={color} />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="navigate/index"
                  options={{
                    title: 'Navigate',
                    tabBarIcon: ({ color }) => (
                      <FontAwesome name="location-arrow" size={24} color={color} />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="more/index"
                  options={{
                    title: 'More',
                    tabBarIcon: ({ color }) => (
                      <FontAwesome name="ellipsis-h" size={24} color={color} />
                    ),
                  }}
                />
              </Tabs>
            </NavigationContextProvider>
          </PatrolContextProvider>
        </MapContextProvider>
      </UserContextProvider>
    </ThemeContextProvider>
  );
}
```

### 4. Context API for State Management

```typescript
// context/PatrolContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Patrol, PatrolType } from '../types/patrol';
import { fetchPatrols } from '../services/patrol/patrolService';

interface PatrolState {
  patrols: Patrol[];
  loading: boolean;
  error: string | null;
}

type PatrolAction = 
  | { type: 'SET_PATROLS'; payload: Patrol[] }
  | { type: 'ADD_PATROL'; payload: Patrol }
  | { type: 'UPDATE_PATROL'; payload: Patrol }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string };

const initialState: PatrolState = {
  patrols: [],
  loading: false,
  error: null,
};

const PatrolContext = createContext<{
  state: PatrolState;
  dispatch: React.Dispatch<PatrolAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

const patrolReducer = (state: PatrolState, action: PatrolAction): PatrolState => {
  switch (action.type) {
    case 'SET_PATROLS':
      return { ...state, patrols: action.payload };
    case 'ADD_PATROL':
      return { ...state, patrols: [...state.patrols, action.payload] };
    case 'UPDATE_PATROL':
      return {
        ...state,
        patrols: state.patrols.map(patrol => 
          patrol.id === action.payload.id ? action.payload : patrol
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const PatrolContextProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [state, dispatch] = useReducer(patrolReducer, initialState);
  
  useEffect(() => {
    const loadPatrols = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const patrols = await fetchPatrols();
        dispatch({ type: 'SET_PATROLS', payload: patrols });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load patrols' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    loadPatrols();
  }, []);
  
  return (
    <PatrolContext.Provider value={{ state, dispatch }}>
      {children}
    </PatrolContext.Provider>
  );
};

export const usePatrolContext = () => {
  const { state, dispatch } = useContext(PatrolContext);
  
  const addPatrol = (patrol: Patrol) => {
    dispatch({ type: 'ADD_PATROL', payload: patrol });
  };
  
  const updatePatrol = (patrol: Patrol) => {
    dispatch({ type: 'UPDATE_PATROL', payload: patrol });
  };
  
  return {
    patrols: state.patrols,
    loading: state.loading,
    error: state.error,
    addPatrol,
    updatePatrol
  };
};
```

### 5. Voice Commands Integration

```typescript
// hooks/useVoiceCommands.ts
import { useState, useEffect } from 'react';
import * as Speech from 'expo-speech';
import * as Voice from '@react-native-voice/voice';
import { usePatrols } from './usePatrols';
import { PatrolType } from '../types/patrol';

export const useVoiceCommands = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { submitPatrolReport } = usePatrols();
  
  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      if (e.value) {
        setTranscript(e.value[0]);
      }
    };
    
    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };
    
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);
  
  const startListening = async () => {
    try {
      await Voice.start('en-US');
      setIsListening(true);
    } catch (e) {
      console.error(e);
    }
  };
  
  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
      processCommand(transcript);
    } catch (e) {
      console.error(e);
    }
  };
  
  const processCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    // Basic command processing for patrol reporting
    if (lowerCommand.includes('report') || lowerCommand.includes('patrol')) {
      if (lowerCommand.includes('speed') || lowerCommand.includes('radar')) {
        submitPatrolReport(PatrolType.SPEED_RADAR);
        Speech.speak('Reporting speed radar.');
      } else if (lowerCommand.includes('alcotest') || lowerCommand.includes('alcohol')) {
        submitPatrolReport(PatrolType.ALCOTEST);
        Speech.speak('Reporting alcohol test checkpoint.');
      } else {
        // Default patrol type if specifics aren't mentioned
        submitPatrolReport(PatrolType.GENERAL);
        Speech.speak('Reporting police patrol.');
      }
    }
  };
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening
  };
};
```

### 6. Night Mode Implementation

```typescript
// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme } from '../constants/theme';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setAutomaticTheme: (isAutomatic: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setAutomaticTheme: () => {},
});

export const ThemeContextProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isAutomaticTheme, setIsAutomaticTheme] = useState(true);
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  
  useEffect(() => {
    if (isAutomaticTheme) {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, isAutomaticTheme]);
  
  const toggleTheme = () => {
    setIsDark(prev => !prev);
    setIsAutomaticTheme(false);
  };
  
  const setAutomaticTheme = (isAutomatic: boolean) => {
    setIsAutomaticTheme(isAutomatic);
    if (isAutomatic) {
      setIsDark(systemColorScheme === 'dark');
    }
  };
  
  const theme = isDark ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setAutomaticTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### 7. Patrol Reporting System

```typescript
// app/report/index.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { PatrolTypeSelector } from '../../components/report/PatrolTypeSelector';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { usePatrols } from '../../hooks/usePatrols';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';
import { useTheme } from '../../context/ThemeContext';
import { PatrolType } from '../../types/patrol';

export default function ReportScreen() {
  const { theme } = useTheme();
  const { submitPatrolReport } = usePatrols();
  const { isListening, transcript, startListening, stopListening } = useVoiceCommands();
  const [selectedType, setSelectedType] = useState<PatrolType | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select patrol type');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitPatrolReport(selectedType, comment);
      Alert.alert('Success', 'Patrol reported successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to report patrol. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Report Police Patrol
      </Text>
      
      <PatrolTypeSelector
        selectedType={selectedType}
        onSelectType={setSelectedType}
      />
      
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Optional comment"
        multiline
        numberOfLines={3}
        style={styles.commentInput}
      />
      
      <View style={styles.buttonContainer}>
        <Button
          title={isListening ? 'Listening...' : 'Voice Input'}
          onPress={isListening ? stopListening : startListening}
          icon="microphone"
          style={[styles.voiceButton, isListening && styles.listeningButton]}
        />
        
        <Button
          title="Report Patrol"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!selectedType || isSubmitting}
          style={styles.submitButton}
        />
      </View>
      
      {isListening && (
        <Text style={styles.transcript}>"{transcript}"</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  commentInput: {
    marginTop: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  voiceButton: {
    flex: 1,
    marginRight: 10,
  },
  listeningButton: {
    backgroundColor: 'red',
  },
  submitButton: {
    flex: 2,
  },
  transcript: {
    marginTop: 20,
    fontStyle: 'italic',
  },
});
```

### 8. Navigation Features

```typescript
// services/map/routingService.ts
import { Location } from '../types/location';
import { Route } from '../types/navigation';

interface RoutingOptions {
  avoidPatrols?: boolean;
  routeType?: 'fastest' | 'shortest' | 'eco';
}

export const calculateRoute = async (
  origin: Location,
  destination: Location,
  options: RoutingOptions = {}
): Promise<Route> => {
  try {
    // In a real app, this would make an API call to a routing service
    // that supports OpenStreetMap data
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.longitude},${origin.latitude};` +
      `${destination.longitude},${destination.latitude}` +
      `?overview=full&geometries=geojson`
    );
    
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error('Failed to calculate route');
    }
    
    // Transform the response to our internal Route type
    const route: Route = {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      geometry: data.routes[0].geometry,
      legs: data.routes[0].legs.map(leg => ({
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps.map(step => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver.instruction,
          type: step.maneuver.type,
          name: step.name,
          coordinates: {
            latitude: step.maneuver.location[1],
            longitude: step.maneuver.location[0],
          },
        })),
      })),
    };
    
    return route;
  } catch (error) {
    console.error('Route calculation error:', error);
    throw error;
  }
};

// Check if a route passes near any known patrol points
export const checkRouteForPatrols = (route: Route, patrols: Patrol[]): Patrol[] => {
  const patrolsNearRoute: Patrol[] = [];
  
  // For simplicity, check each patrol against each point in the route
  // In a real app, you'd use a more efficient spatial algorithm
  const routeCoordinates = route.geometry.coordinates.map(coord => ({
    longitude: coord[0],
    latitude: coord[1],
  }));
  
  patrols.forEach(patrol => {
    const isNearRoute = routeCoordinates.some(coord => 
      calculateDistance(
        coord.latitude,
        coord.longitude,
        patrol.latitude,
        patrol.longitude
      ) < 0.5 // 500 meters threshold
    );
    
    if (isNearRoute) {
      patrolsNearRoute.push(patrol);
    }
  });
  
  return patrolsNearRoute;
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
```

## Performance Optimization

1. **Map Rendering**
   - Implement tile caching for OpenStreetMap
   - Use clustering for patrol markers when zoomed out
   - Reduce re-renders with React.memo and useMemo for complex components

2. **Location Updates**
   - Optimize location update frequency based on movement
   - Implement background location updates with power-efficient settings

3. **Data Handling**
   - Implement efficient data structures for patrol lookup
   - Cache recent routes and patrol data
   - Use incremental updates for patrol data

```typescript
// components/map/PatrolCluster.tsx
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import { Patrol } from '../../types/patrol';
import { groupPatrolsByProximity } from '../../utils/mapHelpers';

interface PatrolClusterProps {
  patrols: Patrol[];
  onPress: (patrols: Patrol[]) => void;
}

export const PatrolCluster: React.FC<PatrolClusterProps> = React.memo(
  ({ patrols, onPress }) => {
    const clusters = useMemo(() => {
      return groupPatrolsByProximity(patrols, 0.5); // 500m clustering
    }, [patrols]);
    
    return (
      <>
        {clusters.map((cluster, index) => {
          const coordinate = {
            latitude: cluster.latitude,
            longitude: cluster.longitude,
          };
          
          return (
            <Marker
              key={`cluster-${index}`}
              coordinate={coordinate}
              onPress={() => onPress(cluster.patrols)}
            >
              <View style={styles.cluster}>
                <Text style={styles.clusterText}>{cluster.patrols.length}</Text>
              </View>
            </Marker>
          );
        })}
      </>
    );
  }
);

const styles = StyleSheet.create({
  cluster: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
```

## Testing Strategy

1. **Unit Tests**
   - Test individual hooks and services
   - Mock API responses and location data
   - Focus on business logic and data handling

2. **Component Tests**
   - Test UI components with React Native Testing Library
   - Verify component behavior with different props
   - Test accessibility concerns like touch target size
   - Check that UI adapts properly to different themes

3. **Integration Tests**
   - Test core workflows (reporting, navigation)
   - Verify context providers work together correctly
   - Test navigation flows and screen transitions

4. **End-to-End Tests**
   - Use Detox for E2E testing of critical user journeys
   - Simulate real user interactions on actual devices
   - Test under various network conditions

5. **Performance Testing**
   - Profile render times for map and marker components
   - Test app performance with large numbers of patrol markers
   - Monitor memory usage during extended navigation sessions

```typescript
// __tests__/hooks/usePatrols.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { usePatrols } from '../../src/hooks/usePatrols';
import { reportPatrol } from '../../src/services/patrol/patrolService';
import { PatrolType } from '../../src/types/patrol';

// Mock dependencies
jest.mock('../../src/services/patrol/patrolService');
jest.mock('../../src/hooks/useLocation', () => ({
  useLocation: () => ({
    currentLocation: { latitude: 40.712776, longitude: -74.005974 }
  })
}));

describe('usePatrols', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should submit patrol report with current location', async () => {
    // Mock implementation
    (reportPatrol as jest.Mock).mockResolvedValue({
      id: '123',
      type: PatrolType.SPEED_RADAR,
      latitude: 40.712776,
      longitude: -74.005974,
      timestamp: Date.now()
    });
    
    const { result } = renderHook(() => usePatrols());
    
    await act(async () => {
      await result.current.submitPatrolReport(PatrolType.SPEED_RADAR);
    });
    
    expect(reportPatrol).toHaveBeenCalledWith({
      type: PatrolType.SPEED_RADAR,
      latitude: 40.712776,
      longitude: -74.005974,
      comment: undefined
    });
  });
  
  it('should handle errors when reporting patrols', async () => {
    // Mock implementation with error
    (reportPatrol as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => usePatrols());
    
    await expect(
      act(async () => {
        await result.current.submitPatrolReport(PatrolType.SPEED_RADAR);
      })
    ).rejects.toThrow('Network error');
  });
});

// __tests__/components/map/PatrolMarker.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PatrolMarker } from '../../../src/components/map/PatrolMarker';
import { PatrolType } from '../../../src/types/patrol';

// Mock react-native-maps
jest.mock('react-native-maps', () => ({
  Marker: ({ onPress, children }) => (
    <div data-testid="marker" onClick={onPress}>
      {children}
    </div>
  ),
}));

describe('PatrolMarker', () => {
  const mockPatrol = {
    id: '123',
    type: PatrolType.SPEED_RADAR,
    latitude: 40.712776,
    longitude: -74.005974,
    timestamp: Date.now(),
    confirmedCount: 3,
    deniedCount: 1,
  };
  
  const mockOnPress = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders a marker with the correct properties', () => {
    const { getByTestId } = render(
      <PatrolMarker patrol={mockPatrol} onPress={mockOnPress} />
    );
    
    const marker = getByTestId('marker');
    expect(marker).toBeTruthy();
  });
  
  it('calls onPress with patrol data when pressed', () => {
    const { getByTestId } = render(
      <PatrolMarker patrol={mockPatrol} onPress={mockOnPress} />
    );
    
    const marker = getByTestId('marker');
    fireEvent.press(marker);
    
    expect(mockOnPress).toHaveBeenCalledWith(mockPatrol);
  });
  
  it('shows the correct color based on patrol probability', () => {
    const highProbabilityPatrol = {
      ...mockPatrol,
      confirmedCount: 10,
      deniedCount: 1,
    };
    
    const mediumProbabilityPatrol = {
      ...mockPatrol,
      confirmedCount: 3,
      deniedCount: 1,
    };
    
    const lowProbabilityPatrol = {
      ...mockPatrol,
      confirmedCount: 1,
      deniedCount: 2,
    };
    
    const { rerender, getByTestId } = render(
      <PatrolMarker patrol={highProbabilityPatrol} onPress={mockOnPress} />
    );
    
    let marker = getByTestId('patrol-icon');
    expect(marker.props.style.color).toBe('#FF0000'); // Red for high probability
    
    rerender(<PatrolMarker patrol={mediumProbabilityPatrol} onPress={mockOnPress} />);
    marker = getByTestId('patrol-icon');
    expect(marker.props.style.color).toBe('#FFA500'); // Orange for medium probability
    
    rerender(<PatrolMarker patrol={lowProbabilityPatrol} onPress={mockOnPress} />);
    marker = getByTestId('patrol-icon');
    expect(marker.props.style.color).toBe('#FFFF00'); // Yellow for low probability
  });
});