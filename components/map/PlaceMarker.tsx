import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapboxGL from '@rnmapbox/maps';
import { Place } from '../../services/map/placesService';

interface PlaceMarkerProps {
  place: Place;
  onPress: (place: Place) => void;
  isSelected?: boolean;
}

export const PlaceMarker: React.FC<PlaceMarkerProps> = ({
  place,
  onPress,
  isSelected = false
}) => {
  // Get icon color based on category
  const getIconColor = (category: string): string => {
    switch (category) {
      case 'restaurants': return '#FF5722';
      case 'hospitals': return '#F44336';
      case 'gas_stations': return '#FFC107';
      case 'shops': return '#9C27B0';
      case 'banks': return '#4CAF50';
      case 'hotels': return '#2196F3';
      case 'schools': return '#607D8B';
      case 'entertainment': return '#E91E63';
      default: return '#757575';
    }
  };

  // Get icon size based on selection
  const iconSize = isSelected ? 28 : 24;
  const markerSize = isSelected ? 48 : 40;

  return (
    <MapboxGL.PointAnnotation
      id={`place-${place.id}`}
      coordinate={place.coordinates}
      onSelected={() => onPress(place)}
    >
      <View style={[
        styles.markerContainer,
        {
          width: markerSize,
          height: markerSize,
          backgroundColor: getIconColor(place.category),
          borderWidth: isSelected ? 3 : 2,
          borderColor: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.8)',
          shadowOpacity: isSelected ? 0.4 : 0.2,
          elevation: isSelected ? 8 : 4,
          transform: [{ scale: isSelected ? 1.1 : 1 }]
        }
      ]}>
        <MaterialCommunityIcons
          name={place.icon as any}
          size={iconSize}
          color="#fff"
        />
      </View>
      
      {/* Place name label (only show if selected or important) */}
      {(isSelected || place.category === 'hospitals') && (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText} numberOfLines={1}>
            {place.name}
          </Text>
          {place.distance && (
            <Text style={styles.distanceText}>
              {place.distance >= 1000 
                ? `${(place.distance / 1000).toFixed(1)} km` 
                : `${Math.round(place.distance)} m`
              }
            </Text>
          )}
        </View>
      )}
    </MapboxGL.PointAnnotation>
  );
};

// Alternative marker for react-native-maps fallback
interface FallbackPlaceMarkerProps {
  place: Place;
  onPress: (place: Place) => void;
  isSelected?: boolean;
  Marker: any; // react-native-maps Marker component
}

export const FallbackPlaceMarker: React.FC<FallbackPlaceMarkerProps> = ({
  place,
  onPress,
  isSelected = false,
  Marker
}) => {
  const getIconColor = (category: string): string => {
    switch (category) {
      case 'restaurants': return '#FF5722';
      case 'hospitals': return '#F44336';
      case 'gas_stations': return '#FFC107';
      case 'shops': return '#9C27B0';
      case 'banks': return '#4CAF50';
      case 'hotels': return '#2196F3';
      case 'schools': return '#607D8B';
      case 'entertainment': return '#E91E63';
      default: return '#757575';
    }
  };

  const iconSize = isSelected ? 28 : 24;
  const markerSize = isSelected ? 48 : 40;

  return (
    <Marker
      coordinate={{
        latitude: place.coordinates[1],
        longitude: place.coordinates[0]
      }}
      onPress={() => onPress(place)}
    >
      <View style={[
        styles.markerContainer,
        {
          width: markerSize,
          height: markerSize,
          backgroundColor: getIconColor(place.category),
          borderWidth: isSelected ? 3 : 2,
          borderColor: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.8)',
          shadowOpacity: isSelected ? 0.4 : 0.2,
          elevation: isSelected ? 8 : 4,
          transform: [{ scale: isSelected ? 1.1 : 1 }]
        }
      ]}>
        <MaterialCommunityIcons
          name={place.icon as any}
          size={iconSize}
          color="#fff"
        />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  labelContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    maxWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  distanceText: {
    fontSize: 9,
    color: '#666',
    marginTop: 1,
  },
});

export default PlaceMarker;