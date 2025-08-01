
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SearchBar } from '../ui/SearchBar';
import { MapControls } from './MapControls';
import { LayersControl } from './LayersControl';
import { FAB } from '../ui/FAB';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface MapOverlaysProps {
    topInset: number;
    bottomInset: number;
    hasLocation: boolean;
    connected: boolean;
    mapType: string;
    showTraffic: boolean;
    onSearch: (query: string) => void;
    onZoomToUser: () => void;
    onRefresh: () => void;
    onLayerChange: (layer: string) => void;
    onReportPatrol: () => void;
    showSearchBar?: boolean; // Added showSearchBar prop
}
export function MapOverlays({
    topInset,
    bottomInset,
    hasLocation,
    connected,
    mapType,
    showTraffic,
    onSearch,
    onZoomToUser,
    onRefresh,
    onLayerChange,
    onReportPatrol,
    showSearchBar = true,
}: MapOverlaysProps) {
    const { theme } = useTheme();
    const [searchFocused, setSearchFocused] = React.useState(false);

    return (
        <>
            {/* Enhanced Search Bar with focus states */}
            {showSearchBar && (
                <View style={[
                    styles.searchContainer, 
                    { top: topInset + 10 },
                    searchFocused && styles.searchContainerFocused
                ]}>
                    <SearchBar
                        placeholder="Search places, addresses..."
                        onSearch={onSearch}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                    />
                </View>
            )}

            {/* Floating Control Panel */}
            <View style={[styles.controlPanel, { top: topInset + (showSearchBar ? 80 : 20) }]}>
                <MapControls
                    onZoomToUser={onZoomToUser}
                    hasLocation={hasLocation}
                />
                <LayersControl
                    currentLayer={mapType}
                    showTraffic={showTraffic}
                    onLayerChange={onLayerChange}
                />
            </View>

            {/* Enhanced FAB with micro-interactions */}
            {/* <View style={[styles.fabContainer, { bottom: bottomInset + 100 }]}>
                <FAB
                    icon="add"
                    onPress={onReportPatrol}
                    label="Report"
                />
            </View> */}

            {/* Connection Status with better design */}
            {/* {!connected && (
                <View style={[styles.connectionStatus, { top: topInset + 20 }]}>
                    <View style={styles.connectionIndicator} />
                    <Text style={styles.connectionText}>Reconnecting...</Text>
                </View>
            )} */}

            {/* Location Permission Prompt */}
            {!hasLocation && (
                <View style={[styles.locationPrompt, { bottom: bottomInset + 200 }]}>
                    <Ionicons name="location-outline" size={20} color="#007AFF" />
                    <Text style={styles.locationPromptText}>
                        Enable location for better experience
                    </Text>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 1000,
        transform: [{ scale: 1 }],
    },
    searchContainerFocused: {
        transform: [{ scale: 1.02 }],
        zIndex: 1001,
    },
    controlPanel: {
        position: 'absolute',
        right: 16,
        zIndex: 1000,
        gap: 12,
    },
    fabContainer: {
        position: 'absolute',
        right: 16,
        zIndex: 1000,
    },
    connectionStatus: {
        position: 'absolute',
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF3B30',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 1000,
    },
    connectionIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        marginRight: 8,
    },
    connectionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    locationPrompt: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 122, 255, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        zIndex: 1000,
    },
    locationPromptText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
});