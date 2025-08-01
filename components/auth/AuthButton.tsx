// components/auth/AuthButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

type AuthButtonProps = {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'outline';
};

export const AuthButton = ({
                               title,
                               onPress,
                               isLoading = false,
                               disabled = false,
                               variant = 'primary',
                           }: AuthButtonProps) => {
    const getButtonStyle = () => {
        if (disabled) return [styles.button, styles.disabled];

        switch (variant) {
            case 'secondary':
                return [styles.button, styles.secondaryButton];
            case 'outline':
                return [styles.button, styles.outlineButton];
            default:
                return [styles.button, styles.primaryButton];
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'outline':
                return [styles.buttonText, styles.outlineButtonText];
            default:
                return [styles.buttonText, styles.primaryButtonText];
        }
    };

    return (
        <TouchableOpacity
            style={getButtonStyle()}
            onPress={onPress}
            disabled={disabled || isLoading}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ disabled: disabled || isLoading }}
        >
            {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
            ) : (
                <Text style={getTextStyle()}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    primaryButton: {
        backgroundColor: '#0066CC',
    },
    secondaryButton: {
        backgroundColor: '#34C759',
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#0066CC',
    },
    disabled: {
        backgroundColor: '#CCCCCC',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    primaryButtonText: {
        color: '#FFFFFF',
    },
    outlineButtonText: {
        color: '#0066CC',
    },
});