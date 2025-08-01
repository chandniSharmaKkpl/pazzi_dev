// components/auth/PasswordInput.tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type PasswordInputProps = {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    error?: string;
    placeholder?: string;
};

export const PasswordInput = ({
                                  label,
                                  value,
                                  onChangeText,
                                  error,
                                  placeholder = 'Enter password',
                              }: PasswordInputProps) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
    <TextInput
        style={styles.input}
    value={value}
    onChangeText={onChangeText}
    secureTextEntry={!showPassword}
    placeholder={placeholder}
    autoCapitalize="none"
    accessibilityLabel={label}
    />
    <TouchableOpacity
    style={styles.visibilityBtn}
    onPress={() => setShowPassword(!showPassword)}
    accessibilityRole="button"
    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
    >
    <Ionicons
        name={showPassword ? 'eye-off' : 'eye'}
    size={24}
    color="#757575"
        />
        </TouchableOpacity>
        </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
    };

    const styles = StyleSheet.create({
        container: {
            marginBottom: 16,
        },
        label: {
            fontSize: 16,
            fontWeight: '500',
            marginBottom: 8,
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            height: 50,
            borderWidth: 1,
            borderColor: '#DDDDDD',
            borderRadius: 8,
        },
        input: {
            flex: 1,
            height: '100%',
            paddingHorizontal: 12,
            fontSize: 16,
        },
        inputError: {
            borderColor: '#FF3B30',
        },
        visibilityBtn: {
            padding: 10,
        },
        errorText: {
            color: '#FF3B30',
            fontSize: 14,
            marginTop: 4,
        },
    });