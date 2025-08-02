import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, Modal, Text, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router'
import { StatusBar} from "expo-status-bar";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocation } from '../../context/LocationContext';
import {PatrolProvider} from '../../context/PatrolContext';
import { useWebSocket } from '../../context/WebSocketContext';
import directionsService from '../../services/map/directionsService';
import navigationService, { NavigationState } from '../../services/navigation/navigationService';
import { EnhancedNavigationInstructions } from '../../components/navigation/EnhancedNavigationInstructions';

import { PatrolMapView, PatrolMapViewRef } from "../../components/map/MainMap";
import { MapOverlays } from "../../components/map/MapOverlay";
import { PatrolDetailsModal } from "../../components/patrols/PatrolDetailsModal";
import { NavigationOverlay } from "../../components/navigation/NavigationOverlay";
import { NavigationInstructions } from '../../components/navigation/NavigationInstructions';

import { generateMockPatrols } from "../../utils/mockData";
import { PatrolType, Patrol } from "../../types/patrol";
import MapboxGL from '@rnmapbox/maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PatrolMarker } from '../../components/map/PatrolMarker';
import { PlaceCategories, CompactPlaceCategories } from '../../components/map/PlaceCategories';
import { PlaceDetailsModal } from '../../components/places/PlaceDetailsModal';
import placesService, { Place, PlaceCategory, PLACE_CATEGORIES } from '../../services/map/placesService';
import * as Location from 'expo-location';

MapboxGL.setAccessToken('pk.eyJ1IjoibWlraWpha292IiwiYSI6ImNtYjlscWc3YzB6N2Iya3M2cmQxY2Y5eWEifQ.u_y6rM-a77gBQBhZJ8KkNw'); // Place this at the top level, before any map rendering

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

interface Route {
    distance: number;
    duration: number;
    steps: any[];
    geometry: {
        coordinates: [number, number][];
    };
}

// Helper function to create smooth curved polyline (same as NavigationOverlay)
const createSmoothCurve = (coordinates: [number, number][], smoothness: number = 0.3): [number, number][] => {
    if (coordinates.length < 3) return coordinates;
    
    const smoothCoordinates: [number, number][] = [];
    
    // Add first point
    smoothCoordinates.push(coordinates[0]);
    
    for (let i = 1; i < coordinates.length - 1; i++) {
        const prev = coordinates[i - 1];
        const current = coordinates[i];
        const next = coordinates[i + 1];
        
        // Calculate control points for bezier curve
        const cp1x = current[0] - (next[0] - prev[0]) * smoothness;
        const cp1y = current[1] - (next[1] - prev[1]) * smoothness;
        const cp2x = current[0] + (next[0] - prev[0]) * smoothness;
        const cp2y = current[1] + (next[1] - prev[1]) * smoothness;
        
        // Generate points along the curve
        const steps = 8; // Number of points to generate between each coordinate
        for (let t = 0; t <= 1; t += 1 / steps) {
            const x = Math.pow(1 - t, 3) * prev[0] + 
                     3 * Math.pow(1 - t, 2) * t * cp1x + 
                     3 * (1 - t) * Math.pow(t, 2) * cp2x + 
                     Math.pow(t, 3) * current[0];
            const y = Math.pow(1 - t, 3) * prev[1] + 
                     3 * Math.pow(1 - t, 2) * t * cp1y + 
                     3 * (1 - t) * Math.pow(t, 2) * cp2y + 
                     Math.pow(t, 3) * current[1];
            
            if (t > 0) { // Skip the first point to avoid duplication
                smoothCoordinates.push([x, y]);
            }
        }
    }
    
    // Add last point
    smoothCoordinates.push(coordinates[coordinates.length - 1]);
    
    return smoothCoordinates;
};

