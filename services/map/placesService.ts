// Places service for finding nearby locations using Mapbox Places API
const MAPBOX_TOKEN = 'pk.eyJ1IjoibWlraWpha292IiwiYSI6ImNtYjlscWc3YzB6N2Iya3M2cmQxY2Y5eWEifQ.u_y6rM-a77gBQBhZJ8KkNw';

export interface Place {
  id: string;
  name: string;
  category: string;
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
  phone?: string;
  rating?: number;
  distance?: number; // in meters
  icon: string;
  description?: string;
}

export interface PlaceCategory {
  id: string;
  name: string;
  icon: string;
  mapboxCategory: string;
  color: string;
}

// Define place categories with Mapbox categories
export const PLACE_CATEGORIES: PlaceCategory[] = [
  {
    id: 'restaurants',
    name: 'Restaurants',
    icon: 'restaurant',
    mapboxCategory: 'restaurant,food,cafe',
    color: '#FF5722'
  },
  {
    id: 'hospitals',
    name: 'Hospitals',
    icon: 'hospital-box',
    mapboxCategory: 'hospital,clinic,pharmacy',
    color: '#F44336'
  },
  {
    id: 'gas_stations',
    name: 'Gas Stations',
    icon: 'gas-station',
    mapboxCategory: 'fuel',
    color: '#FFC107'
  },
  {
    id: 'shops',
    name: 'Shopping',
    icon: 'shopping',
    mapboxCategory: 'shop,shopping,retail,store',
    color: '#9C27B0'
  },
  {
    id: 'banks',
    name: 'Banks & ATMs',
    icon: 'bank',
    mapboxCategory: 'bank,atm',
    color: '#4CAF50'
  },
  {
    id: 'hotels',
    name: 'Hotels',
    icon: 'bed',
    mapboxCategory: 'accommodation,hotel,lodging',
    color: '#2196F3'
  },
  {
    id: 'schools',
    name: 'Schools',
    icon: 'school',
    mapboxCategory: 'school,education,university',
    color: '#607D8B'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'movie',
    mapboxCategory: 'entertainment,cinema,theatre',
    color: '#E91E63'
  }
];

class PlacesService {
  private baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  // Search for places by query
  async searchPlaces(
    query: string,
    userLocation: { latitude: number; longitude: number },
    limit: number = 10,
    radius: number = 5000 // 5km radius
  ): Promise<Place[]> {
    try {
      const proximity = `${userLocation.longitude},${userLocation.latitude}`;
      const url = `${this.baseUrl}/${encodeURIComponent(query)}.json?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `proximity=${proximity}&` +
        `limit=${limit}&` +
        `language=en&` +
        `country=IN`;

      console.log('🔍 Searching places:', url);

      const response = await fetch(url);
      const data = await response.json();

      if (!data.features) {
        return [];
      }

      return data.features.map((feature: any) => this.mapFeatureToPlace(feature, userLocation));
    } catch (error) {
      console.error('❌ Error searching places:', error);
      return [];
    }
  }

  // Search nearby places by category
  async searchNearbyPlaces(
    userLocation: { latitude: number; longitude: number },
    category: PlaceCategory,
    limit: number = 20,
    radius: number = 5000
  ): Promise<Place[]> {
    try {
      const proximity = `${userLocation.longitude},${userLocation.latitude}`;
      
      // Use multiple search terms for better results
      const searchTerms = category.mapboxCategory.split(',');
      let allPlaces: Place[] = [];

      for (const term of searchTerms) {
        const url = `${this.baseUrl}/${encodeURIComponent(term)}.json?` +
          `access_token=${MAPBOX_TOKEN}&` +
          `proximity=${proximity}&` +
          `limit=${Math.ceil(limit / searchTerms.length)}&` +
          `language=en&` +
          `country=IN&` +
          `types=poi`;

        console.log(`🔍 Searching ${category.name}:`, term);

        const response = await fetch(url);
        const data = await response.json();

        if (data.features) {
          const places = data.features.map((feature: any) => this.mapFeatureToPlace(feature, userLocation, category));
          allPlaces = [...allPlaces, ...places];
        }
      }

      // Remove duplicates based on coordinates and sort by distance
      const uniquePlaces = this.removeDuplicatePlaces(allPlaces);
      return uniquePlaces
        .filter(place => place.distance && place.distance <= radius)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, limit);

    } catch (error) {
      console.error(`❌ Error searching nearby ${category.name}:`, error);
      return [];
    }
  }

  // Get popular places around location
  async getPopularPlaces(
    userLocation: { latitude: number; longitude: number },
    limit: number = 50
  ): Promise<Place[]> {
    try {
      let allPlaces: Place[] = [];

      // Search for multiple popular categories
      const popularCategories = PLACE_CATEGORIES.slice(0, 4); // Top 4 categories

      for (const category of popularCategories) {
        const places = await this.searchNearbyPlaces(userLocation, category, 8);
        allPlaces = [...allPlaces, ...places];
      }

      // Remove duplicates and sort by distance
      const uniquePlaces = this.removeDuplicatePlaces(allPlaces);
      return uniquePlaces
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, limit);

    } catch (error) {
      console.error('❌ Error getting popular places:', error);
      return [];
    }
  }

  // Get place details
  async getPlaceDetails(placeId: string): Promise<Place | null> {
    try {
      const url = `${this.baseUrl}/${placeId}.json?access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features[0]) {
        return this.mapFeatureToPlace(data.features[0]);
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting place details:', error);
      return null;
    }
  }

