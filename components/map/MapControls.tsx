import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';

interface MapControlsProps {
    onZoomToUser: () => void;
    hasLocation: boolean;
}

export function MapControls({ onZoomToUser, hasLocation }: MapControlsProps) {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            { /* My location button */}
            <TouchableOpacity
                style={[
                    styles.controlButton,
                    { backgroundColor: COLORS[theme].backgroundSecondary },
                    !hasLocation && styles.disabledButton
                ]}
                onPress={onZoomToUser}
                disabled={!hasLocation}
            >
                <Ionicons
                    name="locate"
                    size={24}
                    color={hasLocation ? COLORS[theme].primary : COLORS[theme].textSecondary}
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    controlButton: {
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
        marginBottom: 12,
    },
    disabledButton: {
        opacity: 0.5,
    },
});