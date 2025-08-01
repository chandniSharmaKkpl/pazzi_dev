// components/auth/FormError.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type FormErrorProps = {
    error: string;
};

export const FormError = ({ error }: FormErrorProps) => {
    if (!error) return null;

    return (
        <View style={styles.container}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.text}>{error}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    text: {
        color: '#FF3B30',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
});