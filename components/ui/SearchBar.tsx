import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';

interface SearchBarProps {
    placeholder?: string;
    onSearch?: (text: string) => void;
    onVoiceInput?: () => void;
}

export function SearchBar({ placeholder = 'Search...', onSearch, onVoiceInput }: SearchBarProps) {
    const { theme } = useTheme();

    return (
        <View style={[
            styles.container,
            { backgroundColor: COLORS[theme].backgroundSecondary }
        ]}>
            <Ionicons name="search" size={24} color={COLORS[theme].textSecondary} style={styles.searchIcon} />
            <TextInput
                style={[styles.input, { color: COLORS[theme].text }]}
                placeholder={placeholder}
                placeholderTextColor={COLORS[theme].textSecondary}
                onChangeText={onSearch}
                returnKeyType="search"
            />
            <TouchableOpacity onPress={onVoiceInput} style={styles.voiceButton}>
                <Ionicons name="mic" size={24} color={COLORS[theme].primary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 28,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '400',
        paddingVertical: 8,
    },
    voiceButton: {
        padding: 8,
    },
});