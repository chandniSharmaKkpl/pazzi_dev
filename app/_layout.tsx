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
      isLoading
    });

    // TEMPORARILY DISABLE ALL NAVIGATION LOGIC FOR DEBUGGING
    // This will allow registration to work without any redirects
    
    // Only allow navigation to tabs if user is authenticated and on auth/welcome
    if (isAuthenticated && (inAuthGroup || inWelcome)) {
      console.log('🔄 Redirecting to tabs - user authenticated');
      router.replace('/(tabs)');
    }
    
    // Don't redirect from auth pages to welcome - let registration work
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