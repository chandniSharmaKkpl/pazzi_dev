// app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AppProvider } from '../context/AppContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { LocationProvider } from '../context/LocationContext';
import { NavigationProvider } from '../context/NavigationContext';

function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    
    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const inWelcome = segments[0] === undefined;
    const inOnboarding = segments[0] === 'onboarding';
    const inPatrol = segments[0] === 'patrol';
    const inReport = segments[0] === 'report';
    const inSettings = segments[0] === 'settings';

    console.log('🔍 Navigation Debug:', {
      isAuthenticated,
      segments: segments[0],
      inAuthGroup,
      inTabsGroup,
      inWelcome,
      isLoading,
      fullSegments: segments
    });

    // CRITICAL: Prevent any navigation if we're in auth screens
    // This stops unwanted redirects during registration/login errors
    if (inAuthGroup) {
      console.log('🚫 In auth group - preventing any auto-navigation');
      return;
    }

    // Only allow these specific navigation scenarios:
    // 1. Authenticated user in welcome -> redirect to tabs
    // 2. Unauthenticated user in tabs -> redirect to welcome
    
    if (isAuthenticated && inWelcome) {
      console.log('🔄 Redirecting to tabs - user authenticated from welcome');
      router.replace('/(tabs)');
    } else if (!isAuthenticated && inTabsGroup) {
      console.log('🔄 Redirecting to welcome - user not authenticated');
      router.replace('/');
    }
    
    // All other cases: do nothing, let user stay where they are
  }, [isAuthenticated, isLoading, router, segments]);

  return { isLoading };
}

function RootLayoutNavigator() {
  const { isLoading } = useProtectedRoute();
  if (isLoading) return null;
  return <Slot />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AuthProvider>
          <LocationProvider>
            <WebSocketWithToken>
              <NavigationProvider>
                <RootLayoutNavigator />
              </NavigationProvider>
            </WebSocketWithToken>
          </LocationProvider>
        </AuthProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

// Helper component to get token from AuthContext and pass to WebSocketProvider
function WebSocketWithToken({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return <WebSocketProvider token={token}>{children}</WebSocketProvider>;
}