import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { router } from 'expo-router';
import { generateAllMockData } from '../../utils/mockDataGenerator';
import { Icons } from '../../utils/iconHelper';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import Constants from 'expo-constants';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mockDataLoading, setMockDataLoading] = useState(false);
  const [isAddFriendModalVisible, setIsAddFriendModalVisible] = useState(false);
  const [friendUid, setFriendUid] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [requestingAIProposals, setRequestingAIProposals] = useState(false);

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

  // ユーザーIDをコピーする機能
  const copyUserIdToClipboard = () => {
    if (!user?.uid) return;

    // Web環境ではnavigator.clipboard.writeTextを使用
    if (Platform.OS === 'web') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(user.uid)
          .then(() => {
            window.alert('ユーザーIDをコピーしました！');
          })
          .catch(() => {
            // フォールバック：アラートでIDを表示
            window.alert(`ユーザーID: ${user.uid}\n\n手動でコピーしてください。`);
          });
      } else {
        // フォールバック：アラートでIDを表示
        window.alert(`ユーザーID: ${user.uid}\n\n手動でコピーしてください。`);
      }
    } else {
      // モバイル版では現在アラート表示のみ
      Alert.alert(
        'ユーザーID',
        user.uid,
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    }
  };

  // AI提案リクエスト機能
  const handleRequestAIProposals = async () => {
    if (!user?.uid) {
      Alert.alert('エラー', 'ユーザー情報が取得できません');
      return;
    }

    // 確認ダイアログ
    if (Platform.OS === 'web') {
      const shouldRequest = window.confirm(
        'AIからの提案をリクエストしますか？\n\n' +
        'この機能により、あなたの位置情報と友達情報を基に\n' +
        'AIが活動提案を生成します。'
      );
      if (shouldRequest) {
        await performAIProposalRequest();
      }
    } else {
      Alert.alert(
        'AI提案リクエスト',
        'AIからの提案をリクエストしますか？\n\n' +
        'この機能により、あなたの位置情報と友達情報を基に\n' +
        'AIが活動提案を生成します。',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: 'リクエスト',
            style: 'default',
            onPress: async () => {
              await performAIProposalRequest();
            },
          },
        ]
      );
    }
  };

  const performAIProposalRequest = async () => {
    setRequestingAIProposals(true);
    try {
      // 環境変数からAPIドメインを取得
      const apiDomain = Constants.expoConfig?.extra?.apiDomain || 'http://localhost:8000';
      const apiUrl = `${apiDomain}/api/v1/generate-ai-proposals`;
      
      console.log('AI提案リクエストを開始します:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "target_user_ids": [user!.uid],
          "max_proposals_per_user": 1,
          "force_generation": true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('AI提案リクエスト成功:', result);
      
      // 成功メッセージ
      if (Platform.OS === 'web') {
        window.alert('AI提案のリクエストが完了しました！\nしばらくしてから探索タブをご確認ください。');
      } else {
        Alert.alert(
          '完了',
          'AI提案のリクエストが完了しました！\nしばらくしてから探索タブをご確認ください。'
        );
      }
      
    } catch (error) {
      console.error('AI提案リクエストエラー:', error);
      
      // エラーメッセージ
      if (Platform.OS === 'web') {
        window.alert('AI提案のリクエストに失敗しました。もう一度お試しください。');
      } else {
        Alert.alert('エラー', 'AI提案のリクエストに失敗しました。もう一度お試しください。');
      }
    } finally {
      setRequestingAIProposals(false);
    }
  };

  // 友達追加機能
  const handleAddFriend = async () => {
    if (!friendUid.trim()) {
      Alert.alert('エラー', 'ユーザーIDを入力してください');
      return;
    }

    if (friendUid.trim() === user?.uid) {
      Alert.alert('エラー', '自分のIDは追加できません');
      return;
    }

    setAddingFriend(true);
    try {
      // TODO: 実際の友達追加ロジックを実装
      // 現在はモック実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        '成功',
        '友達を追加しました！',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsAddFriendModalVisible(false);
              setFriendUid('');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('エラー', '友達の追加に失敗しました');
    } finally {
      setAddingFriend(false);
    }
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
              <View style={tw`flex-row justify-between items-center`}>
                <Text style={tw`text-base text-gray-600 font-medium`}>ユーザーID:</Text>
                <View style={tw`flex-row items-center flex-1 justify-end`}>
                  <Text style={tw`text-base text-gray-800 font-semibold flex-1 text-right mr-2`} numberOfLines={1}>
                    {user?.uid}
                  </Text>
                  <TouchableOpacity
                    style={tw`p-2 bg-orange-100 rounded-lg`}
                    onPress={copyUserIdToClipboard}
                  >
                    <Icons.Copy size={16} color="#FF8700" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* 友達管理セクション */}
          <View style={tw`mb-7`}>
            <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>友達管理</Text>
            
            <TouchableOpacity
              style={tw`bg-white rounded-xl p-4 items-center shadow-sm mb-4`}
              onPress={() => setIsAddFriendModalVisible(true)}
            >
              <LinearGradient
                colors={['#FF7300', '#FF9C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={tw`w-full rounded-lg p-4 flex-row items-center justify-center`}
              >
                <Icons.UserPlus size={24} color="white" style={tw`mr-2`} />
                <Text style={tw`text-white text-lg font-semibold`}>友達を追加</Text>
              </LinearGradient>
            </TouchableOpacity>
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

            <TouchableOpacity
              style={[
                tw`bg-blue-500 rounded-xl p-4 items-center shadow-sm mb-2`,
                requestingAIProposals && tw`bg-gray-300`
              ]}
              onPress={handleRequestAIProposals}
              disabled={requestingAIProposals}
            >
              <Text style={tw`text-white text-lg font-semibold mb-1`}>
                {requestingAIProposals ? 'AI提案をリクエスト中...' : '🤖 AIからの提案を受ける'}
              </Text>
              <Text style={tw`text-white text-sm opacity-90`}>
                AIが活動提案を生成します
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

      {/* 友達追加モーダル */}
      <Modal visible={isAddFriendModalVisible} animationType="slide" presentationStyle="pageSheet">
        <ThemedView style={tw`flex-1 bg-white`}>
          <View style={tw`flex-row justify-between items-center p-5 pt-15 border-b border-gray-200`}>
            <ThemedText type="title">友達を追加</ThemedText>
            <TouchableOpacity 
              onPress={() => setIsAddFriendModalVisible(false)} 
              style={tw`w-8 h-8 justify-center items-center bg-gray-100 rounded-full`}
            >
              <Icons.X size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={tw`flex-1 p-5`}>
            <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>
              友達のユーザーIDを入力してください
            </Text>
            
            <View style={tw`mb-6`}>
              <Text style={tw`text-sm text-gray-600 mb-2`}>ユーザーID</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-4 text-base`}
                placeholder="ユーザーIDを入力"
                value={friendUid}
                onChangeText={setFriendUid}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={tw`text-sm text-gray-500 mb-6 leading-5`}>
              友達にユーザーIDを教えてもらい、上記の欄に入力してください。
              ユーザーIDは設定画面のユーザー情報から確認できます。
            </Text>

            <TouchableOpacity
              style={[
                tw`p-4 items-center rounded-xl`,
                addingFriend || !friendUid.trim() ? tw`bg-gray-300` : tw`bg-[#FF8700]`
              ]}
              onPress={handleAddFriend}
              disabled={addingFriend || !friendUid.trim()}
            >
              <Text style={tw`text-white text-lg font-semibold`}>
                {addingFriend ? '追加中...' : '友達を追加'}
              </Text>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>
    </SafeAreaView>
  );
}