// Color palette definition
export const COLORS = {
    light: {
        primary: '#0066CC',
        success: '#34C759',
        error: '#FF3B30',
        warning: '#FF9500',
        background: '#F2F2F7',
        backgroundSecondary: '#FFFFFF',
        backgroundTertiary: '#E9E9EB',
        text: '#000000',
        textSecondary: '#6E6E73',
        border: '#E0E0E0',
    },
    dark: {
        primary: '#0A84FF',
        success: '#30D158',
        error: '#FF453A',
        warning: '#FF9F0A',
        background: '#1C1C1E',
        backgroundSecondary: '#2C2C2E',
        backgroundTertiary: '#3A3A3C',
        text: '#FFFFFF',
        textSecondary: '#98989F',
        border: '#38383A',
    },
};

export const PATROL_COLORS = {
    highProbability: '#FF3B30', // Red
    mediumProbability: '#FF9500', // Orange
    lowProbability: '#FFCC00', // Yellow
    historical: '#8E8E93', // Gray
};

export default {
    COLORS,
    PATROL_COLORS,
};