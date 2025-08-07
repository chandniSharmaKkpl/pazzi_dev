import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

interface User {
    name: string;
    email: string;
    avatar?: string;
}

interface NotificationSettings {
    enableNotifications: boolean;
    enableProximityNotifications: boolean;
    proximityRadius: string;
}

export default function MoreScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // Get user data from AuthContext
    const { user: authUser, logout } = useAuth();
    
    // Initialize user state with data from AuthContext or fallback
    const [user, setUser] = useState<User>({
        name: authUser?.name || 'Guest User',
        email: authUser?.email || 'No email provided'
    });
    
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        enableNotifications: true,
        enableProximityNotifications: true,
        proximityRadius: '5'
    });

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(user.name);
    const [editEmail, setEditEmail] = useState(user.email);

    // Update local user state when authUser changes
    useEffect(() => {
        if (authUser) {
            const updatedUser = {
                name: authUser.name || 'Guest User',
                email: authUser.email || 'No email provided'
            };
            setUser(updatedUser);
            setEditName(updatedUser.name);
            setEditEmail(updatedUser.email);
        }
    }, [authUser]);

    useEffect(() => {
        console.log('🚀 MoreScreen: Component mounted');
        console.log('👤 Current auth user:', authUser);
    }, [authUser]);

    const handleProfileEdit = () => {
        if (isEditingProfile) {
            // Validate inputs
            if (!editName.trim()) {
                Alert.alert('Error', 'Name cannot be empty');
                return;
            }
            if (!editEmail.trim()) {
                Alert.alert('Error', 'Email cannot be empty');
                return;
            }
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(editEmail)) {
                Alert.alert('Error', 'Please enter a valid email address');
                return;
            }

            // Save changes locally (you may want to call an API here to update on server)
            const updatedUser = {
                ...user,
                name: editName.trim(),
                email: editEmail.trim()
            };
            setUser(updatedUser);
            setIsEditingProfile(false);
            
            Alert.alert('Success', 'Profile updated successfully!');
            
            // TODO: Call API to update user profile on server
            // await updateUserProfile(updatedUser);
            
        } else {
            setIsEditingProfile(true);
        }
    };

    const handleCancelEdit = () => {
        setEditName(user.name);
        setEditEmail(user.email);
        setIsEditingProfile(false);
    };

    const handleNotificationToggle = (setting: keyof NotificationSettings) => {
        setNotificationSettings(prev => ({
            ...prev,
            [setting]: !prev[setting]
        }));
    };

    const handleProximityRadiusChange = (value: string) => {
        // Only allow numbers
        const numericValue = value.replace(/[^0-9]/g, '');
        if (numericValue === '' || (parseInt(numericValue) >= 1 && parseInt(numericValue) <= 99)) {
            setNotificationSettings(prev => ({
                ...prev,
                proximityRadius: numericValue
            }));
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleSettingsPress = (setting: string) => {
        Alert.alert(setting, `${setting} functionality will be implemented here`);
    };

    // Generate initials for avatar if no image
    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'More',
                    headerStyle: { backgroundColor: '#fff' },
                    headerTitleStyle: { color: '#000', fontSize: 20, fontWeight: '600' },
                    headerShadowVisible: false,
                }}
            />

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* User Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.profileCard}>
                        <View style={styles.profileInfo}>
                            <View style={styles.avatarContainer}>
                                <Ionicons name="person" size={32} color="#666" />
                                {/* {user.avatar ? (
                                    <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={styles.avatarText}>
                                        {getInitials(user.name)}
                                    </Text>
                                )} */}
                            </View>
                            <View style={styles.profileText}>
                                {isEditingProfile ? (
                                    <>
                                        <TextInput
                                            style={styles.editInput}
                                            value={editName}
                                            onChangeText={setEditName}
                                            placeholder="Enter name"
                                            maxLength={50}
                                        />
                                        <TextInput
                                            style={styles.editInput}
                                            value={editEmail}
                                            onChangeText={setEditEmail}
                                            placeholder="Enter email"
                                            keyboardType="email-address"
                                            maxLength={100}
                                            autoCapitalize="none"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.userName}>{user.name}</Text>
                                        <Text style={styles.userEmail}>{user.email}</Text>
                                        {/* {authUser?.id && (
                                            <Text style={styles.userId}>ID: {authUser.id}</Text>
                                        )} */}
                                    </>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.editButton, isEditingProfile && styles.saveButton]}
                            onPress={handleProfileEdit}
                        >
                            <Text style={styles.editButtonText}>
                                {isEditingProfile ? 'Save' : 'Edit'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {isEditingProfile && (
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancelEdit}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Account Status Section */}
                {/* <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Status</Text>
                    <View style={styles.statusCard}>
                        <View style={styles.statusItem}>
                            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                            <Text style={styles.statusText}>
                                {authUser ? 'Logged in' : 'Not logged in'}
                            </Text>
                        </View>
                        {authUser && (
                            <View style={styles.statusItem}>
                                <Ionicons name="time-outline" size={24} color="#0066CC" />
                                <Text style={styles.statusText}>
                                    Active session
                                </Text>
                            </View>
                        )}
                    </View>
                </View> */}

                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    
                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="notifications-outline" size={24} color="#0066CC" />
                            <Text style={styles.settingText}>Enable notifications</Text>
                        </View>
                        <Switch
                            value={notificationSettings.enableNotifications}
                            onValueChange={() => handleNotificationToggle('enableNotifications')}
                            trackColor={{ false: '#e0e0e0', true: '#0066CC' }}
                            thumbColor="#fff"
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="location-outline" size={24} color="#0066CC" />
                            <Text style={styles.settingText}>Enable proximity notifications</Text>
                        </View>
                        <Switch
                            value={notificationSettings.enableProximityNotifications}
                            onValueChange={() => handleNotificationToggle('enableProximityNotifications')}
                            trackColor={{ false: '#e0e0e0', true: '#0066CC' }}
                            thumbColor="#fff"
                            disabled={!notificationSettings.enableNotifications}
                        />
                    </View>

                    <View style={[
                        styles.settingItem, 
                        (!notificationSettings.enableNotifications || !notificationSettings.enableProximityNotifications) && styles.disabledSetting
                    ]}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="radio-outline" size={24} color="#0066CC" />
                            <Text style={styles.settingText}>Proximity notification radius</Text>
                        </View>
                        <View style={styles.radiusContainer}>
                            <Text style={styles.radiusUnit}>km</Text>
                            <TextInput
                                style={[
                                    styles.radiusInput,
                                    (!notificationSettings.enableNotifications || !notificationSettings.enableProximityNotifications) && styles.disabledInput
                                ]}
                                value={notificationSettings.proximityRadius}
                                onChangeText={handleProximityRadiusChange}
                                keyboardType="numeric"
                                maxLength={2}
                                editable={notificationSettings.enableNotifications && notificationSettings.enableProximityNotifications}
                            />
                        </View>
                    </View>
                </View>

                {/* Logout Section */}
                <View style={styles.section}>
                    <TouchableOpacity 
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={24} color="#ff4444" />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    profileSection: {
        marginBottom: 24,
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    profileInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
          backgroundColor: '#f0f8ff',
        // backgroundColor: '#0066CC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    profileText: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    userId: {
        fontSize: 12,
        color: '#999',
        fontFamily: 'monospace',
    },
    editInput: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#0066CC',
        paddingVertical: 4,
        marginBottom: 8,
    },
    editButton: {
        backgroundColor: '#0066CC',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    saveButton: {
        backgroundColor: '#28a745',
    },
    editButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    cancelButton: {
        alignSelf: 'center',
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 16,
    },
    statusCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusText: {
        fontSize: 14,
        color: '#000',
        marginLeft: 12,
        fontWeight: '500',
    },
    settingItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    disabledSetting: {
        opacity: 0.5,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        fontSize: 14,
        color: '#000',
        marginLeft: 12,
    },
    radiusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radiusInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        width: 50,
        textAlign: 'center',
        fontSize: 16,
        color: '#000',
        marginLeft: 8,
        backgroundColor: '#fff',
    },
    disabledInput: {
        backgroundColor: '#f5f5f5',
        color: '#999',
    },
    radiusUnit: {
        fontSize: 16,
        color: '#666',
        marginLeft: 8,
    },
    logoutButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    logoutText: {
        color: '#ff4444',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});