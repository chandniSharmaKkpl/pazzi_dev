import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

interface AppContextType {
    isOnline: boolean;
    appState: AppStateStatus;
    isFirstLaunch: boolean;
    hasCompletedOnboarding: boolean;
    setHasCompletedOnboarding: (completed: boolean) => void;
    lastActive: number;
}

const AppContext = createContext<AppContextType>({
    isOnline: true,
    appState: AppState.currentState,
    isFirstLaunch: true,
    hasCompletedOnboarding: false,
    setHasCompletedOnboarding: () => {},
    lastActive: Date.now(),
});

export const useApp = () => useContext(AppContext);

interface AppProviderProps {
    children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [appState, setAppState] = useState(AppState.currentState);
    const [isFirstLaunch, setIsFirstLaunch] = useState(true);
    const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);
    const [lastActive, setLastActive] = useState(Date.now());

    // Check internet connectivity
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected || false);
        });

        return () => unsubscribe();
    }, []);

    // Track app state (foreground, background)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState !== nextAppState) {
                if (nextAppState === 'active') {
                    setLastActive(Date.now());
                }
                setAppState(nextAppState);
            }
        });

        return () => subscription.remove();
    }, [appState]);

    // Check if this is the first app launch
    useEffect(() => {
        AsyncStorage.getItem('hasLaunched').then(value => {
            if (value === null) {
                AsyncStorage.setItem('hasLaunched', 'true');
                setIsFirstLaunch(true);
            } else {
                setIsFirstLaunch(false);
            }
        }).catch(err => {
            console.error('Error checking first launch:', err);
            setIsFirstLaunch(false);
        });
    }, []);

    // Check if user has completed onboarding
    useEffect(() => {
        AsyncStorage.getItem('hasCompletedOnboarding').then(value => {
            setHasCompletedOnboardingState(value === 'true');
        }).catch(err => {
            console.error('Error checking onboarding status:', err);
        });
    }, []);

    // Set onboarding completion status
    const setHasCompletedOnboarding = (completed: boolean) => {
        AsyncStorage.setItem('hasCompletedOnboarding', completed ? 'true' : 'false')
            .then(() => {
                setHasCompletedOnboardingState(completed);
            })
            .catch(err => {
                console.error('Error saving onboarding status:', err);
            });
    };

    return (
        <AppContext.Provider
            value={{
                isOnline,
                appState,
                isFirstLaunch,
                hasCompletedOnboarding,
                setHasCompletedOnboarding,
                lastActive
            }}
        >
            {children}
        </AppContext.Provider>
    );
};