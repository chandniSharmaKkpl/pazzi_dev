import { Alert } from 'react-native';

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface RouteStep {
    instruction: string;
    distance: number;
    duration: number;
    maneuver: {
        type: string;
        instruction: string;
        bearing_before: number;
        bearing_after: number;
    };
}

interface Route {
    distance: number;
    duration: number;
    steps: RouteStep[];
    geometry: {
        coordinates: [number, number][];
    };
}

interface DirectionsResponse {
    routes: Route[];
    code: string;
    message?: string;
}

class DirectionsService {
    private accessToken: string = 'pk.eyJ1IjoibWlraWpha292IiwiYSI6ImNtYjlscWc3YzB6N2Iya3M2cmQxY2Y5eWEifQ.u_y6rM-a77gBQBhZJ8KkNw';
    private baseUrl: string = 'https://api.mapbox.com/directions/v5/mapbox/driving';

    // Fallback coordinates for testing (Indore to Ujjain)
    private fallbackOrigin: Coordinates = { latitude: 22.7196, longitude: 75.8577 }; // Indore
    private fallbackDestination: Coordinates = { latitude: 23.1793, longitude: 75.7849 }; // Ujjain

    async getDirections(
        origin: Coordinates,
        destination: Coordinates,
        alternatives: boolean = false
    ): Promise<Route | null> {
        if (alternatives) {
            const routes = await this.getDirectionsWithAlternatives(origin, destination);
            return routes && routes.length > 0 ? routes[0] : null;
        }
        try {
            const originStr = `${origin.longitude},${origin.latitude}`;
            const destStr = `${destination.longitude},${destination.latitude}`;
            
            const url = `${this.baseUrl}/${originStr};${destStr}?access_token=${this.accessToken}&alternatives=${alternatives}&geometries=geojson&overview=full&steps=true`;

            console.log('🗺️ Fetching directions from Mapbox...');
            console.log('📍 Origin:', origin);
            console.log('🎯 Destination:', destination);
            
            const response = await fetch(url);
            const data: any = await response.json(); // Use any to handle Mapbox response

            console.log('📡 API Response:', data);

            if (data.code !== 'Ok') {
                console.error('❌ Directions API error:', data.message);
                
                // If distance limitation error, try with fallback coordinates
                if (data.message?.includes('distance limitation')) {
                    console.log('🔄 Trying with fallback coordinates...');
                    const fallbackRoute = await this.getDirectionsWithFallback();
                    if (fallbackRoute) return fallbackRoute;
                }
                
                // If all else fails, return mock route
                console.log('🔄 Using mock route...');
                return this.getMockRoute();
            }

            if (!data.routes || data.routes.length === 0) {
                console.error('❌ No routes found');
                return this.getMockRoute();
            }

            const apiRoute = data.routes[0]; // Mapbox route
            const steps = apiRoute.legs && apiRoute.legs[0] && apiRoute.legs[0].steps
                ? apiRoute.legs[0].steps.map((step: any) => ({
                    instruction: this.improveInstructionText(step.maneuver.instruction, step.maneuver.type),
                    distance: step.distance,
                    duration: step.duration,
                    maneuver: {
                        type: step.maneuver.type,
                        instruction: this.improveInstructionText(step.maneuver.instruction, step.maneuver.type),
                        bearing_before: step.maneuver.bearing_before,
                        bearing_after: step.maneuver.bearing_after,
                    }
                }))
                : [];

            const route: Route = {
                distance: apiRoute.distance,
                duration: apiRoute.duration,
                steps,
                geometry: apiRoute.geometry
            };

            console.log('✅ Route found:', {
                distance: (route.distance / 1000).toFixed(1) + ' km',
                duration: Math.round(route.duration / 60) + ' min',
                steps: route.steps.length
            });

            return route;
        } catch (error) {
            console.error('❌ Directions service error:', error);
            console.log('🔄 Using mock route due to error...');
            return this.getMockRoute();
        }
    }

