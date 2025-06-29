import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { router } from 'expo-router';
import { generateAllMockData } from '../../utils/mockDataGenerator';
import tw from 'twrnc';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mockDataLoading, setMockDataLoading] = useState(false);

  const handleLogout = async () => {
    // Web版とモバイル版で確認ダイアログを分岐
    if (Platform.OS === 'web') {
      // Web版では標準のconfirm()を使用
      const shouldLogout = window.confirm('ログアウトしますか？');
      if (shouldLogout) {
        await performLogout();
      }
    } else {
      // モバイル版ではAlert.alertを使用
      Alert.alert(
        'ログアウト',
        'ログアウトしますか？',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: 'ログアウト',
            style: 'destructive',
            onPress: async () => {
              await performLogout();
            },
          },
        ]
      );
    }
  };

  const performLogout = async () => {
    setLoading(true);
    try {
      console.log('ログアウト処理を開始します');
      await signOut();
      console.log('ログアウト処理が完了しました');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      
      // エラーメッセージもWeb版とモバイル版で分岐
      if (Platform.OS === 'web') {
        window.alert('ログアウトに失敗しました');
      } else {
        Alert.alert('エラー', 'ログアウトに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMockData = async () => {
    if (!user?.uid) {
      Alert.alert('エラー', 'ユーザー情報が取得できません');
      return;
    }

    // 確認ダイアログ
    if (Platform.OS === 'web') {
      const shouldGenerate = window.confirm(
        '仮データを生成しますか？このアクションは元に戻せません。\n\n' +
        '以下のデータが作成されます：\n' +
        '• 5人の仮ユーザー\n' +
        '• 各ユーザーの位置情報\n' +
        '• あなたとの友人関係'
      );
      if (shouldGenerate) {
        await performMockDataGeneration();
      }
    } else {
      Alert.alert(
        '仮データ生成',
        '仮データを生成しますか？このアクションは元に戻せません。\n\n' +
        '以下のデータが作成されます：\n' +
        '• 5人の仮ユーザー\n' +
        '• 各ユーザーの位置情報\n' +
        '• あなたとの友人関係',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: '生成する',
            style: 'default',
            onPress: async () => {
              await performMockDataGeneration();
            },
          },
        ]
      );
    }
  };

  const performMockDataGeneration = async () => {
    setMockDataLoading(true);
    try {
      console.log('仮データ生成を開始します');
      await generateAllMockData(user!.uid);
      
      // 成功メッセージ
      if (Platform.OS === 'web') {
        window.alert('仮データの生成が完了しました！\nアプリを再起動して友達タブを確認してください。');
      } else {
        Alert.alert(
          '完了',
          '仮データの生成が完了しました！\nアプリを再起動して友達タブを確認してください。'
        );
      }
      
    } catch (error) {
      console.error('仮データ生成エラー:', error);
      
      // エラーメッセージ
      if (Platform.OS === 'web') {
        window.alert('仮データの生成に失敗しました。もう一度お試しください。');
      } else {
        Alert.alert('エラー', '仮データの生成に失敗しました。もう一度お試しください。');
      }
    } finally {
      setMockDataLoading(false);
    }
  };

  const navigateToSetting = (path: string) => {
    router.push(`/settings/${path}` as any);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <ScrollView contentContainerStyle={tw`flex-grow`}>
        <ThemedView style={tw`flex-1 px-4 pt-2 pb-5`}>
          {/* ヘッダー */}
          <View style={tw`mb-7`}>
            <ThemedText style={tw`text-3xl font-bold text-gray-800`}>設定</ThemedText>
          </View>

          {/* ユーザー情報セクション */}
          <View style={tw`mb-7`}>
            <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>ユーザー情報</Text>
            <View style={tw`bg-white rounded-xl p-5 shadow-sm`}>
              <View style={tw`flex-row justify-between mb-3`}>
                <Text style={tw`text-base text-gray-600 font-medium`}>ユーザー名:</Text>
                <Text style={tw`text-base text-gray-800 font-semibold flex-1 text-right`}>
                  {user?.displayName || 'ユーザー名未設定'}
                </Text>
              </View>
              <View style={tw`flex-row justify-between mb-3`}>
                <Text style={tw`text-base text-gray-600 font-medium`}>メールアドレス:</Text>
                <Text style={tw`text-base text-gray-800 font-semibold flex-1 text-right`}>{user?.email}</Text>
              </View>
              <View style={tw`flex-row justify-between`}>
                <Text style={tw`text-base text-gray-600 font-medium`}>ユーザーID:</Text>
                <Text style={tw`text-base text-gray-800 font-semibold flex-1 text-right`}>{user?.uid}</Text>
              </View>
            </View>
          </View>

          {/* アプリ設定セクション */}
          <View style={tw`mb-7`}>
            <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>アプリ設定</Text>
            
            <TouchableOpacity 
              style={tw`bg-white rounded-xl p-4 mb-2 flex-row justify-between items-center shadow-sm`}
              onPress={() => navigateToSetting('profile')}
            >
              <Text style={tw`text-base text-gray-800 font-medium`}>プロフィール編集</Text>
              <Text style={tw`text-xl text-gray-300 font-light`}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={tw`bg-white rounded-xl p-4 mb-2 flex-row justify-between items-center shadow-sm`}
              onPress={() => navigateToSetting('notifications')}
            >
              <Text style={tw`text-base text-gray-800 font-medium`}>通知設定</Text>
              <Text style={tw`text-xl text-gray-300 font-light`}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={tw`bg-white rounded-xl p-4 mb-2 flex-row justify-between items-center shadow-sm`}
              onPress={() => navigateToSetting('privacy')}
            >
              <Text style={tw`text-base text-gray-800 font-medium`}>プライバシー設定</Text>
              <Text style={tw`text-xl text-gray-300 font-light`}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={tw`bg-white rounded-xl p-4 mb-2 flex-row justify-between items-center shadow-sm`}
              onPress={() => navigateToSetting('status')}
            >
              <Text style={tw`text-base text-gray-800 font-medium`}>ステータス設定</Text>
              <Text style={tw`text-xl text-gray-300 font-light`}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={tw`bg-white rounded-xl p-4 mb-2 flex-row justify-between items-center shadow-sm`}
              onPress={() => navigateToSetting('ai-preferences')}
            >
              <Text style={tw`text-base text-gray-800 font-medium`}>AI学習設定</Text>
              <Text style={tw`text-xl text-gray-300 font-light`}>›</Text>
            </TouchableOpacity>
          </View>

          {/* サポートセクション（無効化） */}
          <View style={tw`mb-7`}>
            <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>サポート</Text>
            
            <TouchableOpacity style={tw`bg-gray-100 rounded-xl p-4 mb-2 flex-row justify-between items-center opacity-60`} disabled>
              <Text style={tw`text-base text-gray-500 font-medium`}>ヘルプ・FAQ</Text>
              <Text style={tw`text-xl text-gray-400 font-light`}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={tw`bg-gray-100 rounded-xl p-4 mb-2 flex-row justify-between items-center opacity-60`} disabled>
              <Text style={tw`text-base text-gray-500 font-medium`}>お問い合わせ</Text>
              <Text style={tw`text-xl text-gray-400 font-light`}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={tw`bg-gray-100 rounded-xl p-4 mb-2 flex-row justify-between items-center opacity-60`} disabled>
              <Text style={tw`text-base text-gray-500 font-medium`}>利用規約</Text>
              <Text style={tw`text-xl text-gray-400 font-light`}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={tw`bg-gray-100 rounded-xl p-4 mb-2 flex-row justify-between items-center opacity-60`} disabled>
              <Text style={tw`text-base text-gray-500 font-medium`}>プライバシーポリシー</Text>
              <Text style={tw`text-xl text-gray-400 font-light`}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 開発者向けセクション */}
          <View style={tw`mb-7`}>
            <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>開発者向け</Text>
            
            <TouchableOpacity
              style={[
                tw`bg-green-500 rounded-xl p-4 items-center shadow-sm mb-2`,
                mockDataLoading && tw`bg-gray-300`
              ]}
              onPress={handleGenerateMockData}
              disabled={mockDataLoading}
            >
              <Text style={tw`text-white text-lg font-semibold mb-1`}>
                {mockDataLoading ? '仮データ生成中...' : '🧑‍🤝‍🧑 仮の友達を作る'}
              </Text>
              <Text style={tw`text-white text-sm opacity-90`}>
                テスト用の友達データを生成します
              </Text>
            </TouchableOpacity>
          </View>

          {/* ログアウトボタン */}
          <View style={tw`mb-7`}>
            <TouchableOpacity
              style={[
                tw`bg-red-500 rounded-xl p-4 items-center shadow-sm`,
                loading && tw`bg-gray-300`
              ]}
              onPress={handleLogout}
              disabled={loading}
            >
              <Text style={tw`text-white text-lg font-semibold`}>
                {loading ? 'ログアウト中...' : 'ログアウト'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* アプリ情報 */}
          <View style={tw`items-center mt-7`}>
            <Text style={tw`text-sm text-gray-500 mb-1`}>Collect Friends App</Text>
            <Text style={tw`text-sm text-gray-500`}>Version 1.0.2</Text>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

