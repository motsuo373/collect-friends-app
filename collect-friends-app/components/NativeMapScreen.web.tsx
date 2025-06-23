import React from 'react';
import { View, Text } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import tw from 'twrnc';

// Web環境では使用されないダミーコンポーネント
export default function NativeMapScreen() {
  return (
    <ThemedView style={tw`flex-1 justify-center items-center bg-gray-100`}>
      <ThemedText>Web環境ではWebMapを使用します</ThemedText>
    </ThemedView>
  );
} 