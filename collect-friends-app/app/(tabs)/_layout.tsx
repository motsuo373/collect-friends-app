import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Icons } from '@/utils/iconHelper';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#687076',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.1)',
          },
          default: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.1)',
            height: 60,
          },
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginBottom: -4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'マップ',
          tabBarIcon: ({ color, size }) => (
            <Icons.MapPin 
              size={Platform.select({ ios: 24, default: 22 })} 
              color={color} 
              strokeWidth={2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'フレンド',
          tabBarIcon: ({ color, size }) => (
            <Icons.Users 
              size={Platform.select({ ios: 24, default: 22 })} 
              color={color} 
              strokeWidth={2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'AI提案',
          tabBarIcon: ({ color, size }) => (
            <Icons.Sparkles 
              size={Platform.select({ ios: 24, default: 22 })} 
              color={color} 
              strokeWidth={2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'チャット',
          tabBarIcon: ({ color, size }) => (
            <Icons.MessageCircle 
              size={Platform.select({ ios: 24, default: 22 })} 
              color={color} 
              strokeWidth={2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => (
            <Icons.Settings 
              size={Platform.select({ ios: 24, default: 22 })} 
              color={color} 
              strokeWidth={2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
