import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '../../context/NavigationContext';

let PointAnnotation: any = null;

try {
  const mapboxModule = require('@rnmapbox/maps');
  PointAnnotation = mapboxModule.PointAnnotation;
  console.log('✅ Mapbox PointAnnotation loaded in UserLocationMarker');
} catch (error) {
  console.warn('❌ Mapbox PointAnnotation not available:', error);
}

interface UserLocationMarkerProps {
  coordinate: [number, number];
}

export function UserLocationMarker({ coordinate }: UserLocationMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { isNavigating } = useNavigation();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, 100); // delay start for reliable initial render

    return () => clearTimeout(timeout);
  }, []);

  const validCoordinate = useMemo(() => {
    if (
      coordinate &&
      Array.isArray(coordinate) &&
      coordinate.length === 2 &&
      typeof coordinate[0] === 'number' &&
      typeof coordinate[1] === 'number'
    ) {
      return coordinate as [number, number];
    }
    return null;
  }, [coordinate]);

  // Check if PointAnnotation and validCoordinate are available, or if navigation is active
  if (!PointAnnotation || !validCoordinate || isNavigating) return null;



  return (
    <PointAnnotation id="user-location-marker" coordinate={validCoordinate}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#4285F4',
          opacity: 0.3,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 4,
          borderColor: '#4285F4',
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#4285F4',
            borderWidth: 3,
            borderColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#fff',
            }}
          />
        </View>
      </View>
    </PointAnnotation>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4285F4',
    zIndex: 0, // make sure it's behind
    opacity: 0.4, // ensure it's visible before animation kicks in
  },
  coreDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4', // Blue background
    borderWidth: 3,
    borderColor: '#fff', // White border
    zIndex: 1,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff', // White center
    position: 'absolute',
    zIndex: 2,
  },
});