    /**
     * Fetch all route alternatives from Mapbox Directions API
     */
    async getDirectionsWithAlternatives(
        origin: Coordinates,
        destination: Coordinates
    ): Promise<Route[]> {
        try {
            const originStr = `${origin.longitude},${origin.latitude}`;
            const destStr = `${destination.longitude},${destination.latitude}`;
            const url = `${this.baseUrl}/${originStr};${destStr}?access_token=${this.accessToken}&alternatives=true&geometries=geojson&overview=full&steps=true`;
            console.log('🗺️ Fetching directions with alternatives from Mapbox...');
            const response = await fetch(url);
            const data: any = await response.json();
            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                console.error('❌ Directions API error:', data.message);
                return [];
            }
            // Map all routes to Route objects
            return data.routes.map((apiRoute: any) => {
                const steps = apiRoute.legs && apiRoute.legs[0] && apiRoute.legs[0].steps
                    ? apiRoute.legs[0].steps.map((step: any) => ({
                        instruction: this.improveInstructionText(step.maneuver.instruction, step.maneuver.type),
                        distance: step.distance,
                        duration: step.duration,
                        maneuver: {
                            type: step.maneuver.type,
                            instruction: this.improveInstructionText(step.maneuver.instruction, step.maneuver.type),
                            bearing_before: step.maneuver.bearing_before,
                            bearing_after: step.maneuver.bearing_after,
                        }
                    }))
                    : [];
                return {
                    distance: apiRoute.distance,
                    duration: apiRoute.duration,
                    steps,
                    geometry: apiRoute.geometry
                };
            });
        } catch (error) {
            console.error('❌ Directions alternatives error:', error);
            return [];
        }
    }

    private async getDirectionsWithFallback(): Promise<Route | null> {
        try {
            const originStr = `${this.fallbackOrigin.longitude},${this.fallbackOrigin.latitude}`;
            const destStr = `${this.fallbackDestination.longitude},${this.fallbackDestination.latitude}`;
            
            const url = `${this.baseUrl}/${originStr};${destStr}?access_token=${this.accessToken}&alternatives=false&geometries=geojson&overview=full&steps=true`;

            console.log('🔄 Fetching fallback directions...');
            console.log('🔄 Fallback URL:', url);
            
            const response = await fetch(url);
            const data: any = await response.json();

            console.log('🔄 Fallback API Response:', data);

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const apiRoute = data.routes[0];
                const steps = apiRoute.legs && apiRoute.legs[0] && apiRoute.legs[0].steps
                    ? apiRoute.legs[0].steps.map((step: any) => ({
                        instruction: this.improveInstructionText(step.maneuver.instruction, step.maneuver.type),
                        distance: step.distance,
                        duration: step.duration,
                        maneuver: {
                            type: step.maneuver.type,
                            instruction: this.improveInstructionText(step.maneuver.instruction, step.maneuver.type),
                            bearing_before: step.maneuver.bearing_before,
                            bearing_after: step.maneuver.bearing_after,
                        }
                    }))
                    : [];

                const route: Route = {
                    distance: apiRoute.distance,
                    duration: apiRoute.duration,
                    steps,
                    geometry: apiRoute.geometry
                };

                console.log('✅ Fallback route found:', {
                    distance: (route.distance / 1000).toFixed(1) + ' km',
                    duration: Math.round(route.duration / 60) + ' min',
                    steps: route.steps.length
                });

                Alert.alert(
                    'Demo Mode',
                    'Showing demo navigation route (Indore to Ujjain)',
                    [{ text: 'OK' }]
                );

                return route;
            } else {
                console.error('❌ Fallback route failed:', data.message || 'Unknown error');
                return null;
            }

        } catch (error) {
            console.error('❌ Fallback directions error:', error);
            return null;
        }
    }

    private getMockRoute(): Route {
        console.log('🎭 Creating mock route...');
        Alert.alert(
            'Demo Mode',
            'Showing mock navigation route for demonstration',
            [{ text: 'OK' }]
        );
        return {
            distance: 55000, // 55 km
            duration: 3600, // 1 hour
            steps: [
                {
                    instruction: "Head north on MG Road",
                    distance: 10000,
                    duration: 900,
                    maneuver: {
                        type: "straight",
                        instruction: "Continue straight",
                        bearing_before: 0,
                        bearing_after: 0
                    }
                },
                {
                    instruction: "Turn right onto AB Road",
                    distance: 20000,
                    duration: 1200,
                    maneuver: {
                        type: "turn-right",
                        instruction: "Turn right",
                        bearing_before: 0,
                        bearing_after: 90
                    }
                },
                {
                    instruction: "Continue straight towards Ujjain",
                    distance: 20000,
                    duration: 1200,
                    maneuver: {
                        type: "straight",
                        instruction: "Continue straight",
                        bearing_before: 90,
                        bearing_after: 90
                    }
                },
                {
                    instruction: "You have arrived at your destination (Ujjain)",
                    distance: 5000,
                    duration: 300,
                    maneuver: {
                        type: "arrive",
                        instruction: "You have arrived",
                        bearing_before: 90,
                        bearing_after: 90
                    }
                }
            ],
            geometry: {
                coordinates: [
                    [75.8577, 22.7196],
                    [75.7849, 23.1793]
                ]
            }
        };
    }

    formatStep(step: RouteStep): string {
        const distance = step.distance > 1000 
            ? `${(step.distance / 1000).toFixed(1)} km`
            : `${Math.round(step.distance)} m`;

        const duration = Math.round(step.duration / 60);
        const timeText = duration > 0 ? ` (${duration} min)` : '';

        return `${step.instruction} - ${distance}${timeText}`;
    }

    getManeuverIcon(maneuverType: string): string {
        switch (maneuverType) {
            case 'turn':
                return '🔄';
            case 'turn-left':
                return '⬅️';
            case 'turn-right':
                return '➡️';
            case 'straight':
                return '⬆️';
            case 'slight-left':
                return '↖️';
            case 'slight-right':
                return '↗️';
            case 'sharp-left':
                return '↙️';
            case 'sharp-right':
                return '↘️';
            case 'uturn':
                return '🔄';
            case 'merge':
                return '🔀';
            case 'exit':
                return '🚪';
            case 'arrive':
                return '🎯';
            default:
                return '📍';
        }
    }

    calculateBearing(from: Coordinates, to: Coordinates): number {
        const toRadians = (degrees: number) => degrees * (Math.PI / 180);
        const toDegrees = (radians: number) => radians * (180 / Math.PI);

        const lat1 = toRadians(from.latitude);
        const lat2 = toRadians(to.latitude);
        const deltaLon = toRadians(to.longitude - from.longitude);

        const y = Math.sin(deltaLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

        let bearing = toDegrees(Math.atan2(y, x));
        bearing = (bearing + 360) % 360;

        return bearing;
    }

    getDirectionText(bearing: number): string {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    }

    improveInstructionText(instruction: string, maneuverType: string): string {
        // Replace compass directions with left/right based on maneuver type
        let improvedInstruction = instruction;
        
        // Replace common patterns
        const patterns = [
            { from: /turn (north|south|east|west)/gi, to: () => {
                if (maneuverType.includes('left')) return 'turn left';
                if (maneuverType.includes('right')) return 'turn right';
                return 'continue straight';
            }},
            { from: /head (north|south|east|west)/gi, to: 'continue straight' },
            { from: /continue (north|south|east|west)/gi, to: 'continue straight' },
            { from: /bear (north|south|east|west)/gi, to: () => {
                if (maneuverType.includes('left')) return 'keep left';
                if (maneuverType.includes('right')) return 'keep right';
                return 'continue straight';
            }},
        ];

        patterns.forEach(pattern => {
            improvedInstruction = improvedInstruction.replace(pattern.from, pattern.to as any);
        });

        // Make instruction more user-friendly
        improvedInstruction = improvedInstruction
            .replace(/in \d+(\.\d+)? (meters|m)/gi, '') // Remove distance from instruction text
            .replace(/\s+/g, ' ') // Clean up extra spaces
            .trim();

        return improvedInstruction;
    }
}

export const directionsService = new DirectionsService();
export default directionsService; 