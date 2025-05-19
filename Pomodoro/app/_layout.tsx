import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import '../firebaseConfig';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      return;
    }

    const currentRoute = segments.join('/');
    const isInAuthGroup = segments.length > 0 && segments[0] === '(auth)';

    let navigationHandled = false;

    if (!user) {
      if (!isInAuthGroup) {
        router.replace('/(auth)/login');
        navigationHandled = true;
      }
    } else {
      if (isInAuthGroup) {
        if (currentRoute !== '(auth)/change-password') {
          router.replace('/(tabs)');
          navigationHandled = true;
        }
      }
    }

    if (navigationHandled || !loading) {
        SplashScreen.hideAsync();
    }

  }, [user, loading, segments, router]);

  if (loading) {
    return null;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
