// services/auth/storage.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'patrol_monitoring_access_token';
const REFRESH_TOKEN_KEY = 'patrol_monitoring_refresh_token';
const EXPIRES_IN_KEY = 'patrol_monitoring_expires_in';

export const tokenStorage = {
    // Store tokens in secure storage
    storeTokens: async (accessToken: string, refreshToken: string, expiresIn: number): Promise<void> => {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        await SecureStore.setItemAsync(EXPIRES_IN_KEY, expiresIn.toString());
    },

    // Get access token
    getAccessToken: async (): Promise<string | null> => {
        return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    },

    // Get refresh token
    getRefreshToken: async (): Promise<string | null> => {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    },

    // Clear tokens on logout
    clearTokens: async (): Promise<void> => {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
};