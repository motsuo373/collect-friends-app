import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Icons } from '@/utils/iconHelper';
import ChatScreen from '@/components/ChatScreen';
import { useChatsList, ChatListItem } from '@/hooks/useChatsList';
import tw from 'twrnc';

interface Participant {
  id: string;
  name: string;
  color: string;
}

export default function ChatScreenContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatListItem | null>(null);
  const { chatsList, loading, error } = useChatsList();

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

  const navigateToChat = (chatRoom: ChatListItem) => {
    setSelectedChatRoom(chatRoom);
  };

  const goBackToChatList = () => {
    setSelectedChatRoom(null);
  };

  const getMockParticipants = (participantDisplayNames: string[]): Participant[] => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FD79A8'];
    return participantDisplayNames.map((name, index) => ({
      id: `participant_${index}`,
      name,
      color: colors[index % colors.length],
    }));
  };

  // 個別チャット画面を表示
  if (selectedChatRoom) {
    return (
      <ChatScreen
        chatRoomId={selectedChatRoom.chatId}
        chatRoomName={selectedChatRoom.title}
        participants={getMockParticipants(selectedChatRoom.participantDisplayNames)}
        onBack={goBackToChatList}
      />
    );
  }

  const ChatRoomItem = ({ item }: { item: ChatListItem }) => (
    <TouchableOpacity
      style={tw`bg-white px-4 py-3 border-b border-gray-100`}
      onPress={() => navigateToChat(item)}
      activeOpacity={0.7}
    >
      <View style={tw`flex-row items-center`}>
        {/* ビールアイコン */}
        <View style={tw`w-12 h-12 rounded-full items-center justify-center mr-3 bg-orange-100`}>
          <Icons.Beer size={24} color="#FF8700" />
        </View>
        
        {/* チャット情報 */}
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center justify-between mb-1`}>
            <Text style={tw`text-base font-medium text-black`}>{item.title}</Text>
            <Text style={tw`text-sm text-gray-500`}>
              {item.lastMessageTime ? formatTime(item.lastMessageTime) : ''}
            </Text>
          </View>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-sm text-gray-600 flex-1`} numberOfLines={1}>
              {item.lastMessage?.content || 'メッセージなし'}
            </Text>
            <View style={tw`flex-row items-center ml-2`}>
              <Icons.Users size={14} color="#999" />
              <Text style={tw`text-xs text-gray-500 ml-1`}>{item.participants.length}</Text>
              {item.unreadCount > 0 && (
                <View style={tw`w-5 h-5 rounded-full ml-2 bg-red-500 items-center justify-center`}>
                  <Text style={tw`text-xs text-white font-medium`}>{item.unreadCount}</Text>
                </View>
              )}
              {item.isActive && (
                <View style={tw`w-2 h-2 rounded-full ml-2 bg-orange-500`} />
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredChatRooms = chatsList.filter(room =>
    room.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#FF8700" />
          <Text style={tw`mt-4 text-gray-600`}>チャットを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <View style={tw`flex-1 justify-center items-center px-4`}>
          <Icons.X size={64} color="#dc2626" />
          <Text style={tw`mt-4 text-lg font-medium text-gray-900`}>エラーが発生しました</Text>
          <Text style={tw`mt-2 text-center text-gray-600`}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* 検索バー */}
      <View style={tw`px-4 py-2 bg-gray-50`}>
        <View style={tw`bg-white rounded-lg px-4 py-2 flex-row items-center`}>
          <Icons.Search size={20} color="#999" />
          <TextInput
            style={tw`flex-1 ml-2 text-base text-gray-700`}
            placeholder="チャットを検索"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* チャットリスト */}
      <FlatList
        data={filteredChatRooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatRoomItem item={item} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <Icons.MessageCircle size={64} color="#ccc" />
            <Text style={tw`mt-4 text-lg font-medium text-gray-600`}>
              チャットがありません
            </Text>
            <Text style={tw`mt-2 text-sm text-gray-500 text-center`}>
              提案から新しい会話を始めましょう！
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
