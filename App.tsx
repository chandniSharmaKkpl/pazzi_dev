import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';

// Keep splash screen visible while loading fonts and initializing app
SplashScreen.preventAutoHideAsync();

export default function App() {
  // Load custom fonts if needed
  console.log('usao')
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('./assets/fonts/Inter-Regular.otf'),
    'Inter-Bold': require('./assets/fonts/Inter-Bold.otf'),
    'Inter-Medium': require('./assets/fonts/Inter-Medium.otf'),
  });

  useEffect(() => {
    async function prepare() {
      if (fontsLoaded) {
        // Hide splash screen once fonts are loaded
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, [fontsLoaded]);

  // Wait until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <Stack
              screenOptions={{
                headerShown: false,
              }}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
  );
}
