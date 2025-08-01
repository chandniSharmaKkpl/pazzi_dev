import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';

interface FABProps {
    icon: string;
    label?: string;
    onPress: () => void;
    style?: ViewStyle;
}

export function FAB({ icon, label, onPress, style }: FABProps) {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.fab,
                { backgroundColor: COLORS[theme].primary },
                style
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Ionicons name={icon as any} size={28} color="#FFFFFF" />
            {label && <Text style={styles.label}>{label}</Text>}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 64,
        borderRadius: 32,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
    label: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
});