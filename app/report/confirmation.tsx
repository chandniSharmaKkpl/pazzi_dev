import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';

export default function ConfirmationScreen() {
    const router = useRouter();
    const { theme } = useTheme();

    // Automatically navigate back to map after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace('/(tabs)');
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: COLORS[theme].background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: COLORS[theme].primary }]}>
                    <Ionicons name="checkmark" size={64} color="#FFFFFF" />
                </View>

                <Text style={[styles.title, { color: COLORS[theme].text }]}>
                    Report Submitted Successfully
                </Text>

                <Text style={[styles.description, { color: COLORS[theme].textSecondary }]}>
                    Thank you for contributing to the community. Your report is being processed.
                </Text>

                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: COLORS[theme].primary }]}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={styles.backButtonText}>Return to Map</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    content: {
        alignItems: 'center',
        maxWidth: 400,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
    },
    backButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 28,
    },
    backButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});