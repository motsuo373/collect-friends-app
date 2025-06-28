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
  type: 'ai_proposal' | 'group' | 'direct';
}

interface AIProposal {
  id: string;
  title: string;
  description: string;
  participants: string[];
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chats' | 'proposals'>('chats');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [aiProposals, setAIProposals] = useState<AIProposal[]>([]);
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
        type: 'ai_proposal'
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

    const mockAIProposals: AIProposal[] = [
      {
        id: '1',
        title: '新宿でランチ 🍽️',
        description: '近くにいる3人でイタリアンはいかがですか？美味しいお店を見つけました！',
        participants: ['あなた', '田中さん', '佐藤さん'],
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 15) // 15分前
      },
      {
        id: '2',
        title: 'ボウリング 🎳',
        description: '今夜空いている4人でボウリングしませんか？割引キャンペーン中です！',
        participants: ['あなた', '山田さん', '鈴木さん', '高橋さん'],
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 45) // 45分前
      }
    ];

    setChatRooms(mockChatRooms);
    setAIProposals(mockAIProposals);
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
      case 'ai_proposal': return 'sparkles';
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
          <View style={tw`w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3`}>
            <Ionicons name={getTypeIcon(item.type) as any} size={20} color="#007AFF" />
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
              <View style={tw`w-2 h-2 bg-green-500 rounded-full ml-2`} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const AIProposalItem = ({ item }: { item: AIProposal }) => (
    <TouchableOpacity
      style={tw`bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-3 border border-blue-200`}
      onPress={() => Alert.alert('AI提案', `${item.title} の詳細を確認しますか？`)}
    >
      <View style={tw`flex-row items-start justify-between mb-3`}>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="sparkles" size={16} color="#8B5CF6" />
            <Text style={tw`text-sm font-medium text-purple-600 ml-1`}>AI提案</Text>
            <Text style={tw`text-xs text-gray-500 ml-2`}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          <Text style={tw`text-base font-semibold text-gray-800 mb-2`}>{item.title}</Text>
          <Text style={tw`text-sm text-gray-600 leading-5 mb-3`}>{item.description}</Text>
          <Text style={tw`text-xs text-gray-500`}>
            参加者: {item.participants.join(', ')}
          </Text>
        </View>
      </View>
      
      <View style={tw`flex-row justify-end`}>
        <TouchableOpacity
          style={tw`bg-gray-200 px-4 py-2 rounded-full mr-2`}
          onPress={() => Alert.alert('辞退', 'この提案を辞退しますか？')}
        >
          <Text style={tw`text-sm font-medium text-gray-700`}>辞退</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`bg-blue-500 px-4 py-2 rounded-full`}
          onPress={() => Alert.alert('参加', 'この提案に参加しますか？')}
        >
          <Text style={tw`text-sm font-medium text-white`}>参加</Text>
        </TouchableOpacity>
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
          <ActivityIndicator size="large" color="#007AFF" />
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
        <View style={tw`bg-gray-100 rounded-full px-4 py-2 flex-row items-center mb-4`}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={tw`flex-1 ml-2 text-base`}
            placeholder="チャットを検索..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* タブ */}
        <View style={tw`flex-row bg-gray-100 rounded-full p-1`}>
          <TouchableOpacity
            style={[
              tw`flex-1 py-2 rounded-full items-center`,
              activeTab === 'chats' ? tw`bg-white shadow-sm` : tw``
            ]}
            onPress={() => setActiveTab('chats')}
          >
            <Text style={[
              tw`text-sm font-medium`,
              activeTab === 'chats' ? tw`text-blue-600` : tw`text-gray-600`
            ]}>
              チャット ({chatRooms.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              tw`flex-1 py-2 rounded-full items-center`,
              activeTab === 'proposals' ? tw`bg-white shadow-sm` : tw``
            ]}
            onPress={() => setActiveTab('proposals')}
          >
            <Text style={[
              tw`text-sm font-medium`,
              activeTab === 'proposals' ? tw`text-blue-600` : tw`text-gray-600`
            ]}>
              AI提案 ({aiProposals.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* コンテンツ */}
      <View style={tw`flex-1 p-6`}>
        {activeTab === 'chats' ? (
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
        ) : (
          <FlatList
            data={aiProposals}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AIProposalItem item={item} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={tw`flex-1 justify-center items-center py-20`}>
                <Ionicons name="sparkles-outline" size={64} color="#ccc" />
                <Text style={tw`mt-4 text-lg font-medium text-gray-600`}>
                  AI提案がありません
                </Text>
                <Text style={tw`mt-2 text-sm text-gray-500 text-center`}>
                  暇ステータスを設定すると{'\n'}AI提案が届きます！
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* フローティングアクションボタン */}
      <TouchableOpacity
        style={tw`absolute right-6 bottom-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg`}
        onPress={() => Alert.alert('新規チャット', '新しいチャットを作成します')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
