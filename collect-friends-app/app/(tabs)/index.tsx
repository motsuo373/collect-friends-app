import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity, Alert, View, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
// import tw from 'twrnc'; // TailwindCSS風のスタイリング（twrncインストール後にコメントアウトを外してください）

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// チャットデータの型定義
interface ChatData {
  text: string;
  user: string;
}

export default function HomeScreen() {
  const [chat, setChat] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchChatData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'chats', 'rU9oWDU53frpJGT5nvQ4');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as ChatData;
        setChat(data);
        Alert.alert('成功', 'Firestoreからデータを取得しました！');
      } else {
        setChat({ text: 'データが見つかりません', user: 'Unknown' });
        Alert.alert('情報', 'ドキュメントが存在しません');
      }
    } catch (error) {
      console.error('Error fetching document: ', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('エラー', 'データの取得に失敗しました: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* Firestore接続テスト用のセクション */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Firestore接続テスト</ThemedText>
        <TouchableOpacity 
          style={styles.button} 
          onPress={fetchChatData}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'データ取得中...' : 'Firestoreからチャットデータを取得'}
          </ThemedText>
        </TouchableOpacity>
        
        {chat && (
          <ThemedView style={styles.chatContainer}>
            <ThemedText type="defaultSemiBold">取得したデータ:</ThemedText>
            <ThemedText>ユーザー: {chat.user}</ThemedText>
            <ThemedText>メッセージ: {chat.text}</ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* TailwindCSS（twrnc）を使ったスタイリング例 */}
      {/* twrncインストール後、以下のコメントアウトを外してください */}
      {/*
      <View style={tw`bg-white p-4 m-4 rounded-lg shadow-lg`}>
        <Text style={tw`text-xl font-bold text-blue-600 mb-2`}>TailwindCSS例</Text>
        <Text style={tw`text-gray-700 mb-4`}>これはtwrncを使ったスタイリング例です</Text>
        <TouchableOpacity style={tw`bg-green-500 p-3 rounded-lg`}>
          <Text style={tw`text-white text-center font-semibold`}>TailwindCSSボタン</Text>
        </TouchableOpacity>
      </View>
      */}

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  chatContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
});
