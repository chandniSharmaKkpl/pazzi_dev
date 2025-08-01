import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '../../context/LocationContext';
import { NavigationOverlay } from '../../components/navigation/NavigationOverlay';
import { useNavigation } from '../../context/NavigationContext';

interface Destination {
    id: string;
    name: string;
    address: string;
    type: 'home' | 'work' | 'favorite' | 'recent';
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

interface Route {
    distance: number;
    duration: number;
    steps: any[];
    geometry: {
        coordinates: [number, number][];
    };
}

export default function DestinationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { location } = useLocation();
    const { startNavigation } = useNavigation();
    const [searchText, setSearchText] = useState('');
    const [showNavigation, setShowNavigation] = useState(false);
    const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
    const [destinations, setDestinations] = useState<Destination[]>([
        {
            id: '1',
            name: 'Home',
            address: '123 Main Street, City, State 12345',
            type: 'home',
            coordinates: { latitude: 28.6129, longitude: 77.2295 } 
        },
        {
            id: '2',
            name: 'Work',
            address: '456 Business Ave, Downtown, State 12345',
            type: 'work',
            coordinates: { latitude: 18.9430, longitude: 72.8238 }
        },
        {
            id: '3',
            name: 'Gym',
            address: '789 Fitness Blvd, City, State 12345',
            type: 'favorite',
            coordinates: { latitude: 28.6129, longitude: 77.2295 }  
        },
        {
            id: '4',
            name: 'Grocery Store',
            address: '321 Market St, City, State 12345',
            type: 'favorite',
            coordinates: { latitude: 28.6129, longitude: 77.2295 } 
        },
        {
            id: '5',
            name: 'Coffee Shop',
            address: '555 Brew Ave, City, State 12345',
            type: 'favorite',
            coordinates: { latitude: 18.9430, longitude: 72.8238 }  
        },
        {
            id: '6',
            name: 'Park',
            address: '888 Green St, City, State 12345',
            type: 'favorite',
            coordinates: { latitude: 28.6129, longitude: 77.2295 } 
        }
        
    ]);

    useEffect(() => {
        console.log('🚀 DestinationsScreen: Component mounted');
    }, []);

    const handleDestinationPress = (destination: Destination) => {
        console.log('📍 Navigating to destination:', destination.name);
        
        if (!location) {
            Alert.alert('Location Required', 'Please enable location services to get directions');
            return;
        }

        if (!destination.coordinates) {
            Alert.alert('Invalid Destination', 'This destination does not have coordinates');
            return;
        }

        setSelectedDestination(destination);
        setShowNavigation(true);
    };

    const handleDestinationOptions = (destination: Destination) => {
        Alert.alert(
            'Destination Options',
            `What would you like to do with ${destination.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Navigate', 
                    onPress: () => handleDestinationPress(destination)
                },
                { 
                    text: 'Edit', 
                    onPress: () => Alert.alert('Edit', `Edit ${destination.name}`)
                },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Delete Destination',
                            `Are you sure you want to delete ${destination.name}?`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { 
                                    text: 'Delete', 
                                    style: 'destructive',
                                    onPress: () => {
                                        setDestinations(prev => 
                                            prev.filter(d => d.id !== destination.id)
                                        );
                                    }
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    const handleStartNavigation = (route: Route) => {
        console.log('🚀 Starting navigation with route:', {
            distance: (route.distance / 1000).toFixed(1) + ' km',
            duration: Math.round(route.duration / 60) + ' min',
            steps: route.steps.length
        });

        setShowNavigation(false);
        setSelectedDestination(null);

        startNavigation(route);
        router.push('/(tabs)/index');
    };

    const getDestinationIcon = (type: string) => {
        switch (type) {
            case 'home':
                return 'home-outline';
            case 'work':
                return 'briefcase-outline';
            case 'favorite':
                return 'heart-outline';
            default:
                return 'location-outline';
        }
    };

    const filteredDestinations = destinations.filter(dest =>
        dest.name.toLowerCase().includes(searchText.toLowerCase()) ||
        dest.address.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderDestinationItem = ({ item }: { item: Destination }) => (
        <TouchableOpacity
            style={styles.destinationCard}
            onPress={() => handleDestinationPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.destinationContent}>
                <View style={styles.destinationInfo}>
                    <View style={styles.iconContainer}>
                        <Ionicons 
                            name={getDestinationIcon(item.type) as any} 
                            size={24} 
                            color="#0066CC" 
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.destinationName}>{item.name}</Text>
                        <Text style={styles.destinationAddress}>{item.address}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.optionsButton}
                    onPress={() => handleDestinationOptions(item)}
                >
                    <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Saved Destinations',
                    headerStyle: { backgroundColor: '#fff' },
                    headerTitleStyle: { color: '#000', fontSize: 20, fontWeight: '600' },
                    headerShadowVisible: false,
                }}
            />

            {/* Destinations List */}
            <View style={styles.contentContainer}>
                <FlatList
                    data={filteredDestinations}
                    renderItem={renderDestinationItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="location-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No destinations found</Text>
                            <Text style={styles.emptySubtext}>
                                {searchText ? 'Try adjusting your search' : 'Add your first destination'}
                            </Text>
                        </View>
                    }
                />
            </View>

            {/* Navigation Modal */}
            <Modal
                visible={showNavigation}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                {selectedDestination && location && (
                    <NavigationOverlay
                        origin={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude
                        }}
                        destination={{
                            latitude: selectedDestination.coordinates!.latitude,
                            longitude: selectedDestination.coordinates!.longitude
                        }}
                        destinationName={selectedDestination.name}
                        onClose={() => {
                            setShowNavigation(false);
                            setSelectedDestination(null);
                        }}
                        onStartNavigation={handleStartNavigation}
                    />
                )}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#f5f5f5',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f3f4',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginBottom: 16,
        marginTop: 8,
    },
    listContainer: {
        paddingBottom: 100,
    },
    destinationCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    destinationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    destinationInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f0f8ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    destinationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    destinationAddress: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    optionsButton: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#666',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
    },
    addButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#0066CC',
        borderRadius: 28,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