  // Helper function to map Mapbox feature to Place
  private mapFeatureToPlace(
    feature: any, 
    userLocation?: { latitude: number; longitude: number },
    category?: PlaceCategory
  ): Place {
    const coordinates: [number, number] = feature.center;
    const properties = feature.properties || {};
    const context = feature.context || [];

    // Extract address from context
    let address = '';
    const addressParts = context
      .filter((ctx: any) => ctx.id.includes('place') || ctx.id.includes('region'))
      .map((ctx: any) => ctx.text);
    if (addressParts.length > 0) {
      address = addressParts.join(', ');
    }

    // Calculate distance if user location provided
    let distance: number | undefined;
    if (userLocation) {
      distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        coordinates[1],
        coordinates[0]
      );
    }

    // Determine icon and category
    let icon = 'map-marker';
    let placeCategory = 'general';

    if (category) {
      icon = category.icon;
      placeCategory = category.id;
    } else {
      // Try to determine category from feature properties
      const placeName = feature.place_name?.toLowerCase() || '';
      const text = feature.text?.toLowerCase() || '';
      
      if (placeName.includes('hospital') || placeName.includes('clinic') || text.includes('hospital')) {
        icon = 'hospital-box';
        placeCategory = 'hospitals';
      } else if (placeName.includes('restaurant') || placeName.includes('cafe') || text.includes('restaurant')) {
        icon = 'restaurant';
        placeCategory = 'restaurants';
      } else if (placeName.includes('fuel') || placeName.includes('petrol') || text.includes('gas')) {
        icon = 'gas-station';
        placeCategory = 'gas_stations';
      } else if (placeName.includes('shop') || placeName.includes('store') || text.includes('shopping')) {
        icon = 'shopping';
        placeCategory = 'shops';
      } else if (placeName.includes('bank') || placeName.includes('atm') || text.includes('bank')) {
        icon = 'bank';
        placeCategory = 'banks';
      }
    }

    return {
      id: feature.id || `place_${Math.random().toString(36).substr(2, 9)}`,
      name: feature.text || feature.place_name || 'Unknown Place',
      category: placeCategory,
      coordinates,
      address: address || feature.place_name,
      distance,
      icon,
      description: properties.description
    };
  }

  // Helper function to calculate distance between two points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Helper function to remove duplicate places based on coordinates
  private removeDuplicatePlaces(places: Place[]): Place[] {
    const seen = new Set<string>();
    return places.filter(place => {
      const key = `${place.coordinates[0].toFixed(4)},${place.coordinates[1].toFixed(4)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Format distance for display
  formatDistance(distance: number): string {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(1)} km`;
    }
    return `${Math.round(distance)} m`;
  }
}

export const placesService = new PlacesService();
export default placesService;