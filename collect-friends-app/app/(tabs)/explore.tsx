import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import tw from 'twrnc';

interface UserData {
  uid: string;
  customUuid: string;
  name: string;
  email: string;
  avatar: string;
  status: {
    current: string;
    mood: string[];
    availableUntil: Date | null;
    location: any;
    range: number | null;
  };
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setUserData(data);
      }
    } catch (error) {
      console.error('ユーザーデータの取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'ログアウト',
      '本当にログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('エラー', 'ログアウトに失敗しました。');
            }
          },
        },
      ]
    );
  };

  const ProfileCard = ({ icon, title, content, onPress }: {
    icon: string;
    title: string;
    content: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={tw`bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={tw`w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-4`}>
        <Ionicons name={icon as any} size={20} color="#007AFF" />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`text-sm text-gray-600 mb-1`}>{title}</Text>
        <Text style={tw`text-base font-medium text-gray-800`}>{content}</Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={tw`mt-4 text-gray-600`}>ユーザー情報を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ヘッダー */}
        <View style={tw`bg-blue-500 pt-4 pb-8 px-6`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={tw`text-white text-xl font-bold`}>プロフィール</Text>
            <TouchableOpacity onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* ユーザー情報カード */}
          <View style={tw`bg-white rounded-xl p-4 flex-row items-center`}>
            <View style={tw`w-16 h-16 rounded-full bg-gray-200 items-center justify-center mr-4`}>
              {userData?.avatar ? (
                <Text style={tw`text-2xl`}>👤</Text>
              ) : (
                <Ionicons name="person" size={32} color="#666" />
              )}
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-lg font-semibold text-gray-800`}>
                {userData?.name || user?.displayName || 'ユーザー'}
              </Text>
              <Text style={tw`text-sm text-gray-600`}>
                {userData?.email || user?.email}
              </Text>
              <Text style={tw`text-xs text-gray-500 mt-1`}>
                ID: {userData?.customUuid || userData?.uid}
              </Text>
            </View>
          </View>
        </View>

        {/* プロフィール情報セクション */}
        <View style={tw`p-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>アカウント情報</Text>
          
          <ProfileCard
            icon="person-outline"
            title="ユーザー名"
            content={userData?.name || user?.displayName || '未設定'}
            onPress={() => Alert.alert('編集', 'ユーザー名編集機能は今後実装予定です')}
          />

          <ProfileCard
            icon="mail-outline"
            title="メールアドレス"
            content={userData?.email || user?.email || '未設定'}
          />

          <ProfileCard
            icon="finger-print-outline"
            title="Firebase UID"
            content={userData?.uid || user?.uid || ''}
          />

          <ProfileCard
            icon="key-outline"
            title="カスタム UUID"
            content={userData?.customUuid || '未設定'}
          />

          <ProfileCard
            icon="calendar-outline"
            title="登録日"
            content={userData?.createdAt 
              ? new Date(userData.createdAt).toLocaleDateString('ja-JP')
              : '不明'
            }
          />
        </View>

        {/* ステータス情報セクション */}
        <View style={tw`px-6 pb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>現在のステータス</Text>
          
          <ProfileCard
            icon="radio-outline"
            title="ステータス"
            content={userData?.status?.current === 'offline' ? 'オフライン' : 
                     userData?.status?.current === 'free' ? '空いている' : 
                     userData?.status?.current === 'busy' ? '忙しい' : '不明'}
          />

          {userData?.status?.mood && userData.status.mood.length > 0 && (
            <ProfileCard
              icon="happy-outline"
              title="気分・やりたいこと"
              content={userData.status.mood.join(', ')}
            />
          )}

          {userData?.status?.range && (
            <ProfileCard
              icon="location-outline"
              title="移動範囲"
              content={`${userData.status.range}m`}
            />
          )}
        </View>

        {/* 設定セクション */}
        <View style={tw`px-6 pb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>設定</Text>
          
          <ProfileCard
            icon="settings-outline"
            title="アプリ設定"
            content="通知、プライバシーなど"
            onPress={() => Alert.alert('設定', '設定画面は今後実装予定です')}
          />

          <ProfileCard
            icon="help-circle-outline"
            title="ヘルプ・サポート"
            content="よくある質問、お問い合わせ"
            onPress={() => Alert.alert('ヘルプ', 'ヘルプページは今後実装予定です')}
          />

          <ProfileCard
            icon="document-text-outline"
            title="利用規約・プライバシーポリシー"
            content="アプリの利用規約を確認"
            onPress={() => Alert.alert('利用規約', '利用規約ページは今後実装予定です')}
          />
        </View>

        {/* ログアウトボタン */}
        <View style={tw`px-6 pb-8`}>
          <TouchableOpacity
            style={tw`bg-red-500 rounded-xl p-4 flex-row items-center justify-center`}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text style={tw`text-white font-semibold ml-2`}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