function MapScreenContent() {
    const insets = useSafeAreaInsets();
    const { location, errorMsg, startNavigationUpdates, stopNavigationUpdates } = useLocation();
    const webSocketData = useWebSocket();
    const patrols = webSocketData?.patrols || [];
    const connected = webSocketData?.connected || false;
    const mapRef = useRef<PatrolMapViewRef>(null);
    const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
    const [showTraffic, setShowTraffic] = useState(false);
    const [selectedPatrol, setSelectedPatrol] = useState<Patrol | null>(null);

    // --- Inline navigation state ---
    const [navigationRoute, setNavigationRoute] = useState<Route | null>(null);
    const [smoothNavigationRoute, setSmoothNavigationRoute] = useState<Route | null>(null);
    const [navigationMode, setNavigationMode] = useState<'preview' | 'active' | null>(null); // 'preview' | 'active' | null
    const [navigationDestination, setNavigationDestination] = useState<any | null>(null);

    // --- Search state ---
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedSearchResult, setSelectedSearchResult] = useState<any | null>(null);
    const [showNavigationOverlay, setShowNavigationOverlay] = useState(false);

    // Add state for multiple routes and selected route index
    const [routes, setRoutes] = useState<Route[]>([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

    // Add state for navigation start location
    const [navigationStartLocation, setNavigationStartLocation] = useState<any | null>(null);

    const [compassHeading, setCompassHeading] = useState(0);

    // --- Places state ---
    const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [showPlaceCategories, setShowPlaceCategories] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [placesLoading, setPlacesLoading] = useState(false);

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      let subscription;
      (async () => {
        subscription = await Location.watchHeadingAsync(({ trueHeading }) => {
          setCompassHeading(trueHeading);
        });
      })();
      return () => {
        if (subscription) subscription.remove();
      };
    }, []);

    useEffect(() => {
    }, [compassHeading]);

    const handleLayerChange = (layer: string) => {
        if (layer === 'traffic') {
            setShowTraffic(true);
            setMapType('standard');
        } else {
            setShowTraffic(false);
            setMapType(layer as 'standard' | 'satellite' | 'hybrid');
        }
    };

    // Helper to calculate distance between two lat/lng points (Haversine formula)
    function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
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

    // --- Enhanced search with places integration ---
    const handleSearch = (query: string) => {
        setSearchText(query);
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
            searchTimeout.current = null;
        }
        if (!query || query.length < 3) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }
        setSearchLoading(true);
        setShowSearchResults(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                // Search both places and addresses
                const [placesResults, addressResults] = await Promise.all([
                    location ? placesService.searchPlaces(query, {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    }, 5) : Promise.resolve([]),
                    searchAddresses(query)
                ]);

                // Combine and format results
                const combinedResults = [
                    ...addressResults,
                    ...placesResults.map(place => ({
                        id: place.id,
                        place_name: place.name,
                        text: place.name,
                        center: place.coordinates,
                        properties: { category: place.category },
                        isPlace: true
                    }))
                ];

                setSearchResults(combinedResults);
            } catch (e) {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 400); // 400ms debounce
    };

    // Helper function to search addresses using Mapbox Geocoding
    const searchAddresses = async (query: string) => {
        try {
            const MAPBOX_TOKEN = 'pk.eyJ1IjoibWlraWpha292IiwiYSI6ImNtYjlscWc3YzB6N2Ika3M2cmQxY2Y5eWEifQ.u_y6rM-a77gBQBhZJ8KkNw';
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&country=IN`;
            const response = await fetch(url);
            const data = await response.json();
            return data?.features || [];
        } catch (e) {
            return [];
        }
    };

    // --- Places search functions ---
    const searchNearbyPlaces = async (category?: PlaceCategory) => {
        if (!location) return;

        setPlacesLoading(true);
        try {
            const userLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            };

            let places: Place[] = [];
            if (category) {
                places = await placesService.searchNearbyPlaces(userLocation, category, 20);
            } else {
                places = await placesService.getPopularPlaces(userLocation, 30);
            }

            setNearbyPlaces(places);
            console.log(`🏪 Found ${places.length} places`, category ? `for ${category.name}` : '(popular)');
        } catch (error) {
            console.error('❌ Error searching places:', error);
        } finally {
            setPlacesLoading(false);
        }
    };

    // Handle category selection
    const handleCategoryPress = async (category: PlaceCategory) => {
        setShowPlaceCategories(false);
        await searchNearbyPlaces(category);
    };

    // Handle category toggle (for filtering)
    const handleCategoryToggle = (categoryId: string) => {
        setSelectedCategories(prev => {
            const newSelection = prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId];
            
            // Filter existing places based on new selection
            if (newSelection.length === 0) {
                // Show all places if no category selected
                searchNearbyPlaces();
            } else {
                // Filter places by selected categories
                const filteredPlaces = nearbyPlaces.filter(place => 
                    newSelection.includes(place.category)
                );
                setNearbyPlaces(filteredPlaces);
            }
            
            return newSelection;
        });
    };

    // Handle place selection
    const handlePlaceSelect = (place: Place) => {
        setSelectedPlace(place);
    };

    // Handle place navigation
    const handlePlaceNavigation = async (place: Place) => {
        if (!location) return;

        try {
            const destination = {
                center: place.coordinates,
                place_name: place.name,
                text: place.name
            };

            await handleSearchResultSelect(destination);
        } catch (error) {
            Alert.alert('Navigation Error', 'Could not start navigation to this place');
        }
    };

    // Load popular places when location changes
    useEffect(() => {
        if (location && !navigationMode) {
            searchNearbyPlaces();
        }
    }, [location?.coords?.latitude, location?.coords?.longitude]);

    // --- Handle search result selection (fetch directions and show preview) ---
    const handleSearchResultSelect = async (result: any) => {
        if (!location) return;
        setSearchLoading(true);
        setShowSearchResults(false); // Hide search results dropdown
        setSearchText(''); // Clear search bar
        setNavigationDestination(result);
        try {
            // Fetch all route alternatives
            const fetchedRoutes = await directionsService.getDirectionsWithAlternatives(
                { latitude: location.coords.latitude, longitude: location.coords.longitude },
                { latitude: result.center[1], longitude: result.center[0] }
            );
            if (fetchedRoutes && fetchedRoutes.length > 0) {
                console.log('📍 Fetched Route Data:', {
                    routeCount: fetchedRoutes.length,
                    firstRouteSteps: fetchedRoutes[0]?.steps?.length,
                    firstStep: fetchedRoutes[0]?.steps?.[0],
                    allSteps: fetchedRoutes[0]?.steps?.map(step => ({
                        instruction: step.instruction,
                        maneuverType: step.maneuver?.type,
                        bearingBefore: step.maneuver?.bearing_before,
                        bearingAfter: step.maneuver?.bearing_after
                    }))
                });
                setRoutes(fetchedRoutes);
                setSelectedRouteIndex(0); // Default to first (fastest) route
                // Set navigationRoute and smoothNavigationRoute for the selected route
                const route = fetchedRoutes[0];
                setNavigationRoute(route);
                const smoothCoordinates = createSmoothCurve(route.geometry.coordinates, 0.25);
                const smoothRoute = {
                    ...route,
                    geometry: {
                        coordinates: smoothCoordinates
                    }
                };
                setSmoothNavigationRoute(smoothRoute);
                setNavigationMode('preview');
            } else {
                setRoutes([]);
                setNavigationRoute(null);
                setSmoothNavigationRoute(null);
            }
        } catch (e) {
            Alert.alert('Directions Error', 'Could not fetch route');
            setRoutes([]);
            setNavigationRoute(null);
            setSmoothNavigationRoute(null);
        } finally {
            setSearchLoading(false);
        }
    };

    // Add handler for route selection
    const handleRouteSelect = (idx: number) => {
        setSelectedRouteIndex(idx);
        const route = routes[idx];
        setNavigationRoute(route);
        const smoothCoordinates = createSmoothCurve(route.geometry.coordinates, 0.25);
        const smoothRoute = {
            ...route,
            geometry: {
                coordinates: smoothCoordinates
            }
        };
        setSmoothNavigationRoute(smoothRoute);
    };

    // Enhanced function to analyze polyline and determine real-time turn direction
    const analyzePolylineDirection = (userLocation: any, routeCoords: [number, number][]): {
        direction: 'straight' | 'left' | 'right' | 'sharp-left' | 'sharp-right' | 'slight-left' | 'slight-right' | 'u-turn',
        bearing: number,
        nextTurnDistance: number
    } => {
        if (!userLocation || !routeCoords || routeCoords.length < 3) {
            return { direction: 'straight', bearing: 0, nextTurnDistance: 0 };
        }

        const userLat = userLocation.coords.latitude;
        const userLng = userLocation.coords.longitude;

        // Find closest point on route
        let minDist = Infinity;
        let closestIndex = 0;
        
        for (let i = 0; i < routeCoords.length; i++) {
            const [lng, lat] = routeCoords[i];
            const dist = getDistance(userLat, userLng, lat, lng);
            if (dist < minDist) {
                minDist = dist;
                closestIndex = i;
            }
        }

        // Look ahead to find next significant turn
        const lookAheadDistance = 100; // meters
        let accumulatedDistance = 0;
        let nextTurnIndex = closestIndex;
        
        for (let i = closestIndex; i < routeCoords.length - 2; i++) {
            const segStart = routeCoords[i];
            const segEnd = routeCoords[i + 1];
            const segmentLength = getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
            
            if (accumulatedDistance + segmentLength >= lookAheadDistance) {
                nextTurnIndex = i + 1;
                break;
            }
            
            accumulatedDistance += segmentLength;
            
            // Check for significant bearing change
            if (i + 2 < routeCoords.length) {
                const currentBearing = calculateBearing(routeCoords[i], routeCoords[i + 1]);
                const nextBearing = calculateBearing(routeCoords[i + 1], routeCoords[i + 2]);
                const bearingDiff = Math.abs(nextBearing - currentBearing);
                const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;
                
                if (normalizedDiff > 15) { // Significant turn detected
                    nextTurnIndex = i + 1;
                    break;
                }
            }
        }

        // Calculate turn direction if we found a turn
        let direction: 'straight' | 'left' | 'right' | 'sharp-left' | 'sharp-right' | 'slight-left' | 'slight-right' | 'u-turn' = 'straight';
        let bearing = 0;
        let nextTurnDistance = 0;

        if (nextTurnIndex < routeCoords.length - 1 && closestIndex < routeCoords.length - 1) {
            // Calculate current direction
            const currentBearing = calculateBearing(routeCoords[closestIndex], routeCoords[Math.min(closestIndex + 1, routeCoords.length - 1)]);
            
            // Calculate turn direction
            if (nextTurnIndex + 1 < routeCoords.length) {
                const nextBearing = calculateBearing(routeCoords[nextTurnIndex], routeCoords[nextTurnIndex + 1]);
                let turnAngle = nextBearing - currentBearing;
                
                // Normalize turn angle
                if (turnAngle > 180) turnAngle -= 360;
                if (turnAngle < -180) turnAngle += 360;
                
                // Classify turn
                if (Math.abs(turnAngle) < 10) {
                    direction = 'straight';
                } else if (Math.abs(turnAngle) > 150) {
                    direction = 'u-turn';
                } else if (turnAngle > 0) {
                    // Right turn
                    if (turnAngle > 90) direction = 'sharp-right';
                    else if (turnAngle > 35) direction = 'right';
                    else direction = 'slight-right';
                } else {
                    // Left turn
                    if (turnAngle < -90) direction = 'sharp-left';
                    else if (turnAngle < -35) direction = 'left';
                    else direction = 'slight-left';
                }
                
                // Calculate distance to turn
                for (let i = closestIndex; i < nextTurnIndex; i++) {
                    if (i + 1 < routeCoords.length) {
                        const segStart = routeCoords[i];
                        const segEnd = routeCoords[i + 1];
                        nextTurnDistance += getDistance(segStart[1], segStart[0], segEnd[1], segEnd[0]);
                    }
                }
            }
            
            bearing = currentBearing;
        }

        return { direction, bearing, nextTurnDistance };
    };

    // Helper function to calculate bearing between two points
    const calculateBearing = (point1: [number, number], point2: [number, number]): number => {
        const toRad = (degrees: number) => degrees * (Math.PI / 180);
        const toDeg = (radians: number) => radians * (180 / Math.PI);
        
        const dLon = toRad(point2[0] - point1[0]);
        const lat1 = toRad(point1[1]);
        const lat2 = toRad(point2[1]);
        
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        
        let bearing = toDeg(Math.atan2(y, x));
        bearing = (bearing + 360) % 360; // Normalize to 0-360
        
        return bearing;
    };

    // Helper to improve instruction text - convert east/west to left/right using real-time polyline analysis
    // const improveInstructionText = (instruction: string, maneuverType: string | undefined, step?: any): string => {
    //     if (!instruction || typeof instruction !== 'string') return 'Continue ahead';
    //     if (!maneuverType) maneuverType = 'straight';
        
    //     let improvedInstruction = instruction;
        
    //     // Use real-time polyline analysis if we have location and route
    //     if (location && navigationRoute?.geometry?.coordinates) {
    //         const polylineDirection = analyzePolylineDirection(location, navigationRoute.geometry.coordinates);
            
    //         console.log('🗺️ Real-time Polyline Direction:', polylineDirection);
            
    //         // Override instruction based on real-time polyline analysis
    //         switch (polylineDirection.direction) {
    //             case 'left':
    //                 improvedInstruction = improvedInstruction
    //                     .replace(/drive (north|south|east|west)/gi, 'turn left')
    //                     .replace(/turn (north|south|east|west)/gi, 'turn left')
    //                     .replace(/head (north|south|east|west)/gi, 'turn left')
    //                     .replace(/(north|south|east|west)/gi, 'left');
    //                 break;
    //             case 'right':
    //                 improvedInstruction = improvedInstruction
    //                     .replace(/drive (north|south|east|west)/gi, 'turn right')
    //                     .replace(/turn (north|south|east|west)/gi, 'turn right')
    //                     .replace(/head (north|south|east|west)/gi, 'turn right')
    //                     .replace(/(north|south|east|west)/gi, 'right');
    //                 break;
    //             case 'sharp-left':
    //                 improvedInstruction = improvedInstruction
    //                     .replace(/drive (north|south|east|west)/gi, 'sharp left turn')
    //                     .replace(/turn (north|south|east|west)/gi, 'sharp left turn')
    //                     .replace(/(north|south|east|west)/gi, 'sharp left');
    //                 break;
    //             case 'sharp-right':
    //                 improvedInstruction = improvedInstruction
    //                     .replace(/drive (north|south|east|west)/gi, 'sharp right turn')
    //                     .replace(/turn (north|south|east|west)/gi, 'sharp right turn')
    //                     .replace(/(north|south|east|west)/gi, 'sharp right');
    //                 break;
    //             case 'slight-left':
    //                 improvedInstruction = improvedInstruction
    //                     .replace(/drive (north|south|east|west)/gi, 'keep left')
    //                     .replace(/turn (north|south|east|west)/gi, 'keep left')
    //                     .replace(/(north|south|east|west)/gi, 'slight left');
    //                 break;
    //             case 'slight-right':
    //                 improvedInstruction = improvedInstruction
    //                     .replace(/drive (north|south|east|west)/gi, 'keep right')
    //                     .replace(/turn (north|south|east|west)/gi, 'keep right')
    //                     .replace(/(north|south|east|west)/gi, 'slight right');
    //                 break;
    //             case 'u-turn':
    //                 improvedInstruction = 'Make a U-turn';
    //                 break;
    //             default:
    //                 improvedInstruction = improvedInstruction
    //                     .replace(/drive (north|south|east|west)/gi, 'continue straight')
    //                     .replace(/turn (north|south|east|west)/gi, 'continue straight')
    //                     .replace(/head (north|south|east|west)/gi, 'continue straight')
    //                     .replace(/(north|south|east|west)/gi, 'straight');
    //         }
    //     } else if (step?.maneuver?.bearing_before !== undefined && step?.maneuver?.bearing_after !== undefined) {
    //         // Fallback to bearing-based analysis
    //         const bearingBefore = step.maneuver.bearing_before;
    //         const bearingAfter = step.maneuver.bearing_after;
    //         const bearingDiff = (bearingAfter - bearingBefore + 360) % 360;
            
    //         console.log('🧮 Bearing Calculation:', {
    //             bearingBefore,
    //             bearingAfter,
    //             bearingDiff,
    //             originalInstruction: instruction
    //         });
            
    //         // Determine turn direction based on bearing change
    //         if (bearingDiff > 15 && bearingDiff < 180) {
    //             // Right turn
    //             console.log('➡️ Detected RIGHT turn');
    //             improvedInstruction = improvedInstruction
    //                 .replace(/drive (north|south|east|west)/gi, 'turn right')
    //                 .replace(/turn (north|south|east|west)/gi, 'turn right')
    //                 .replace(/head (north|south|east|west)/gi, 'turn right')
    //                 .replace(/bear (north|south|east|west)/gi, 'keep right')
    //                 .replace(/(north|south|east|west)/gi, 'right');
    //         } else if (bearingDiff > 180 && bearingDiff < 345) {
    //             // Left turn
    //             console.log('⬅️ Detected LEFT turn');
    //             improvedInstruction = improvedInstruction
    //                 .replace(/drive (north|south|east|west)/gi, 'turn left')
    //                 .replace(/turn (north|south|east|west)/gi, 'turn left')
    //                 .replace(/head (north|south|east|west)/gi, 'turn left')
    //                 .replace(/bear (north|south|east|west)/gi, 'keep left')
    //                 .replace(/(north|south|east|west)/gi, 'left');
    //         } else {
    //             // Straight
    //             console.log('⬆️ Detected STRAIGHT');
    //             improvedInstruction = improvedInstruction
    //                 .replace(/drive (north|south|east|west)/gi, 'continue straight')
    //                 .replace(/turn (north|south|east|west)/gi, 'continue straight')
    //                 .replace(/head (north|south|east|west)/gi, 'continue straight')
    //                 .replace(/bear (north|south|east|west)/gi, 'continue straight')
    //                 .replace(/(north|south|east|west)/gi, 'straight');
    //         }
    //     } else {
    //         // Fallback to maneuver type matching
    //         const patterns = [
    //             { from: /drive (north|south|east|west)/gi, replacement: () => {
    //                 if (maneuverType.includes('left')) return 'turn left';
    //                 if (maneuverType.includes('right')) return 'turn right';
    //                 return 'continue straight';
    //             }},
    //             { from: /turn (north|south|east|west)/gi, replacement: () => {
    //                 if (maneuverType.includes('left')) return 'turn left';
    //                 if (maneuverType.includes('right')) return 'turn right';
    //                 return 'continue straight';
    //             }},
    //             { from: /head (north|south|east|west)/gi, replacement: 'continue straight' },
    //             { from: /continue (north|south|east|west)/gi, replacement: 'continue straight' },
    //             { from: /bear (north|south|east|west)/gi, replacement: () => {
    //                 if (maneuverType.includes('left')) return 'keep left';
    //                 if (maneuverType.includes('right')) return 'keep right';
    //                 return 'continue straight';
    //             }},
    //             { from: /(north|south|east|west)/gi, replacement: () => {
    //                 if (maneuverType.includes('left')) return 'left';
    //                 if (maneuverType.includes('right')) return 'right';
    //                 return 'straight';
    //             }},
    //         ];

    //         patterns.forEach(pattern => {
    //             if (typeof pattern.replacement === 'function') {
    //                 improvedInstruction = improvedInstruction.replace(pattern.from, pattern.replacement);
    //             } else {
    //                 improvedInstruction = improvedInstruction.replace(pattern.from, pattern.replacement);
    //             }
    //         });
    //     }

    //     // Clean up text
    //     improvedInstruction = improvedInstruction
    //         .replace(/in \d+(\.\d+)? (meters|m)/gi, '') // Remove distance from instruction
    //         .replace(/\s+/g, ' ') // Clean up extra spaces
    //         .trim();

    //     return improvedInstruction;
    // };

    // Helper to get Google Maps style maneuver icon with real-time polyline analysis
    const getTurnIcon = (maneuverType: string | undefined, step?: any) => {
      // Use real-time polyline analysis if available
      if (location && navigationRoute?.geometry?.coordinates) {
        const polylineDirection = analyzePolylineDirection(location, navigationRoute.geometry.coordinates);
        
        console.log('🎯 Real-time Icon Selection:', polylineDirection.direction);
        
        // Select icon based on real-time polyline analysis
        switch (polylineDirection.direction) {
          case 'left':
            return <MaterialCommunityIcons name="arrow-left-bold" size={36} color="#fff" />;
          case 'right':
            return <MaterialCommunityIcons name="arrow-right-bold" size={36} color="#fff" />;
          case 'sharp-left':
            return <MaterialCommunityIcons name="arrow-up-left-bold" size={36} color="#fff" />;
          case 'sharp-right':
            return <MaterialCommunityIcons name="arrow-up-right-bold" size={36} color="#fff" />;
          case 'slight-left':
            return <MaterialCommunityIcons name="arrow-up-left" size={36} color="#fff" />;
          case 'slight-right':
            return <MaterialCommunityIcons name="arrow-up-right" size={36} color="#fff" />;
          case 'u-turn':
            return <MaterialCommunityIcons name="backup-restore" size={36} color="#fff" />;
          case 'straight':
          default:
            return <MaterialCommunityIcons name="arrow-up-bold" size={36} color="#fff" />;
        }
      }
      
      if (!maneuverType) return <MaterialCommunityIcons name="arrow-up-bold" size={36} color="#fff" />;
      
      // If we have bearing information, use it to determine actual turn direction
      if (step?.maneuver?.bearing_before !== undefined && step?.maneuver?.bearing_after !== undefined) {
        const bearingBefore = step.maneuver.bearing_before;
        const bearingAfter = step.maneuver.bearing_after;
        const bearingDiff = (bearingAfter - bearingBefore + 360) % 360;
        
        console.log('📍 Icon Bearing Calculation:', {
          bearingBefore,
          bearingAfter,
          bearingDiff
        });
        
        // Determine icon based on bearing change
        if (bearingDiff > 315 || bearingDiff < 45) {
          console.log('🟢 Selected STRAIGHT icon');
          return <MaterialCommunityIcons name="arrow-up-bold" size={36} color="#fff" />; // Straight
        } else if (bearingDiff >= 45 && bearingDiff < 135) {
          console.log('🔴 Selected RIGHT icon');
          return <MaterialCommunityIcons name="arrow-right-bold" size={36} color="#fff" />; // Right turn
        } else if (bearingDiff >= 135 && bearingDiff < 225) {
          console.log('🟡 Selected U-TURN icon');
          return <MaterialCommunityIcons name="backup-restore" size={36} color="#fff" />; // U-turn
        } else if (bearingDiff >= 225 && bearingDiff < 315) {
          console.log('🔵 Selected LEFT icon');
          return <MaterialCommunityIcons name="arrow-left-bold" size={36} color="#fff" />; // Left turn
        }
      }
      
      // Fallback to maneuver type matching
      switch (maneuverType.toLowerCase()) {
        case 'turn-left':
        case 'left':
        case 'turn left':
          return <MaterialCommunityIcons name="arrow-left-bold" size={36} color="#fff" />;
        case 'turn-right':
        case 'right':
        case 'turn right':
          return <MaterialCommunityIcons name="arrow-right-bold" size={36} color="#fff" />;
        case 'straight':
        case 'continue':
        case 'depart':
          return <MaterialCommunityIcons name="arrow-up-bold" size={36} color="#fff" />;
        case 'uturn':
        case 'u-turn':
          return <MaterialCommunityIcons name="backup-restore" size={36} color="#fff" />;
        case 'sharp-left':
          return <MaterialCommunityIcons name="arrow-up-left-bold" size={36} color="#fff" />;
        case 'sharp-right':
          return <MaterialCommunityIcons name="arrow-up-right-bold" size={36} color="#fff" />;
        case 'slight-left':
          return <MaterialCommunityIcons name="arrow-up-left" size={36} color="#fff" />;
        case 'slight-right':
          return <MaterialCommunityIcons name="arrow-up-right" size={36} color="#fff" />;
        case 'roundabout':
        case 'roundabout-left':
        case 'roundabout-right':
        case 'roundabout-straight':
        case 'rotary':
          return <MaterialCommunityIcons name="rotate-360" size={36} color="#fff" />;
        case 'merge':
          return <MaterialCommunityIcons name="merge" size={36} color="#fff" />;
        case 'fork':
          return <MaterialCommunityIcons name="source-fork" size={36} color="#fff" />;
        case 'ramp':
        case 'on-ramp':
        case 'off-ramp':
          return <MaterialCommunityIcons name="highway" size={36} color="#fff" />;
        case 'arrive':
        case 'destination':
          return <MaterialCommunityIcons name="flag-checkered" size={36} color="#fff" />;
        case 'exit':
          return <MaterialCommunityIcons name="exit-to-app" size={36} color="#fff" />;
        default:
          return <MaterialCommunityIcons name="arrow-up-bold" size={36} color="#fff" />;
      }
    };

    // --- Start Navigation ---
    const handleStartNavigation = async () => {
        // Prevent multiple calls
        if (navigationMode === 'active') {
            console.log('⚠️ Navigation already active, ignoring duplicate call');
            return;
        }

        // Check if we have a valid route
        if (!navigationRoute) {
            console.error('❌ No navigation route available');
            Alert.alert('Navigation Error', 'No route available for navigation');
            return;
        }

        // Check if we have current location
        if (!location) {
            console.error('❌ No current location available');
            Alert.alert('Location Error', 'Current location is required for navigation');
            return;
        }
        
        console.log('🚀 Starting navigation...');
        setNavigationMode('active');
        
        if (location) {
            setNavigationStartLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                heading: location.coords.heading,
            });
        }
        
        startNavigationUpdates();
        
        // High-precision location tracking is handled by the existing startNavigationUpdates()
        // which is already called above. No need for additional tracking service.
        console.log('✅ Navigation location tracking started via LocationContext');
        
        // Focus on entire route when navigation starts (like Google Maps)
        if (navigationRoute && mapRef.current) {
            console.log('🎯 Focusing on entire route for navigation start');
            
            // Get route coordinates for bounds calculation
            const routeCoords = navigationRoute.geometry.coordinates;
            if (routeCoords && routeCoords.length > 0) {
                // Fit the entire route with proper padding
                mapRef.current.fitRouteBounds(routeCoords, 120); // 120px padding around route
                
                // After fitting route, gradually focus on user position for navigation
                const currentLocation = location;
                setTimeout(() => {
                    if (currentLocation && mapRef.current) {
                        console.log('🎯 Transitioning to user focus for active navigation');
                        mapRef.current.animateToLocation(
                            currentLocation.coords.longitude,
                            currentLocation.coords.latitude,
                            16 // Navigation zoom level after route overview
                        );
                    }
                }, 3000); // 3 seconds to view full route, then focus on user
            }
        }
    };

    // --- Stop Navigation ---
    const handleStopNavigation = () => {
        console.log('🛑 Stopping navigation...');
        setNavigationMode(null);
        setNavigationRoute(null);
        setSmoothNavigationRoute(null);
        setNavigationDestination(null);
        setRoutes([]); // Clear routes array
        setSelectedRouteIndex(0);
        stopNavigationUpdates();
        
        console.log('✅ Navigation state cleared and location tracking stopped via LocationContext');
        
        // Reset map to normal view
        if (location && mapRef.current) {
            mapRef.current.animateToLocation(
                location.coords.longitude,
                location.coords.latitude,
                // 15 // Normal zoom
            );
        }
    };

    // Enhanced: Live tracking during navigation
    useEffect(() => {
        if (navigationMode === 'active' && location && mapRef.current) {
            // Real-time camera updates during navigation
            // mapRef.current.animateToLocation(
            //     location.coords.longitude,
            //     location.coords.latitude,
            //     16 // Moderate zoom for navigation
            // );
        }
    }, [location, navigationMode]);

    // Ensure map camera always follows user in real-time during navigation
    useEffect(() => {
      if (navigationMode === 'active' && location && mapRef.current) {
        // mapRef.current.animateToLocation(
        //   location.coords.longitude,
        //   location.coords.latitude,
        //   21 // or your preferred zoom
        // );
      }
    }, [location, navigationMode]);

    // Zoom to user location
    const handleZoomToUser = () => {
        // This would be handled by exposing the map ref from PatrolMapView
        if (location && mapRef.current) {
            mapRef.current.animateToLocation(
                location.coords.longitude,
                location.coords.latitude,
                // 15
            );
        }
    };

    // Handle reporting a new patrol
    const handleReportPatrol = () => {
        router.push('/report');
    };

    // Helper functions for formatting
    const formatDurationBig = (durationSec: number) => {
        const minutes = Math.round(durationSec / 60);
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours} hr${hours > 1 ? 's' : ''} ${mins > 0 ? `${mins} min` : ''}`.trim();
        }
        return `${minutes} min`;
    };

    const formatDistance = (distance: number) => {
        if (distance >= 1000) {
            return `${(distance / 1000).toFixed(1)} km`;
        }
        return `${Math.round(distance)} m`;
    };

    const getArrivalTime = (durationSec: number) => {
        const now = new Date();
        const arrival = new Date(now.getTime() + durationSec * 1000);
        let hours = arrival.getHours();
        const minutes = arrival.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    };

    // Add a static patrol for Indore
    const staticIndorePatrol = {
      id: 'static-indore',
      type: 'general',
      location: { latitude: 22.7196, longitude: 75.8577 },
      timestamp: Date.now(),
      confirmedCount: 5,
      deniedCount: 0,
      probability: 0.9,
    };
    // Add a static patrol ~4km east of user's location for testing
    const staticTestPatrol = {
      id: 'static-test-4km',
      type: 'general',
      location: { latitude: 22.7663386, longitude: 75.9203336 }, // ~4km east
      timestamp: Date.now(),
      confirmedCount: 2,
      deniedCount: 1,
      probability: 0.7,
    };
    // In MapScreenContent, merge static patrols with patrols
    const allPatrols = [staticIndorePatrol, staticTestPatrol, ...patrols]; // keep static for dev, or just use patrols

    // --- Off-route detection and recalc ---
    useEffect(() => {
        if (
            navigationMode === 'active' &&
            location &&
            navigationRoute &&
            navigationDestination &&
            navigationDestination.center &&
            Array.isArray(navigationDestination.center) &&
            navigationDestination.center.length === 2
        ) {
            // Find the minimum distance from user to any point on the route
            const userLat = location.coords.latitude;
            const userLng = location.coords.longitude;
            const routeCoords = navigationRoute.geometry.coordinates;
            let minDist = Infinity;
            for (let i = 0; i < routeCoords.length; i++) {
                const [lng, lat] = routeCoords[i];
                const dist = getDistance(userLat, userLng, lat, lng);
                if (dist < minDist) minDist = dist;
            }
            // If user is more than 30 meters off the route, recalculate
            if (minDist > 30) {
                (async () => {
                    try {
                        const fetchedRoutes = await directionsService.getDirectionsWithAlternatives(
                            { latitude: userLat, longitude: userLng },
                            { latitude: navigationDestination.center[1], longitude: navigationDestination.center[0] }
                        );
                        if (fetchedRoutes && fetchedRoutes.length > 0) {
                            setRoutes(fetchedRoutes);
                            setSelectedRouteIndex(0);
                            const route = fetchedRoutes[0];
                            setNavigationRoute(route);
                            const smoothCoordinates = createSmoothCurve(route.geometry.coordinates, 0.25);
                            const smoothRoute = {
                                ...route,
                                geometry: {
                                    coordinates: smoothCoordinates
                                }
                            };
                            setSmoothNavigationRoute(smoothRoute);
                        }
                    } catch (e) {
                        // Optionally show an alert or log
                    }
                })();
            }
        }
    }, [location, navigationMode, navigationRoute, navigationDestination]);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <StatusBar style="auto" />

            {/* Main Map with all overlays */}
            <PatrolMapView
                ref={mapRef}
                location={location}
                patrols={allPatrols}
                mapType={mapType}
                onPatrolSelect={setSelectedPatrol}
                navigationRoute={navigationRoute}
                navigationMode={navigationMode}
                navigationDestination={navigationDestination}
                routes={routes}
                selectedRouteIndex={selectedRouteIndex}
                onRouteSelect={handleRouteSelect}
                navigationStartLocation={navigationStartLocation}
                compassHeading={compassHeading}
                nearbyPlaces={nearbyPlaces}
                onPlaceSelect={handlePlaceSelect}
            />

            {/* Navigation UI overlays (not a map, just UI) */}
            {navigationMode && smoothNavigationRoute && (
                <>
                    {/* Preview Mode: Show Start Navigation button */}
                    {navigationMode === 'preview' && (
                        <View style={{ position: 'absolute', bottom: 1, width: '100%', alignItems: 'center', zIndex: 1002 }}>
                            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8, width: '100%' }}>
                                <TouchableOpacity
                                    onPress={handleStopNavigation}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 20,
                                        zIndex: 1000,
                                        backgroundColor: '#fff',
                                        borderRadius: 20,
                                        padding: 4,
                                    }}
                                >
                                    <Text style={{ fontSize: 25, color: '#222', fontWeight: '700' }}>✕</Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>{navigationDestination?.place_name}</Text>
                                <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                                    {navigationRoute ? `${(navigationRoute.distance / 1000).toFixed(1)} km • ${Math.round(navigationRoute.duration / 60)} min` : ''}
                                </Text>
                                <TouchableOpacity onPress={handleStartNavigation} style={{ backgroundColor: '#0066CC', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 }}>
                                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Start Navigation</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {/* Active Navigation Mode: Show turn-by-turn UI */}
                    {navigationMode === 'active' && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1002, pointerEvents: 'box-none' }} pointerEvents="box-none">
                            {/* Top turn card with Google Maps style icon */}
                            {/* {navigationRoute?.steps?.[0] && (
                                <View style={{ position: 'absolute', top: 40, left: 20, right: 20, backgroundColor: '#00897B', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, zIndex: 10 }}>
                                    <View style={{
                                        width: 48, height: 48, borderRadius: 24, backgroundColor: '#00897B',
                                        justifyContent: 'center', alignItems: 'center', marginRight: 16,
                                    }}>
                                        {(() => {
                                            const step = navigationRoute?.steps?.[0];
                                            console.log('🔍 Navigation Step Data:', {
                                                maneuver: step?.maneuver,
                                                instruction: step?.instruction,
                                                bearingBefore: step?.maneuver?.bearing_before,
                                                bearingAfter: step?.maneuver?.bearing_after,
                                                type: step?.maneuver?.type
                                            });
                                            return getTurnIcon(step?.maneuver?.type || '', step);
                                        })()}
                                       
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>
                                            {navigationRoute?.steps?.[0]?.distance ? Math.round(navigationRoute.steps[0].distance) : 0} m
                                        </Text>
                                        <Text style={{ fontSize: 16, color: '#fff', marginTop: 2 }}>
                                            {(() => {
                                                const step = navigationRoute?.steps?.[0];
                                                const originalInstruction = step?.instruction;
                                                const improvedInstruction = originalInstruction ? 
                                                    improveInstructionText(originalInstruction, step?.maneuver?.type || '', step) 
                                                    : 'Continue ahead';
                                                console.log('📝 Instruction Processing:', {
                                                    original: originalInstruction,
                                                    improved: improvedInstruction,
                                                    maneuverType: step?.maneuver?.type
                                                });
                                                return improvedInstruction;
                                            })()}
                                        </Text>
                                    </View>
                                </View>
                            )} */}
                            {/* Google Maps style bottom summary bar */}
                            <View style={{ position: 'absolute', bottom: 1, left: 10, right: 10, backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8, zIndex: 10 }}>
                                {/* Cancel button */}
                                <TouchableOpacity onPress={handleStopNavigation} style={{ padding: 8 }}>
                                    <Text style={{ fontSize: 28, color: '#222' }}>✕</Text>
                                </TouchableOpacity>
                                {/* Center: Time, distance, arrival */}
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 22, fontWeight: '700', color: '#228B22' }}>
                                            {navigationRoute ? formatDurationBig(navigationRoute.duration) : '0 min'}
                                        </Text>
                                        <Text style={{ fontSize: 22, marginLeft: 4, color: '#228B22' }}>🌿</Text>
                                    </View>
                                    <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                                        {navigationRoute ? `${formatDistance(navigationRoute.distance)} • ${getArrivalTime(navigationRoute.duration)}` : ''}
                                    </Text>
                                </View>
                                {/* Direction icon */}
                                <View style={{ padding: 8 }}>
                                    <Text style={{ fontSize: 28, color: '#222' }}>🧭</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </>
            )}

            <MapOverlays
                topInset={insets.top}
                bottomInset={insets.bottom}
                hasLocation={!!location}
                connected={connected}
                mapType={mapType}
                showTraffic={showTraffic}
                onSearch={handleSearch}
                onZoomToUser={handleZoomToUser}
                onRefresh={() => searchNearbyPlaces()} // Refresh places
                onLayerChange={handleLayerChange}
                onReportPatrol={handleReportPatrol}
                showSearchBar={navigationMode !== 'active'}
                onPlacesToggle={() => setShowPlaceCategories(!showPlaceCategories)}
            />

            {/* Search Results Dropdown */}
            {showSearchResults && searchText.length > 2 && navigationMode === null && (
                <View style={{ position: 'absolute', top: insets.top + 66, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 12, zIndex: 2000, maxHeight: 250, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 }}>
                    {searchLoading ? (
                        <ActivityIndicator style={{ margin: 16 }} />
                    ) : (
                        <FlatList
                            data={searchResults}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => handleSearchResultSelect(item)} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                                    <Text style={{ fontSize: 16 }}>{item.place_name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            )}

            {/* Place Categories */}
            <PlaceCategories
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
                onCategoryPress={handleCategoryPress}
                isVisible={showPlaceCategories && navigationMode !== 'active'}
            />

            {/* Compact Place Categories in search */}
            {showSearchResults && searchText.length < 3 && navigationMode === null && (
                <View style={{ position: 'absolute', top: insets.top + 66, left: 20, right: 20, zIndex: 1999 }}>
                    <CompactPlaceCategories
                        onCategoryPress={handleCategoryPress}
                        isVisible={true}
                    />
                </View>
            )}

            {/* Navigation Instructions (active navigation bar) */}
            <NavigationInstructions />
            
            {/* Patrol Details Modal */}
            <PatrolDetailsModal
                patrol={selectedPatrol}
                visible={!!selectedPatrol && !selectedPlace}
                onClose={() => setSelectedPatrol(null)}
                userLocation={location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : null}
            />

            {/* Place Details Modal */}
            <PlaceDetailsModal
                place={selectedPlace}
                visible={!!selectedPlace}
                onClose={() => setSelectedPlace(null)}
                onNavigate={handlePlaceNavigation}
                userLocation={location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : null}
            />
        </View>
    );
}

export default function MapScreen() {
    return (
        <PatrolProvider>
            <MapScreenContent />
        </PatrolProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        
    },
});