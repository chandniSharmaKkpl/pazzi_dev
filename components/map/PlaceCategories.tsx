import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PlaceCategory, PLACE_CATEGORIES } from '../../services/map/placesService';

interface PlaceCategoriesProps {
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  onCategoryPress: (category: PlaceCategory) => void;
  isVisible: boolean;
}

export const PlaceCategories: React.FC<PlaceCategoriesProps> = ({
  selectedCategories,
  onCategoryToggle,
  onCategoryPress,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {PLACE_CATEGORIES.map((category) => {
          const isSelected = selectedCategories.includes(category.id);
          
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                {
                  backgroundColor: isSelected ? category.color : '#fff',
                  borderColor: category.color,
                }
              ]}
              onPress={() => onCategoryPress(category)}
              onLongPress={() => onCategoryToggle(category.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={category.icon as any}
                size={24}
                color={isSelected ? '#fff' : category.color}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: isSelected ? '#fff' : category.color }
                ]}
                numberOfLines={1}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Compact version for search overlay
interface CompactPlaceCategoriesProps {
  onCategoryPress: (category: PlaceCategory) => void;
  isVisible: boolean;
}

export const CompactPlaceCategories: React.FC<CompactPlaceCategoriesProps> = ({
  onCategoryPress,
  isVisible
}) => {
  if (!isVisible) return null;

  // Show only top 4 most popular categories
  const topCategories = PLACE_CATEGORIES.slice(0, 4);

  return (
    <View style={styles.compactContainer}>
      <Text style={styles.compactTitle}>Quick Search</Text>
      <View style={styles.compactGrid}>
        {topCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.compactButton, { borderColor: category.color }]}
            onPress={() => onCategoryPress(category)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={category.icon as any}
              size={20}
              color={category.color}
            />
            <Text style={[styles.compactText, { color: category.color }]}>
              {category.name.split(' ')[0]} {/* Show first word only */}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  compactContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  compactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  compactButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
  },
  compactText: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default PlaceCategories;