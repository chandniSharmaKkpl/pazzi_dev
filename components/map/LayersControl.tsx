import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';

interface LayersControlProps {
    currentLayer: string;
    showTraffic: boolean;
    onLayerChange: (layer: string) => void;
}

export function LayersControl({ currentLayer, showTraffic, onLayerChange }: LayersControlProps) {
    const { theme } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);

    const handleLayerSelect = (layer: string) => {
        onLayerChange(layer);
        setModalVisible(false);
    };

    // Determine the active layer (if traffic is shown, it overrides the map type)
    const activeLayer = showTraffic ? 'traffic' : currentLayer;

    return (
        <View>
            <TouchableOpacity
                style={[
                    styles.layerButton,
                    { backgroundColor: COLORS[theme].backgroundSecondary }
                ]}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons
                    name="layers-outline"
                    size={24}
                    color={COLORS[theme].primary}
                />
            </TouchableOpacity>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View
                        style={[
                            styles.layersMenu,
                            { backgroundColor: COLORS[theme].backgroundSecondary }
                        ]}
                    >
                        <Text style={[styles.menuTitle, { color: COLORS[theme].text }]}>Map Layers</Text>

                        <TouchableOpacity
                            style={[
                                styles.layerOption,
                                activeLayer === 'standard' && { backgroundColor: COLORS[theme].backgroundTertiary }
                            ]}
                            onPress={() => handleLayerSelect('standard')}
                        >
                            <Ionicons
                                name="map-outline"
                                size={24}
                                color={activeLayer === 'standard' ? COLORS[theme].primary : COLORS[theme].text}
                            />
                            <Text
                                style={[
                                    styles.layerText,
                                    {
                                        color: activeLayer === 'standard' ? COLORS[theme].primary : COLORS[theme].text
                                    }
                                ]}
                            >
                                Standard
                            </Text>
                            {activeLayer === 'standard' && (
                                <Ionicons name="checkmark" size={24} color={COLORS[theme].primary} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.layerOption,
                                activeLayer === 'satellite' && { backgroundColor: COLORS[theme].backgroundTertiary }
                            ]}
                            onPress={() => handleLayerSelect('satellite')}
                        >
                            <Ionicons
                                name="globe-outline"
                                size={24}
                                color={activeLayer === 'satellite' ? COLORS[theme].primary : COLORS[theme].text}
                            />
                            <Text
                                style={[
                                    styles.layerText,
                                    {
                                        color: activeLayer === 'satellite' ? COLORS[theme].primary : COLORS[theme].text
                                    }
                                ]}
                            >
                                Satellite
                            </Text>
                            {activeLayer === 'satellite' && (
                                <Ionicons name="checkmark" size={24} color={COLORS[theme].primary} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.layerOption,
                                activeLayer === 'hybrid' && { backgroundColor: COLORS[theme].backgroundTertiary }
                            ]}
                            onPress={() => handleLayerSelect('hybrid')}
                        >
                            <Ionicons
                                name="map"
                                size={24}
                                color={activeLayer === 'hybrid' ? COLORS[theme].primary : COLORS[theme].text}
                            />
                            <Text
                                style={[
                                    styles.layerText,
                                    {
                                        color: activeLayer === 'hybrid' ? COLORS[theme].primary : COLORS[theme].text
                                    }
                                ]}
                            >
                                Hybrid
                            </Text>
                            {activeLayer === 'hybrid' && (
                                <Ionicons name="checkmark" size={24} color={COLORS[theme].primary} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.layerOption,
                                activeLayer === 'traffic' && { backgroundColor: COLORS[theme].backgroundTertiary }
                            ]}
                            onPress={() => handleLayerSelect('traffic')}
                        >
                            <Ionicons
                                name="car-outline"
                                size={24}
                                color={activeLayer === 'traffic' ? COLORS[theme].primary : COLORS[theme].text}
                            />
                            <Text
                                style={[
                                    styles.layerText,
                                    {
                                        color: activeLayer === 'traffic' ? COLORS[theme].primary : COLORS[theme].text
                                    }
                                ]}
                            >
                                Traffic
                            </Text>
                            {activeLayer === 'traffic' && (
                                <Ionicons name="checkmark" size={24} color={COLORS[theme].primary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    layerButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    layersMenu: {
        width: '80%',
        borderRadius: 16,
        padding: 16,
        maxWidth: 320,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    layerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    layerText: {
        fontSize: 16,
        marginLeft: 16,
        flex: 1,
    },
});