import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => {},
    setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
    children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<Theme>('light');
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        // Load saved theme from AsyncStorage
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('theme');
                if (savedTheme === 'light' || savedTheme === 'dark') {
                    setThemeState(savedTheme);
                } else {
                    // Use system theme if no saved theme
                    setThemeState(systemColorScheme as Theme || 'light');
                }
                setInitialized(true);
            } catch (error) {
                console.error('Error loading theme:', error);
                setThemeState(systemColorScheme as Theme || 'light');
                setInitialized(true);
            }
        };

        loadTheme();
    }, [systemColorScheme]);

    // Update when system theme changes
    useEffect(() => {
        if (initialized && !AsyncStorage.getItem('theme')) {
            setThemeState(systemColorScheme as Theme || 'light');
        }
    }, [systemColorScheme, initialized]);

    const setTheme = async (newTheme: Theme) => {
        try {
            await AsyncStorage.setItem('theme', newTheme);
            setThemeState(newTheme);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};