import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';
import { PatrolType } from '../../types/patrol';

const patrolTypes = [
    { id: PatrolType.RADAR, name: 'Radar', icon: 'speedometer-outline' },
    { id: PatrolType.POLICE, name: 'Police Vehicle', icon: 'car-outline' },
    { id: PatrolType.ALCOTEST, name: 'Alcohol Check', icon: 'flask-outline' },
    { id: PatrolType.CAMERA, name: 'Speed Camera', icon: 'camera-outline' },
    { id: PatrolType.ACCIDENT, name: 'Accident', icon: 'alert-circle-outline' },
    { id: PatrolType.ROAD_BLOCK, name: 'Road Block', icon: 'construct-outline' },
];

export default function ReportPatrolScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const [selectedType, setSelectedType] = useState<PatrolType | null>(null);
    const [comment, setComment] = useState('');

    const handleSubmit = () => {
        if (!selectedType) return;

        // Submit the report
        console.log('Report submitted:', { type: selectedType, comment });

        // Navigate to confirmation screen
        router.push('/report/confirmation');
    };

    return (
        <View style={[styles.container, { backgroundColor: COLORS[theme].background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Report Patrol',
                    headerStyle: { backgroundColor: COLORS[theme].background },
                    headerTitleStyle: { color: COLORS[theme].text, fontSize: 20 },
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <Ionicons name="close" size={28} color={COLORS[theme].text} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView style={styles.content}>
                <Text style={[styles.sectionTitle, { color: COLORS[theme].text }]}>
                    Select Patrol Type
                </Text>

                <View style={styles.typeGrid}>
                    {patrolTypes.map((type) => (
                        <TouchableOpacity
                            key={type.id}
                            style={[
                                styles.typeButton,
                                { backgroundColor: COLORS[theme].backgroundSecondary },
                                selectedType === type.id && {
                                    backgroundColor: COLORS[theme].primary,
                                    borderColor: COLORS[theme].primary
                                }
                            ]}
                            onPress={() => setSelectedType(type.id)}
                        >
                            <Ionicons
                                name={type.icon as any}
                                size={32}
                                color={selectedType === type.id ? '#FFFFFF' : COLORS[theme].primary}
                            />
                            <Text
                                style={[
                                    styles.typeText,
                                    { color: selectedType === type.id ? '#FFFFFF' : COLORS[theme].text }
                                ]}
                            >
                                {type.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.sectionTitle, { color: COLORS[theme].text, marginTop: 24 }]}>
                    Additional Comments (Optional)
                </Text>

                <View style={[
                    styles.commentContainer,
                    { backgroundColor: COLORS[theme].backgroundSecondary }
                ]}>
                    <TextInput
                        style={[styles.commentInput, { color: COLORS[theme].text }]}
                        placeholder="Add any additional details..."
                        placeholderTextColor={COLORS[theme].textSecondary}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={4}
                    />
                    <TouchableOpacity style={styles.voiceButton}>
                        <Ionicons name="mic" size={24} color={COLORS[theme].primary} />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={[
                styles.footer,
                {
                    backgroundColor: COLORS[theme].background,
                    paddingBottom: insets.bottom + 16,
                    paddingTop: 16
                }
            ]}>
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        { backgroundColor: selectedType ? COLORS[theme].primary : COLORS[theme].backgroundTertiary }
                    ]}
                    onPress={handleSubmit}
                    disabled={!selectedType}
                >
                    <Text style={[
                        styles.submitButtonText,
                        { color: selectedType ? '#FFFFFF' : COLORS[theme].textSecondary }
                    ]}>
                        Submit Report
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    typeButton: {
        width: '48%',
        height: 100,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    typeText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 8,
        textAlign: 'center',
    },
    commentContainer: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    commentInput: {
        fontSize: 16,
        minHeight: 100,
    },
    voiceButton: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    submitButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '600',
    },
});