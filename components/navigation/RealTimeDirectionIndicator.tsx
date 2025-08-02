import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RealTimeDirectionIndicatorProps {
    direction: 'straight' | 'left' | 'right' | 'sharp-left' | 'sharp-right' | 'slight-left' | 'slight-right' | 'u-turn';
    distance: number;
    isVisible: boolean;
}

export const RealTimeDirectionIndicator: React.FC<RealTimeDirectionIndicatorProps> = ({
    direction,
    distance,
    isVisible
}) => {
    // Add error boundary protection
    try {
        if (!isVisible) return null;

    const getDirectionIcon = (dir: string) => {
        const iconSize = 28;
        const iconColor = "#fff";
        
        switch (dir) {
            case 'left':
                return <MaterialCommunityIcons name="arrow-left-thick" size={iconSize} color={iconColor} />;
            case 'right':
                return <MaterialCommunityIcons name="arrow-right-thick" size={iconSize} color={iconColor} />;
            case 'sharp-left':
                return <MaterialCommunityIcons name="arrow-top-left-thick" size={iconSize} color={iconColor} />;
            case 'sharp-right':
                return <MaterialCommunityIcons name="arrow-top-right-thick" size={iconSize} color={iconColor} />;
            case 'slight-left':
                return <MaterialCommunityIcons name="arrow-top-left" size={iconSize} color={iconColor} />;
            case 'slight-right':
                return <MaterialCommunityIcons name="arrow-top-right" size={iconSize} color={iconColor} />;
            case 'u-turn':
                return <MaterialCommunityIcons name="backup-restore" size={iconSize} color={iconColor} />;
            case 'straight':
            default:
                return <MaterialCommunityIcons name="arrow-up-thick" size={iconSize} color={iconColor} />;
        }
    };

    const getDirectionText = (dir: string) => {
        switch (dir) {
            case 'left': return 'Left Turn';
            case 'right': return 'Right Turn';
            case 'sharp-left': return 'Sharp Left';
            case 'sharp-right': return 'Sharp Right';
            case 'slight-left': return 'Slight Left';
            case 'slight-right': return 'Slight Right';
            case 'u-turn': return 'U-Turn';
            case 'straight':
            default: return 'Continue Straight';
        }
    };

    const formatDistance = (dist: number) => {
        if (dist >= 1000) {
            return `${(dist / 1000).toFixed(1)} km`;
        }
        return `${Math.round(dist)} m`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                {getDirectionIcon(direction)}
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.directionText}>{getDirectionText(direction)}</Text>
                {distance > 0 && (
                    <Text style={styles.distanceText}>in {formatDistance(distance)}</Text>
                )}
            </View>
        </View>
    );
    } catch (error) {
        console.error('❌ Error in RealTimeDirectionIndicator:', error);
        return null;
    }
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        backgroundColor: '#00897B',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
        zIndex: 1000,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    textContainer: {
        flex: 1,
    },
    directionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    distanceText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
    },
});

export default RealTimeDirectionIndicator;