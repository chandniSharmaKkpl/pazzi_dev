import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';

const { width } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        title: 'Welcome to Patrol Navigation',
        description: 'The community-driven navigation app that helps you drive safer and smarter.',
        image: require('../../assets/images/onboarding/welcome.png'),
    },
    {
        id: '2',
        title: 'Real-Time Patrol Alerts',
        description: 'Get notified about patrols on your route and contribute to the community by reporting patrols you see.',
        image: require('../../assets/images/onboarding/alerts.png'),
    },
    {
        id: '3',
        title: 'Smart Navigation',
        description: 'Our app helps you navigate around patrols and avoid routes with high patrol activity.',
        image: require('../../assets/images/onboarding/navigation.png'),
    },
    {
        id: '4',
        title: 'Privacy First',
        description: 'Your data is always protected. We only use your location to provide navigation services and patrol alerts.',
        image: require('../../assets/images/onboarding/privacy.png'),
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const { setHasCompletedOnboarding } = useApp();
    const { requestPermission } = useLocation();

    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<ScrollView>(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        setCurrentIndex(viewableItems[0]?.index || 0);
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = (index: number) => {
        if (slidesRef.current) {
            slidesRef.current.scrollTo({ x: index * width, animated: true });
        }
    };

    const nextSlide = () => {
        if (currentIndex < slides.length - 1) {
            scrollTo(currentIndex + 1);
        } else {
            completeOnboarding();
        }
    };

    const completeOnboarding = async () => {
        console.log('🎯 Starting onboarding completion...');
        
        // Request location permission before completing onboarding
        console.log('📍 Requesting location permission...');
        await requestPermission();
        console.log('✅ Location permission handled');

        // Mark onboarding as completed
        console.log('📝 Marking onboarding as completed...');
        setHasCompletedOnboarding(true);
        console.log('✅ Onboarding marked as completed');

        // Add a small delay to ensure AsyncStorage is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('⏳ Delay completed, now navigating...');

        // Navigate to the main app
        console.log('🏠 Navigating to main app...');
        router.replace('/(tabs)');
        console.log('✅ Navigation to main app completed');
    };

    return (
        <View style={[styles.container, { backgroundColor: COLORS[theme].background }]}>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

            <View style={styles.skipButton}>
                <TouchableOpacity onPress={completeOnboarding}>
                    <Text style={[styles.skipText, { color: COLORS[theme].primary }]}>Skip</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={slidesRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={32}
            >
                {slides.map((slide, index) => (
                    <View style={[styles.slide, { width }]} key={slide.id}>
                        <Image source={slide.image} style={styles.image} />
                        <View style={styles.textContainer}>
                            <Text style={[styles.title, { color: COLORS[theme].text }]}>
                                {slide.title}
                            </Text>
                            <Text style={[styles.description, { color: COLORS[theme].textSecondary }]}>
                                {slide.description}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.bottomContainer}>
                <View style={styles.paginationContainer}>
                    {slides.map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.paginationDot,
                                {
                                    backgroundColor:
                                        currentIndex === index
                                            ? COLORS[theme].primary
                                            : COLORS[theme].backgroundTertiary,
                                    width: currentIndex === index ? 20 : 10,
                                }
                            ]}
                            onPress={() => scrollTo(index)}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.nextButton, { backgroundColor: COLORS[theme].primary }]}
                    onPress={nextSlide}
                >
                    <Text style={styles.nextButtonText}>
                        {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                    <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skipButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '500',
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    image: {
        width: width * 0.8,
        height: width * 0.8,
        resizeMode: 'contain',
        marginBottom: 40,
    },
    textContainer: {
        alignItems: 'center',
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
        lineHeight: 24,
    },
    bottomContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 20,
    },
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paginationDot: {
        height: 10,
        borderRadius: 5,
        marginHorizontal: 3,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
        marginRight: 8,
    },
});