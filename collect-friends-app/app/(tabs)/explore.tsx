import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import tw from 'twrnc';

interface ChatRoom {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  participantCount: number;
  isActive: boolean;
  type: 'group' | 'direct';
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchChatData();
  }, []);

  const fetchChatData = async () => {
    // TODO: Firebase からチャットデータを取得
    // 現在はモックデータを使用
    const mockChatRooms: ChatRoom[] = [
      {
        id: '1',
        name: '渋谷で飲み会 🍻',
        lastMessage: 'じゃあ7時に待ち合わせで！',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 30), // 30分前
        participantCount: 4,
        isActive: true,
        type: 'group'
      },
      {
        id: '2', 
        name: 'カフェ巡り ☕',
        lastMessage: 'そのお店美味しそう！',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2時間前
        participantCount: 3,
        isActive: false,
        type: 'group'
      },
      {
        id: '3',
        name: '映画鑑賞 🎬',
        lastMessage: 'チケット取れました！',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5時間前
        participantCount: 2,
        isActive: true,
        type: 'direct'
      }
    ];

    setChatRooms(mockChatRooms);
    setLoading(false);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    return `${days}日前`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'group': return 'people';
      case 'direct': return 'person';
      default: return 'chatbubble';
    }
  };

  const ChatRoomItem = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={tw`bg-white rounded-xl p-4 mb-3 shadow-sm`}
      onPress={() => Alert.alert('チャット', `${item.name} を開きます`)}
    >
      <View style={tw`flex-row items-center justify-between mb-2`}>
        <View style={tw`flex-row items-center flex-1`}>
          <View style={[tw`w-12 h-12 rounded-full items-center justify-center mr-3`, { backgroundColor: '#FFF5E6' }]}>
            <Ionicons name={getTypeIcon(item.type) as any} size={20} color="#FF8700" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-base font-semibold text-gray-800 mb-1`}>{item.name}</Text>
            <Text style={tw`text-sm text-gray-600`} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          </View>
        </View>
        <View style={tw`items-end`}>
          <Text style={tw`text-xs text-gray-500 mb-1`}>
            {formatTime(item.lastMessageTime)}
          </Text>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="people-outline" size={12} color="#999" />
            <Text style={tw`text-xs text-gray-500 ml-1`}>{item.participantCount}</Text>
            {item.isActive && (
              <View style={[tw`w-2 h-2 rounded-full ml-2`, { backgroundColor: '#FF8700' }]} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredChatRooms = chatRooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#FF8700" />
          <Text style={tw`mt-4 text-gray-600`}>チャットを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* ヘッダー */}
      <View style={tw`bg-white px-6 py-4 shadow-sm`}>
        <Text style={tw`text-xl font-bold text-gray-800 mb-4`}>チャット</Text>
        
        {/* 検索バー */}
        <View style={tw`bg-gray-100 rounded-full px-4 py-2 flex-row items-center`}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={tw`flex-1 ml-2 text-base`}
            placeholder="チャットを検索..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* チャットリスト */}
      <View style={tw`flex-1 p-6`}>
        <FlatList
          data={filteredChatRooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatRoomItem item={item} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={tw`flex-1 justify-center items-center py-20`}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={tw`mt-4 text-lg font-medium text-gray-600`}>
                チャットがありません
              </Text>
              <Text style={tw`mt-2 text-sm text-gray-500 text-center`}>
                AI提案から新しい会話を始めましょう！
              </Text>
            </View>
          }
        />
      </View>

      {/* フローティングアクションボタン */}
      <TouchableOpacity
        style={[tw`absolute right-6 bottom-6 w-14 h-14 rounded-full items-center justify-center shadow-lg`, { backgroundColor: '#FF8700' }]}
        onPress={() => Alert.alert('新規チャット', '新しいチャットを作成します')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
