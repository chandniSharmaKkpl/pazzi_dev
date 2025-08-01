import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';

// FAQs data
const faqs = [
    {
        id: '1',
        question: 'How do I report a patrol?',
        answer: 'Tap the large "Report" button in the bottom right corner of the map screen. Then select the patrol type, add optional comments, and submit the report.',
    },
    {
        id: '2',
        question: 'How accurate are the patrol reports?',
        answer: 'Patrol accuracy depends on community verifications. Reports are color-coded based on probability: red (high), orange (medium), yellow (low), and gray (historical).',
    },
    {
        id: '3',
        question: 'What does my reputation score mean?',
        answer: 'Your reputation score reflects the accuracy of your reports. It increases when your reports are confirmed by others and decreases when they are denied.',
    },
    {
        id: '4',
        question: 'Can I use the app while driving?',
        answer: 'Yes, the app is designed for safe use while driving with large buttons and voice commands. However, please follow local laws regarding phone use while driving.',
    },
    {
        id: '5',
        question: 'Does the app work without internet?',
        answer: 'Basic map and navigation features work offline if you\'ve previously loaded the area. However, real-time patrol reports require an internet connection.',
    },
];

export default function HelpScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const [expandedFaq, setExpandedFaq] = React.useState<string | null>(null);

    const toggleFaq = (id: string) => {
        if (expandedFaq === id) {
            setExpandedFaq(null);
        } else {
            setExpandedFaq(id);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: COLORS[theme].background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Help & Support',
                    headerStyle: { backgroundColor: COLORS[theme].background },
                    headerTitleStyle: { color: COLORS[theme].text, fontSize: 20 },
                    headerShadowVisible: false,
                }}
            />

            <ScrollView style={styles.content}>
                <View style={styles.supportActions}>
                    <TouchableOpacity
                        style={[
                            styles.supportButton,
                            { backgroundColor: COLORS[theme].backgroundSecondary }
                        ]}
                        onPress={() => console.log('Contact support')}
                    >
                        <Ionicons name="mail-outline" size={28} color={COLORS[theme].primary} />
                        <Text style={[styles.supportButtonText, { color: COLORS[theme].text }]}>
                            Contact Support
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.supportButton,
                            { backgroundColor: COLORS[theme].backgroundSecondary }
                        ]}
                        onPress={() => console.log('View tutorials')}
                    >
                        <Ionicons name="play-circle-outline" size={28} color={COLORS[theme].primary} />
                        <Text style={[styles.supportButtonText, { color: COLORS[theme].text }]}>
                            Video Tutorials
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: COLORS[theme].text }]}>
                    Frequently Asked Questions
                </Text>

                <View style={styles.faqContainer}>
                    {faqs.map((faq) => (
                        <View
                            key={faq.id}
                            style={[
                                styles.faqItem,
                                { backgroundColor: COLORS[theme].backgroundSecondary }
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.faqQuestion}
                                onPress={() => toggleFaq(faq.id)}
                            >
                                <Text style={[styles.questionText, { color: COLORS[theme].text }]}>
                                    {faq.question}
                                </Text>
                                <Ionicons
                                    name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color={COLORS[theme].textSecondary}
                                />
                            </TouchableOpacity>

                            {expandedFaq === faq.id && (
                                <View style={styles.faqAnswer}>
                                    <Text style={[styles.answerText, { color: COLORS[theme].textSecondary }]}>
                                        {faq.answer}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                <Text style={[styles.sectionTitle, { color: COLORS[theme].text, marginTop: 24 }]}>
                    Additional Resources
                </Text>

                <View style={styles.resourcesContainer}>
                    <TouchableOpacity
                        style={[
                            styles.resourceItem,
                            { backgroundColor: COLORS[theme].backgroundSecondary }
                        ]}
                        onPress={() => console.log('User guide')}
                    >
                        <Ionicons name="book-outline" size={24} color={COLORS[theme].primary} style={styles.resourceIcon} />
                        <View style={styles.resourceContent}>
                            <Text style={[styles.resourceTitle, { color: COLORS[theme].text }]}>
                                User Guide
                            </Text>
                            <Text style={[styles.resourceDescription, { color: COLORS[theme].textSecondary }]}>
                                Comprehensive guide to all features
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS[theme].textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.resourceItem,
                            { backgroundColor: COLORS[theme].backgroundSecondary }
                        ]}
                        onPress={() => console.log('Community forum')}
                    >
                        <Ionicons name="people-outline" size={24} color={COLORS[theme].primary} style={styles.resourceIcon} />
                        <View style={styles.resourceContent}>
                            <Text style={[styles.resourceTitle, { color: COLORS[theme].text }]}>
                                Community Forum
                            </Text>
                            <Text style={[styles.resourceDescription, { color: COLORS[theme].textSecondary }]}>
                                Join discussions with other users
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS[theme].textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.resourceItem,
                            { backgroundColor: COLORS[theme].backgroundSecondary }
                        ]}
                        onPress={() => console.log('Report a bug')}
                    >
                        <Ionicons name="bug-outline" size={24} color={COLORS[theme].primary} style={styles.resourceIcon} />
                        <View style={styles.resourceContent}>
                            <Text style={[styles.resourceTitle, { color: COLORS[theme].text }]}>
                                Report a Bug
                            </Text>
                            <Text style={[styles.resourceDescription, { color: COLORS[theme].textSecondary }]}>
                                Help us improve the app
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS[theme].textSecondary} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    supportActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    supportButton: {
        width: '48%',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    supportButtonText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    faqContainer: {
        marginBottom: 24,
    },
    faqItem: {
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
    },
    faqQuestion: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    faqAnswer: {
        padding: 16,
        paddingTop: 0,
    },
    answerText: {
        fontSize: 14,
        lineHeight: 20,
    },
    resourcesContainer: {
        marginBottom: 32,
    },
    resourceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    resourceIcon: {
        marginRight: 16,
    },
    resourceContent: {
        flex: 1,
    },
    resourceTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    resourceDescription: {
        fontSize: 14,
    },
});