import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#1E1E1E',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Cài Đặt' }} />
            <Stack.Screen name="pomodoro-interface" options={{ title: 'Giao Diện Pomodoro' }} />
        </Stack>
    );
}
