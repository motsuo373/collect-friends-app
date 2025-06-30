import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="profile" 
        options={{
          headerShown: true,
          title: 'プロフィール編集',
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: 'white',
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: '#333',
          },
        }}
      />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="ai-preferences" />
      <Stack.Screen name="status" />
    </Stack>
  );
}