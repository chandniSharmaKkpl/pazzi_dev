import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Place } from '../../services/map/placesService';

interface PlaceDetailsModalProps {
  place: Place | null;
  visible: boolean;
  onClose: () => void;
  onNavigate?: (place: Place) => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

export const PlaceDetailsModal: React.FC<PlaceDetailsModalProps> = ({
  place,
  visible,
  onClose,
  onNavigate,
  userLocation,
}) => {
  if (!place) return null;

  // Get category color
  const getCategoryColor = (category: string): string => {
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

  // Format distance
  const formatDistance = (distance: number): string => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(1)} km away`;
    }
    return `${Math.round(distance)} m away`;
  };

  // Handle phone call
  const handleCall = (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    });
  };

  // Handle navigation
  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(place);
      onClose();
    }
  };

  // Handle share
  const handleShare = () => {
    const shareUrl = `https://maps.google.com/?q=${place.coordinates[1]},${place.coordinates[0]}`;
    Linking.openURL(shareUrl).catch((err) => 
      Alert.alert('Error', 'Could not open maps app')
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[
                styles.iconContainer,
                { backgroundColor: getCategoryColor(place.category) }
              ]}>
                <MaterialCommunityIcons
                  name={place.icon as any}
                  size={24}
                  color="#fff"
                />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.placeName} numberOfLines={2}>
                  {place.name}
                </Text>
                <Text style={styles.placeCategory}>
                  {place.category.charAt(0).toUpperCase() + place.category.slice(1).replace('_', ' ')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Distance */}
            {place.distance && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="map-marker-distance"
                  size={20}
                  color="#666"
                />
                <Text style={styles.infoText}>
                  {formatDistance(place.distance)}
                </Text>
              </View>
            )}

            {/* Address */}
            {place.address && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={20}
                  color="#666"
                />
                <Text style={styles.infoText}>
                  {place.address}
                </Text>
              </View>
            )}

            {/* Phone */}
            {place.phone && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => handleCall(place.phone!)}
              >
                <MaterialCommunityIcons
                  name="phone"
                  size={20}
                  color="#4CAF50"
                />
                <Text style={[styles.infoText, { color: '#4CAF50' }]}>
                  {place.phone}
                </Text>
              </TouchableOpacity>
            )}

            {/* Rating */}
            {place.rating && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="star"
                  size={20}
                  color="#FFC107"
                />
                <Text style={styles.infoText}>
                  {place.rating.toFixed(1)} stars
                </Text>
              </View>
            )}

            {/* Description */}
            {place.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>About</Text>
                <Text style={styles.descriptionText}>
                  {place.description}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={handleShare}
            >
              <MaterialCommunityIcons
                name="share-variant"
                size={20}
                color="#666"
              />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.navigateButton]}
              onPress={handleNavigate}
            >
              <MaterialCommunityIcons
                name="navigation"
                size={20}
                color="#fff"
              />
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  placeCategory: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  shareButton: {
    backgroundColor: '#f5f5f5',
  },
  navigateButton: {
    backgroundColor: '#2196F3',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  navigateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default PlaceDetailsModal;