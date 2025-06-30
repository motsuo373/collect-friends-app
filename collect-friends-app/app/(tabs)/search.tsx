import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, SafeAreaView, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import ProposalFilterModal from '@/components/ProposalFilterModal';
import { Icons } from '@/utils/iconHelper';
import { useProposals, UserProposalData } from '@/hooks/useProposals';
import { updateProposalResponse, deleteProposalResponse, getProposalDetails } from '@/utils/firestoreService';
import tw from 'twrnc';

interface FilterOptions {
  activities: string[];
}

const ACTIVITY_OPTIONS = [
  { id: 'cafe', label: 'お茶・カフェ', IconComponent: Icons.Coffee },
  { id: 'light_drinking', label: '軽く飲み', IconComponent: Icons.Beer },
  { id: 'walk', label: '散歩・ぶらぶら', IconComponent: Icons.Compass },
  { id: 'shopping', label: 'ショッピング', IconComponent: Icons.ShoppingBag },
  { id: 'movie', label: '映画', IconComponent: Icons.Play },
  { id: 'lunch', label: '軽食・ランチ', IconComponent: Icons.Utensils },
];

export default function ProposalsScreen() {
  const { user } = useAuth();
  const { proposals: allProposals, loading, error, refetch } = useProposals(user?.uid || null);
  const [filteredProposals, setFilteredProposals] = useState<UserProposalData[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({ activities: [] });
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    // statusが'pending'のもののみを表示
    const pendingProposals = allProposals.filter(proposal => proposal.status === 'pending');
    setFilteredProposals(pendingProposals);
  }, [allProposals]);

  // Firestoreからデータを取得する処理はuseProposals hookで実行されるため削除

  const formatTime = (createdAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - createdAt.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return `今`;
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    return `${days}日前`;
  };

  const formatExpiresAt = (expiresAt: Date) => {
    const date = new Date(expiresAt);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    return `${month}/${day}（${weekday}）${timeStr}〜`;
  };

  const applyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    
    // まずstatusが'pending'のもののみフィルタリング
    const pendingProposals = allProposals.filter(proposal => proposal.status === 'pending');
    
    if (newFilters.activities.length === 0) {
      setFilteredProposals(pendingProposals);
    } else {
      const filtered = pendingProposals.filter(proposal => 
        proposal.category && newFilters.activities.includes(proposal.category)
      );
      setFilteredProposals(filtered);
    }
  };

  const getActiveFilterCount = () => {
    return filters.activities.length;
  };

  const getSelectedFilterLabels = () => {
    return filters.activities.map(activityId => {
      const activityInfo = ACTIVITY_OPTIONS.find(opt => opt.id === activityId);
      return {
        text: activityInfo?.label || activityId,
        key: activityId,
        IconComponent: activityInfo?.IconComponent
      };
    });
  };

  const removeFilterLabel = (activityId: string) => {
    const newFilters = {
      activities: filters.activities.filter(id => id !== activityId)
    };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  // APIを呼び出してチャットルームを作成する関数
  const callAcceptProposalAPI = async (proposalId: string, userId: string, chatId?: string) => {
    try {
      const requestBody: any = {
        proposalId: proposalId,
        userId: userId
      };

      // chatIdがある場合は追加
      if (chatId) {
        requestBody.chatId = chatId;
      }

      const response = await fetch('https://asia-northeast1-collect-friends-app.cloudfunctions.net/acceptProposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  };

  // デバッグ用：提案データを確認する関数
  const checkProposal = async (proposalId: string) => {
    try {
      const response = await fetch(`https://asia-northeast1-collect-friends-app.cloudfunctions.net/checkProposal?proposalId=${proposalId}`);
      const result = await response.json();
      console.log('Proposal check result:', result);
      return result;
    } catch (error) {
      console.error('Check proposal error:', error);
      throw error;
    }
  };

  // デバッグ用：chatsListエントリをテスト作成する関数
  const testChatsList = async (userId: string, chatId: string) => {
    try {
      const response = await fetch('https://asia-northeast1-collect-friends-app.cloudfunctions.net/testChatsList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, chatId })
      });
      const result = await response.json();
      console.log('Test chatsList result:', result);
      return result;
    } catch (error) {
      console.error('Test chatsList error:', error);
      throw error;
    }
  };

  const handleProposalAction = async (proposalId: string, action: 'accept' | 'decline') => {
    const proposal = filteredProposals.find(p => p.id === proposalId);
    if (!proposal || !user?.uid) return;

    if (action === 'accept') {
      Alert.alert(
        '参加確認',
        `「${proposal.title}」に参加しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '参加する', 
            onPress: async () => {
              try {
                console.log('提案参加処理開始:', {
                  proposalId: proposal.proposalId,
                  userId: user.uid,
                  title: proposal.title
                });

                // まず、proposalの詳細情報を取得してchatIdを確認
                const proposalDetails = await getProposalDetails(proposal.proposalId);
                console.log('提案詳細取得完了:', proposalDetails);
                
                let chatId = undefined;
                
                // proposalにchatIdが設定されている場合はそれを使用
                if (proposalDetails?.chatId) {
                  chatId = proposalDetails.chatId;
                  console.log('既存のchatIdを使用:', chatId);
                }
                
                // proposalにactiveChatIdが設定されている場合はそれを使用
                if (proposalDetails?.activeChatId) {
                  chatId = proposalDetails.activeChatId;
                  console.log('activeChatIdを使用:', chatId);
                }

                // APIを呼び出してチャットルーム作成（statusの更新もCloud Functionsで行う）
                console.log('acceptProposal API呼び出し開始...');
                const result = await callAcceptProposalAPI(proposal.proposalId, user.uid, chatId);
                console.log('API呼び出し結果:', result);
                
                if (result.success) {
                  Alert.alert(
                    '参加完了', 
                    `提案に参加しました！\nチャット「${result.data?.chatTitle || 'チャット'}」が作成されました。`,
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          console.log('参加処理完了 - データ再取得');
                          // データを再取得してリストを更新
                          refetch();
                        }
                      }
                    ]
                  );
                } else {
                  console.error('API結果が失敗:', result);
                  throw new Error(result.message || 'API call failed');
                }
              } catch (error) {
                console.error('参加処理エラー:', error);
                Alert.alert(
                  'エラー', 
                  `参加処理に失敗しました。\nエラー詳細: ${error instanceof Error ? error.message : '不明なエラー'}\n\nもう一度お試しください。`
                );
              }
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
            onPress: async () => {
              try {
                console.log('提案辞退処理開始:', {
                  proposalId: proposal.proposalId,
                  userId: user.uid,
                  title: proposal.title
                });

                // statusを削除（辞退時は記録を削除）
                await deleteProposalResponse(user.uid, proposal.proposalId);
                console.log('提案削除完了');
                
                Alert.alert('辞退完了', '提案を辞退しました。', [
                  {
                    text: 'OK',
                    onPress: () => {
                      console.log('辞退処理完了 - データ再取得');
                      // データを再取得してリストを更新
                      refetch();
                    }
                  }
                ]);
              } catch (error) {
                console.error('辞退処理エラー:', error);
                Alert.alert(
                  'エラー', 
                  `辞退処理に失敗しました。\nエラー詳細: ${error instanceof Error ? error.message : '不明なエラー'}\n\nもう一度お試しください。`
                );
              }
            }
          }
        ]
      );
    }
  };

  const ProposalItem = ({ item }: { item: UserProposalData }) => {
    const getProposalSourceLabel = (source: string | undefined) => {
      switch (source) {
        case 'user':
          return 'あなたが提案';
        case 'ai':
          return 'AIが提案';
        case 'friend_invite':
          return 'Aさんからの招待';
        default:
          return '提案';
      }
    };

    const getProposalSourceColor = (source: string | undefined) => {
      switch (source) {
        case 'user':
          return '#FF8700';
        case 'ai':
          return '#9C27B0';
        case 'friend_invite':
          return '#4CAF50';
        default:
          return '#FF8700';
      }
    };

    return (
      <TouchableOpacity
        style={tw`bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100`}
        onPress={() => Alert.alert('提案', `${item.title} の詳細を確認しますか？`)}
      >
        {/* 提案元タグ */}
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <View 
            style={[
              tw`px-3 py-1 rounded-full`,
              { backgroundColor: getProposalSourceColor(item.proposalSource) + '20' }
            ]}
          >
            <Text 
              style={[
                tw`text-xs font-medium`,
                { color: getProposalSourceColor(item.proposalSource) }
              ]}
            >
              {getProposalSourceLabel(item.proposalSource)}
            </Text>
          </View>
          <Text style={tw`text-xs text-gray-500`}>
            {formatTime(item.createdAt || item.receivedAt)}
          </Text>
        </View>

        {/* メインコンテンツ */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>
            {item.title}
          </Text>
          
          {/* 参加者アイコン */}
          <View style={tw`mb-3`}>
            <View style={tw`flex-row items-center mb-2`}>
              <Ionicons name="people" size={16} color="#666" />
              <Text style={tw`text-sm text-gray-600 ml-2`}>
                参加者 ({(item.participantUsers || []).length}人)
              </Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`flex-row items-center`}
            >
              {(item.participantUsers || []).map((user, index) => {
                // participantUsersから displayName を取得
                const displayName = user.displayName || '不明';
                
                // 各参加者に異なる色を割り当て
                const colors = ['#00BCD4', '#F44336', '#FFC107', '#4CAF50', '#9C27B0', '#FF9800', '#795548', '#607D8B'];
                const backgroundColor = displayName === 'あなた' ? '#00BCD4' : colors[index % colors.length];
                
                return (
                  <View key={`${user.uid}-${index}`} style={tw`flex-row items-center mr-3`}>
                    <View 
                      style={[
                        tw`w-8 h-8 rounded-full flex items-center justify-center`,
                        { backgroundColor }
                      ]}
                    >
                      <Text style={tw`text-white text-xs font-bold`}>
                        {displayName === 'あなた' ? 'あ' : displayName.charAt(0) || '?'}
                      </Text>
                    </View>
                    <Text style={tw`text-sm text-gray-700 ml-2`}>
                      {displayName}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* 日時 */}
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={tw`text-sm text-gray-600 ml-2`}>
              {item.expiresAt ? formatExpiresAt(item.expiresAt) : '時間未設定'}
            </Text>
          </View>

          {/* 場所 */}
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name="restaurant-outline" size={16} color="#666" />
            <View style={tw`flex-1 ml-2`}>
              {item.location?.name && (
                <Text style={tw`text-sm text-gray-800 font-medium`}>
                  {item.location.name}
                </Text>
              )}
              {item.location?.address && (
                <Text style={tw`text-xs text-gray-600`}>
                  {item.location.address}
                </Text>
              )}
              {!item.location?.name && !item.location?.address && (
                <Text style={tw`text-sm text-gray-600`}>
                  場所未設定
                </Text>
              )}
            </View>
            <TouchableOpacity>
              <Text style={[tw`text-sm font-medium`, { color: '#FF8700' }]}>
                詳細
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* アクションボタン */}
        <View style={tw`flex-row justify-end`}>
          <TouchableOpacity
            style={tw`bg-gray-200 px-6 py-2 rounded-full mr-3`}
            onPress={() => handleProposalAction(item.id, 'decline')}
          >
            <Text style={tw`text-sm font-medium text-gray-700`}>辞退</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[tw`px-6 py-2 rounded-full`, { backgroundColor: '#FF8700' }]}
            onPress={() => handleProposalAction(item.id, 'accept')}
          >
            <Text style={tw`text-sm font-medium text-white`}>参加したい</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#FF8700" />
          <Text style={tw`mt-4 text-gray-600`}>提案を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
          <Text style={tw`mt-4 text-lg font-medium text-gray-800 text-center`}>
            データの取得に失敗しました
          </Text>
          <Text style={tw`mt-2 text-gray-600 text-center`}>
            {error}
          </Text>
          <TouchableOpacity
            style={tw`mt-6 bg-orange-500 px-6 py-3 rounded-full`}
            onPress={refetch}
          >
            <Text style={tw`text-white font-medium`}>再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const selectedLabels = getSelectedFilterLabels();

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F2F2F7]`}>
      {/* ヘッダー（フィルター部分） */}
      <View style={tw`bg-white px-4 py-3 border-b border-[#C7C7CC]`}>
        <View style={tw`flex-row items-center`}>
          {/* 選択されたフィルターラベル */}
          <View style={tw`flex-1 mr-2`}>
            {selectedLabels.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={tw`flex-row items-center`}
              >
                {selectedLabels.map((label, index) => (
                  <TouchableOpacity
                    key={label.key}
                    style={tw`border border-[#FF8700] rounded-[18px] px-3 py-1 mr-2 flex-row items-center`}
                    onPress={() => removeFilterLabel(label.key)}
                  >
                    {label.IconComponent && (
                      <label.IconComponent size={12} color="#FF8700" style={tw`mr-1`} />
                    )}
                    <Text style={tw`text-[#FF8700] text-xs font-medium`}>
                      {label.text}
                    </Text>
                    <Icons.X size={12} color="#FF8700" style={tw`ml-1`} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
          </View>

          {/* 条件を追加ボタン（右端固定） */}
          <TouchableOpacity
            style={tw`border border-[#8E8E93] rounded-[18px] px-3 py-1 flex-row items-center flex-shrink-0`}
            onPress={() => setShowFilterModal(true)}
          >
            <Icons.Plus size={12} color="#8E8E93" style={tw`mr-1`} />
            <Text style={tw`text-[#8E8E93] text-xs font-medium`}>
              条件を追加
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 提案リスト */}
      <View style={tw`flex-1 p-6`}>
        <FlatList
          data={filteredProposals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProposalItem item={item} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={tw`flex-1 justify-center items-center py-20`}>
              <Ionicons name="sparkles-outline" size={64} color="#ccc" />
              <Text style={tw`mt-4 text-lg font-medium text-gray-600`}>
                {getActiveFilterCount() > 0 ? '条件に合う提案がありません' : '提案がありません'}
              </Text>
              <Text style={tw`mt-2 text-sm text-gray-500 text-center`}>
                {getActiveFilterCount() > 0 
                  ? 'フィルター条件を変更してみてください'
                  : '暇ステータスを設定すると{\'\\n\'}提案が届きます！'
                }
              </Text>
            </View>
          }
        />
      </View>

      {/* フィルターモーダル */}
      <ProposalFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilter={applyFilters}
        initialFilters={filters}
      />
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