import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Icons } from '@/utils/iconHelper';
import { useChat, ChatMessage } from '@/hooks/useChat';
import tw from 'twrnc';

interface Participant {
  id: string;
  name: string;
  color: string;
}

interface ChatScreenProps {
  chatRoomId: string;
  chatRoomName: string;
  participants: Participant[];
  onBack: () => void;
}

export default function ChatScreen({
  chatRoomId,
  chatRoomName,
  participants,
  onBack,
}: ChatScreenProps) {
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { messages, loading, error, sendMessage } = useChat(chatRoomId);

  const getUserColor = (senderRef: string) => {
    // ユーザーIDに基づいて色を生成（簡単なハッシュ関数）
    let hash = 0;
    for (let i = 0; i < senderRef.length; i++) {
      const char = senderRef.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FD79A8', '#FDCB6E', '#6C5CE7'];
    return colors[Math.abs(hash) % colors.length];
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    return '1日以上前';
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendMessage(newMessage);
      setNewMessage('');

      // メッセージ送信後、最下部にスクロール
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      // エラーハンドリング（必要に応じてユーザーに通知）
    }
  };

  const MessageItem = ({ item }: { item: ChatMessage }) => (
    <View style={tw`mb-4 px-4`}>
      <View
        style={[
          tw`flex-row`,
          item.isCurrentUser ? tw`justify-end` : tw`justify-start`,
        ]}
      >
        {/* 送信者のアバター（左側） */}
        {!item.isCurrentUser && (
          <View
            style={[
              tw`w-8 h-8 rounded-full mr-2 items-center justify-center`,
              { backgroundColor: getUserColor(item.senderRef) },
            ]}
          >
            <Text style={tw`text-white text-xs font-medium`}>
              {item.senderName.charAt(0)}
            </Text>
          </View>
        )}

        {/* メッセージバブル */}
        <View
          style={[
            tw`max-w-[70%] px-4 py-3 rounded-2xl`,
            item.isCurrentUser
              ? tw`bg-orange-500 rounded-tr-sm`
              : tw`bg-white border border-gray-200 rounded-tl-sm`,
          ]}
        >
          <Text
            style={[
              tw`text-base leading-5`,
              item.isCurrentUser ? tw`text-white` : tw`text-black`,
            ]}
          >
            {item.content}
          </Text>
        </View>

        {/* 送信者のアバター（右側） */}
        {item.isCurrentUser && (
          <View
            style={[
              tw`w-8 h-8 rounded-full ml-2 items-center justify-center`,
              { backgroundColor: getUserColor(item.senderRef) },
            ]}
          >
            <Text style={tw`text-white text-xs font-medium`}>
              {item.senderName.charAt(0)}
            </Text>
          </View>
        )}
      </View>

      {/* タイムスタンプ */}
      <Text
        style={[
          tw`text-xs text-gray-500 mt-1`,
          item.isCurrentUser ? tw`text-right mr-10` : tw`text-left ml-10`,
        ]}
      >
        {formatTime(item.timestamp)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* ヘッダー */}
      <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200`}>
        <TouchableOpacity
          onPress={onBack}
          style={tw`mr-3`}
        >
          <Icons.ChevronRight
            size={24}
            color="#000"
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </TouchableOpacity>

        <View style={tw`flex-1 flex-row items-center justify-center`}>
          {/* タイトル（中央寄せ） */}
          <Text style={tw`text-lg font-medium text-black mr-2`}>{chatRoomName}</Text>
          
          {/* 参加者アイコン（タイトルの横に並べて表示） */}
          <View style={tw`flex-row`}>
            {participants.slice(0, 3).map((participant, index) => (
              <View
                key={participant.id}
                style={[
                  tw`w-6 h-6 rounded-full items-center justify-center mr-1`,
                  { backgroundColor: participant.color },
                ]}
              >
                <Text style={tw`text-white text-xs font-medium`}>
                  {participant.name.charAt(0)}
                </Text>
              </View>
            ))}
            {participants.length > 3 && (
              <View style={tw`w-6 h-6 rounded-full bg-gray-400 items-center justify-center`}>
                <Text style={tw`text-white text-xs font-medium`}>
                  +{participants.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* メッセージリスト */}
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={tw`flex-1 items-center justify-center`}>
            <Text style={tw`text-gray-500`}>メッセージを読み込み中...</Text>
          </View>
        ) : error ? (
          <View style={tw`flex-1 items-center justify-center px-4`}>
            <Text style={tw`text-red-500 text-center mb-2`}>エラーが発生しました</Text>
            <Text style={tw`text-gray-500 text-center`}>{error}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageItem item={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pt-4 pb-4`}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={tw`flex-1 items-center justify-center py-8`}>
                <Text style={tw`text-gray-500 text-center`}>
                  まだメッセージがありません。{'\n'}最初のメッセージを送信してみましょう！
                </Text>
              </View>
            }
          />
        )}

        {/* メッセージ入力エリア */}
        <View style={tw`bg-white px-4 py-3 border-t border-gray-200`}>
          <View style={tw`flex-row items-end`}>
            <TextInput
              style={[
                tw`flex-1 bg-gray-100 rounded-full px-4 text-base mr-2 h-10`,
                { 
                  lineHeight: Platform.OS === 'ios' ? 18 : 20,
                  paddingTop: Platform.OS === 'ios' ? 11 : 10,
                  paddingBottom: Platform.OS === 'ios' ? 11 : 10,
                }
              ]}
              placeholder="メッセージを作成"
              placeholderTextColor="#999"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              textAlignVertical="center"
              {...(Platform.OS === 'android' && { includeFontPadding: false })}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                !newMessage.trim() ? tw`bg-gray-300` : tw`bg-orange-500`
              ]}
              disabled={!newMessage.trim()}
            >
              <Icons.Send size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 