// context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { authApi } from '../services/auth/api';
import { tokenStorage } from '../services/auth/storage';
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = {
    id: string;
    email: string;
    name: string;
    // Add other user properties as needed
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    refreshToken: () => Promise<boolean>;
    register: (email: string, password: string, name: string, phone_number: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Check for existing token on app launch
        const loadStoredAuth = async () => {
            try {
                setIsLoading(true);
                const token = await tokenStorage.getAccessToken();
                if (token) {
                    setToken(token); // Set token for WebSocket
                    setIsAuthenticated(true);
                    try {
                        const userData = await authApi.getCurrentUser();
                        setUser({ id: userData.id, name: userData.name, email: userData.email });
                    } catch (error) {
                        setUser(null);
                        setToken(null);
                    }
                } else {
                    setIsAuthenticated(false);
                    setToken(null);
                }
            } catch (error) {
                await tokenStorage.clearTokens();
                setIsAuthenticated(false);
                setToken(null);
            } finally {
                setIsLoading(false);
            }
        };
        loadStoredAuth();
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { accessToken, refreshToken, userId, name, role, expiresIn, profileImage } = await authApi.login(email, password);
            await tokenStorage.storeTokens(accessToken, refreshToken, expiresIn);
            setUser({ id: userId, name, email });
            setToken(accessToken); // Set token for WebSocket
            setIsAuthenticated(true);
        } catch (error) {
            setIsAuthenticated(false);
            setToken(null);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            setIsLoading(true);
            await authApi.logout();
            await tokenStorage.clearTokens();
            setUser(null);
            setToken(null); // Clear token for WebSocket
            setIsAuthenticated(false);

            // Navigate to login
            router.replace('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear tokens on client side even if server logout fails
            await tokenStorage.clearTokens();
            setUser(null);
            setToken(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const forgotPassword = async (email: string) => {
        // Dummy forgot password for testing - always resolves after a short delay
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, 1000);
        });
    };

    const refreshToken = async (): Promise<boolean> => {
        try {
            const currentRefreshToken = await tokenStorage.getRefreshToken();

            if (!currentRefreshToken) {
                return false;
            }

            const { accessToken, refreshToken: newRefreshToken } =
                await authApi.refreshToken(currentRefreshToken);

            await tokenStorage.storeTokens(accessToken, newRefreshToken, 1600);
            return true;
        } catch (error) {
            // If refresh fails, log the user out
            await logout();
            return false;
        }
    };

    const register = async (email: string, password: string, name: string, phone_number: string,) => {
        try {
            setIsLoading(true);
            const response = await authApi.register(email, password, name, phone_number,);
            console.log('Registration response:', response);
            
            // Registration successful - response contains: user_id, message, email, name
            // No tokens returned from registration, user needs to login separately
            // Don't set authentication state here
            
        } catch (error) {
            console.error('Registration error in context:', error);
            // Don't change authentication state on registration error
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                token,
                login,
                logout,
                forgotPassword,
                refreshToken,
                register,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};