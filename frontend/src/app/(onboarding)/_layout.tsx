import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="pair" />
      <Stack.Screen name="quiz" />
    </Stack>
  );
}
