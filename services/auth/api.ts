// services/auth/api.ts
import { tokenStorage } from './storage';

const API_BASE_URL = 'http://116.203.83.167:8000/api';

// Custom error class for auth errors
export class AuthError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'AuthError';
        this.statusCode = statusCode;
    }
}

// Helper to handle API responses
const handleResponse = async (response: Response) => {
    const data = await response.json();
    console.log(data);

    if (!response.ok) {
        throw new AuthError(
            data.message || 'An error occurred during authentication',
            response.status
        );
    }

    return data;
};

export const authApi = {
    // Login user and get tokens
    login: async (email: string, password: string) => {
        console.log('Logging in...' + `${API_BASE_URL}/auth/login`);
        console.log(email, password);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ email: email, password: password }),
            });

            console.log('request sent')
            //console.log(response.json());

            return handleResponse(response);
        } catch (e) {
            console.error(e)
        }


    },

    // Register user and get tokens
    register: async (email: string, password: string, name: string, phone_number: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ email, password, name, phone_number}),
        });
        return handleResponse(response);
    },

    // Refresh token
    refreshToken: async (refreshToken: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        return handleResponse(response);
    },

    // Request password reset
    requestPasswordReset: async (email: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/password-reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        return handleResponse(response);
    },

    // Get current user data
    getCurrentUser: async () => {
        const token = await tokenStorage.getAccessToken();

        if (!token) {
            throw new AuthError('No access token found', 401);
        }

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        return handleResponse(response);
    },

    // Logout (optional server-side logout)
    logout: async () => {
        const token = await tokenStorage.getAccessToken();

        if (!token) {
            return;
        }

        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        } catch (error) {
            // Ignore errors on logout - we'll clear tokens locally anyway
            console.warn('Error during server logout:', error);
        }
    },
};