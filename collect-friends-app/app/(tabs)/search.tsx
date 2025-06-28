import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import tw from 'twrnc';

interface AIProposal {
  id: string;
  title: string;
  description: string;
  participants: string[];
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export default function AISuggestionsScreen() {
  const { user } = useAuth();
  const [aiProposals, setAIProposals] = useState<AIProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIProposals();
  }, []);

  const fetchAIProposals = async () => {
    // TODO: Firebase からAI提案データを取得
    // 現在はモックデータを使用
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
      },
      {
        id: '3',
        title: 'カフェ巡り ☕',
        description: '表参道エリアで新しくオープンしたカフェを巡りませんか？',
        participants: ['あなた', '鈴木さん'],
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 120) // 2時間前
      }
    ];

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

  const handleProposalAction = (proposalId: string, action: 'accept' | 'decline') => {
    const proposal = aiProposals.find(p => p.id === proposalId);
    if (!proposal) return;

    if (action === 'accept') {
      Alert.alert(
        '参加確認',
        `「${proposal.title}」に参加しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '参加する', 
            onPress: () => {
              // TODO: Firebase に参加情報を保存
              Alert.alert('参加完了', 'AI提案に参加しました！チャットが作成されます。');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        '辞退確認',
        `「${proposal.title}」を辞退しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '辞退する', 
            style: 'destructive',
            onPress: () => {
              setAIProposals(prev => prev.filter(p => p.id !== proposalId));
              Alert.alert('辞退完了', 'AI提案を辞退しました。');
            }
          }
        ]
      );
    }
  };

  const AIProposalItem = ({ item }: { item: AIProposal }) => (
    <TouchableOpacity
      style={tw`bg-white rounded-xl p-4 mb-3 shadow-sm border border-orange-100`}
      onPress={() => Alert.alert('AI提案', `${item.title} の詳細を確認しますか？`)}
    >
      <View style={tw`flex-row items-start justify-between mb-3`}>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="sparkles" size={16} color="#FF8700" />
            <Text style={[tw`text-sm font-medium ml-1`, {color: '#FF8700'}]}>AI提案</Text>
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
          onPress={() => handleProposalAction(item.id, 'decline')}
        >
          <Text style={tw`text-sm font-medium text-gray-700`}>辞退</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[tw`px-4 py-2 rounded-full`, { backgroundColor: '#FF8700' }]}
          onPress={() => handleProposalAction(item.id, 'accept')}
        >
          <Text style={tw`text-sm font-medium text-white`}>参加</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#FF8700" />
          <Text style={tw`mt-4 text-gray-600`}>AI提案を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* ヘッダー */}
      <View style={tw`bg-white px-6 py-4 shadow-sm`}>
        <ThemedText type="title" style={tw`text-xl font-bold text-gray-800 mb-2`}>AI提案</ThemedText>
        <Text style={tw`text-sm text-gray-600`}>
          あなたの状況に合わせたAIからの提案です
        </Text>
      </View>

      {/* AI提案リスト */}
      <View style={tw`flex-1 p-6`}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
}); 