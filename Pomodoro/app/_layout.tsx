import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext'; // Đảm bảo đường dẫn này đúng
import '../firebaseConfig';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      console.log('Auth loading...');
      return; 
    } const isInAuthGroup = segments.length > 0 && segments[0] === '(auth)';

    console.log('Auth state loaded. User:', user ? user.uid : 'null', 'Segments:', segments, 'InAuthGroup:', isInAuthGroup);

    if (!user) {
      if (!isInAuthGroup) {
        console.log('Redirecting to login (user not found, not in auth group)');
        router.replace('/(auth)/login');
      }} else {if (isInAuthGroup) {
        console.log('Redirecting to home (user found, was in auth group)');
        router.replace('/(tabs)');
      }}
      console.log('Hiding SplashScreen');
    SplashScreen.hideAsync();

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