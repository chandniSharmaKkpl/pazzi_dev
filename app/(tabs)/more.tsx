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
    
    const [user, setUser] = useState<User>({
        name: 'Firstname Lastname',
        email: 'email@mail.com'
    });
    
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        enableNotifications: true,
        enableProximityNotifications: true,
        proximityRadius: 'km'
    });

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(user.name);
    const [editEmail, setEditEmail] = useState(user.email);

    const { logout } = useAuth();

    useEffect(() => {
        console.log('🚀 MoreScreen: Component mounted');
    }, []);

    const handleProfileEdit = () => {
        if (isEditingProfile) {
            // Save changes
            setUser({
                ...user,
                name: editName,
                email: editEmail
            });
            setIsEditingProfile(false);
            Alert.alert('Success', 'Profile updated successfully!');
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
        setNotificationSettings(prev => ({
            ...prev,
            proximityRadius: numericValue
        }));
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
                        await logout();
                    }
                }
            ]
        );
    };

    const handleSettingsPress = (setting: string) => {
        Alert.alert(setting, `${setting} functionality will be implemented here`);
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
                            </View>
                            <View style={styles.profileText}>
                                {isEditingProfile ? (
                                    <>
                                        <TextInput
                                            style={styles.editInput}
                                            value={editName}
                                            onChangeText={setEditName}
                                            placeholder="Enter name"
                                        />
                                        <TextInput
                                            style={styles.editInput}
                                            value={editEmail}
                                            onChangeText={setEditEmail}
                                            placeholder="Enter email"
                                            keyboardType="email-address"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.userName}>{user.name}</Text>
                                        <Text style={styles.userEmail}>{user.email}</Text>
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
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="radio-outline" size={24} color="#0066CC" />
                            <Text style={styles.settingText}>Proximity notification radius</Text>
                        </View>
                        <View style={styles.radiusContainer}>
                           
                            <Text style={styles.radiusUnit}>km</Text>
                            <TextInput
                                style={styles.radiusInput}
                                value={notificationSettings.proximityRadius}
                                onChangeText={handleProximityRadiusChange}
                                keyboardType="numeric"
                                maxLength={2}
                            />
                        </View>
                    </View>
                </View>

                {/* Settings Section */}
                {/* <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>
                    
                    <TouchableOpacity 
                        style={styles.settingItem}
                        onPress={() => handleSettingsPress('Privacy Policy')}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="shield-outline" size={24} color="#0066CC" />
                            <Text style={styles.settingText}>Privacy Policy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.settingItem}
                        onPress={() => handleSettingsPress('Terms of Service')}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="document-text-outline" size={24} color="#0066CC" />
                            <Text style={styles.settingText}>Terms of Service</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.settingItem}
                        onPress={() => handleSettingsPress('About')}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
                            <Text style={styles.settingText}>About</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.settingItem}
                        onPress={() => handleSettingsPress('Help & Support')}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="help-circle-outline" size={24} color="#0066CC" />
                            <Text style={styles.settingText}>Help & Support</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View> */}

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

                {/* App Version */}
                {/* <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>App Version: 1.0.0</Text>
                </View> */}
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
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 3,
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
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
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
    },
    editInput: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#0066CC',
        paddingVertical: 4,
        marginBottom: 4,
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
    settingItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.05,
        // shadowRadius: 2,
        // elevation: 1,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        fontSize: 14,
        color: '#000',
        marginLeft: 8,
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
        marginLeft:5
    },
    radiusUnit: {
        marginLeft: 18,
        fontSize: 16,
        color: '#666',
    },
    logoutButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.05,
        // shadowRadius: 2,
        // elevation: 1,
    },
    logoutText: {
        color: '#ff4444',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    versionText: {
        fontSize: 14,
        color: '#999',
    },
});