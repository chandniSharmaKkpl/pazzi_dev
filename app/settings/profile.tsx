import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const [username, setUsername] = useState('John Driver');
    const [email, setEmail] = useState('john.driver@example.com');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const saveProfile = () => {
        // Save profile changes
        console.log('Saving profile', { username, email, profileImage });
        setIsEditing(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: COLORS[theme].background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'My Profile',
                    headerStyle: { backgroundColor: COLORS[theme].background },
                    headerTitleStyle: { color: COLORS[theme].text, fontSize: 20 },
                    headerShadowVisible: false,
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => isEditing ? saveProfile() : setIsEditing(true)}
                            style={styles.editButton}
                        >
                            <Text style={{ color: COLORS[theme].primary, fontSize: 16, fontWeight: '500' }}>
                                {isEditing ? 'Save' : 'Edit'}
                            </Text>
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView style={styles.content}>
                <View style={styles.profileHeader}>
                    <TouchableOpacity
                        style={styles.profileImageContainer}
                        onPress={isEditing ? pickImage : undefined}
                        disabled={!isEditing}
                    >
                        <Image
                            source={
                                profileImage
                                    ? { uri: profileImage }
                                    : require('../../assets/images/avatar-placeholder.png')
                            }
                            style={styles.profileImage}
                        />
                        {isEditing && (
                            <View style={styles.changePhotoButton}>
                                <Ionicons name="camera" size={20} color="#FFFFFF" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.infoSection}>
                    <Text style={[styles.infoLabel, { color: COLORS[theme].textSecondary }]}>
                        Username
                    </Text>
                    {isEditing ? (
                        <TextInput
                            style={[
                                styles.infoInput,
                                {
                                    color: COLORS[theme].text,
                                    backgroundColor: COLORS[theme].backgroundSecondary
                                }
                            ]}
                            value={username}
                            onChangeText={setUsername}
                        />
                    ) : (
                        <Text style={[styles.infoValue, { color: COLORS[theme].text }]}>
                            {username}
                        </Text>
                    )}
                </View>

                <View style={styles.infoSection}>
                    <Text style={[styles.infoLabel, { color: COLORS[theme].textSecondary }]}>
                        Email
                    </Text>
                    {isEditing ? (
                        <TextInput
                            style={[
                                styles.infoInput,
                                {
                                    color: COLORS[theme].text,
                                    backgroundColor: COLORS[theme].backgroundSecondary
                                }
                            ]}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    ) : (
                        <Text style={[styles.infoValue, { color: COLORS[theme].text }]}>
                            {email}
                        </Text>
                    )}
                </View>

                <View style={styles.statsContainer}>
                    <View style={[
                        styles.statCard,
                        { backgroundColor: COLORS[theme].backgroundSecondary }
                    ]}>
                        <Text style={[styles.statValue, { color: COLORS[theme].text }]}>850</Text>
                        <Text style={[styles.statLabel, { color: COLORS[theme].textSecondary }]}>
                            Reputation Score
                        </Text>
                    </View>

                    <View style={[
                        styles.statCard,
                        { backgroundColor: COLORS[theme].backgroundSecondary }
                    ]}>
                        <Text style={[styles.statValue, { color: COLORS[theme].text }]}>76</Text>
                        <Text style={[styles.statLabel, { color: COLORS[theme].textSecondary }]}>
                            Patrol Reports
                        </Text>
                    </View>

                    <View style={[
                        styles.statCard,
                        { backgroundColor: COLORS[theme].backgroundSecondary }
                    ]}>
                        <Text style={[styles.statValue, { color: COLORS[theme].text }]}>91%</Text>
                        <Text style={[styles.statLabel, { color: COLORS[theme].textSecondary }]}>
                            Accuracy Rate
                        </Text>
                    </View>
                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: COLORS[theme].backgroundSecondary }
                        ]}
                        onPress={() => console.log('Change password')}
                    >
                        <Ionicons name="lock-closed-outline" size={24} color={COLORS[theme].primary} style={styles.actionIcon} />
                        <Text style={[styles.actionText, { color: COLORS[theme].text }]}>
                            Change Password
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS[theme].textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: COLORS[theme].backgroundSecondary }
                        ]}
                        onPress={() => console.log('Privacy settings')}
                    >
                        <Ionicons name="shield-outline" size={24} color={COLORS[theme].primary} style={styles.actionIcon} />
                        <Text style={[styles.actionText, { color: COLORS[theme].text }]}>
                            Privacy Settings
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS[theme].textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: COLORS[theme].backgroundSecondary }
                        ]}
                        onPress={() => console.log('Linked accounts')}
                    >
                        <Ionicons name="link-outline" size={24} color={COLORS[theme].primary} style={styles.actionIcon} />
                        <Text style={[styles.actionText, { color: COLORS[theme].text }]}>
                            Linked Accounts
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS[theme].textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.logoutButton,
                            { borderColor: COLORS[theme].error }
                        ]}
                        onPress={() => console.log('Logout')}
                    >
                        <Ionicons name="log-out-outline" size={24} color={COLORS[theme].error} style={styles.actionIcon} />
                        <Text style={[styles.logoutText, { color: COLORS[theme].error }]}>
                            Log Out
                        </Text>
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
    editButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    profileImageContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        marginBottom: 16,
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    changePhotoButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        marginBottom: 24,
    },
    infoLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    infoValue: {
        fontSize: 18,
        fontWeight: '500',
    },
    infoInput: {
        fontSize: 18,
        fontWeight: '500',
        padding: 12,
        borderRadius: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statCard: {
        width: '31%',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        textAlign: 'center',
    },
    actionsContainer: {
        marginBottom: 32,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    actionIcon: {
        marginRight: 16,
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        borderWidth: 2,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});