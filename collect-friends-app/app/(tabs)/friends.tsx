import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Icons } from '@/utils/iconHelper';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import tw from 'twrnc';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFriends, type FriendData } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';

interface FilterState {
  availabilityStatus: string[];
  activities: string[];
}

const activityOptions = [
  { key: 'cafe', label: 'お茶・カフェ', IconComponent: Icons.Coffee },
  { key: 'drink', label: '軽く飲み', IconComponent: Icons.Wine },
  { key: 'walk', label: '散歩・ぶらぶら', IconComponent: Icons.Compass },
  { key: 'shopping', label: 'ショッピング', IconComponent: Icons.ShoppingBag },
  { key: 'movie', label: '映画', IconComponent: Icons.Play },
  { key: 'lunch', label: '軽食・ランチ', IconComponent: Icons.Utensils },
];

// availabilityStatusをcurrentStatusとisOnlineから導出する関数
const getAvailabilityStatus = (friend: FriendData): string => {
  if (friend.currentStatus === 'free' && friend.isOnline) return 'now';
  if (friend.currentStatus === 'free' && !friend.isOnline) return 'evening';
  if (friend.currentStatus === 'busy') return 'tomorrow_morning';
  return 'tomorrow_evening';
};

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const { friends, loading, error, refetch } = useFriends(user?.uid || null);
  
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isInviteSuccessModalVisible, setIsInviteSuccessModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    availabilityStatus: [],
    activities: [],
  });

  const filteredFriends = friends.filter(friend => {
    // 利用可能性フィルター
    if (filters.availabilityStatus.length > 0) {
      const friendAvailabilityStatus = getAvailabilityStatus(friend);
      if (!filters.availabilityStatus.includes(friendAvailabilityStatus)) {
        return false;
      }
    }

    // アクティビティフィルター
    if (filters.activities.length > 0) {
      if (!friend.activities?.some(activity => filters.activities.includes(activity))) {
        return false;
      }
    }

    return true;
  });

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const getProfileBackgroundColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const getActivityLabel = (activityKey: string) => {
    const activity = activityOptions.find(opt => opt.key === activityKey);
    return activity ? { label: activity.label, IconComponent: activity.IconComponent } : null;
  };

  const getFilterLabels = () => {
    const labels: string[] = [];
    
    // 利用可能性ステータスのラベル
    filters.availabilityStatus.forEach(status => {
      switch (status) {
        case 'now':
          labels.push('今暇');
          break;
        case 'evening':
          labels.push('夕方から');
          break;
        case 'tomorrow_morning':
          labels.push('明日午前');
          break;
        case 'tomorrow_evening':
          labels.push('明日夕方');
          break;
      }
    });
    
    // アクティビティのラベル
    filters.activities.forEach(activity => {
      const activityInfo = getActivityLabel(activity);
      if (activityInfo) {
        labels.push(activityInfo.label);
      }
    });
    
    return labels;
  };

  const hasActiveFilters = () => {
    return filters.availabilityStatus.length > 0 || filters.activities.length > 0;
  };

  const handleInvite = () => {
    if (selectedFriends.length > 0) {
      // 成功モーダルを表示
      setIsInviteSuccessModalVisible(true);
      
      // 選択をクリア
      setSelectedFriends([]);
      
      // 3秒後に自動で閉じる
      setTimeout(() => {
        setIsInviteSuccessModalVisible(false);
      }, 3000);
    }
  };

  // ローディング表示
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#F5F5F5] justify-center items-center`}>
        <ActivityIndicator size="large" color="#FF7300" />
        <Text style={tw`text-gray-600 mt-4 text-base`}>友達データを読み込み中...</Text>
      </SafeAreaView>
    );
  }

  // エラー表示
  if (error) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#F5F5F5] justify-center items-center px-4`}>
        <Text style={tw`text-red-600 text-center text-base mb-4`}>
          {error}
        </Text>
        <TouchableOpacity
          style={tw`bg-[#FF7300] px-6 py-3 rounded-xl flex-row items-center`}
          onPress={refetch}
        >
          <Icons.RefreshCw size={20} color="white" style={tw`mr-2`} />
          <Text style={tw`text-white font-semibold`}>再試行</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 友達がいない場合
  if (friends.length === 0) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#F5F5F5] justify-center items-center px-4`}>
        <Text style={tw`text-gray-600 text-center text-lg mb-2`}>
          まだ友達がいません
        </Text>
        <Text style={tw`text-gray-500 text-center text-base mb-6`}>
          設定画面から「仮の友達を作る」ボタンで{'\n'}テストデータを追加してみてください
        </Text>
        <TouchableOpacity
          style={tw`bg-[#FF7300] px-6 py-3 rounded-xl flex-row items-center`}
          onPress={refetch}
        >
          <Icons.RefreshCw size={20} color="white" style={tw`mr-2`} />
          <Text style={tw`text-white font-semibold`}>更新</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F5F5F5]`}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* ヘッダー */}
      <View style={tw`flex-row justify-end items-center px-4 py-3 bg-white border-b border-[#E5E5E5]`}>
        <View style={tw`flex-row items-center flex-1 justify-end`}>
          {/* フィルターラベル */}
          {hasActiveFilters() && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={tw`flex-1 mr-2`}
              contentContainerStyle={tw`items-center`}
            >
              {getFilterLabels().map((label, index) => (
                <View key={index} style={tw`bg-[#FFE5CC] border border-[#FF7300] rounded-xl px-2 py-1 mr-1.5`}>
                  <Text style={tw`text-xs font-medium text-[#FF7300]`}>{label}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          
          {/* フィルターボタン */}
          <TouchableOpacity
            style={tw`p-2`}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Icons.Filter 
              size={24} 
              color={hasActiveFilters() ? "#FF7300" : "#666"} 
              fill={hasActiveFilters() ? "#FF7300" : "none"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 友達リスト */}
      <View style={tw`flex-1 relative`}>
        <ScrollView 
          style={tw`flex-1`} 
          contentContainerStyle={tw`px-4 pt-2 pb-25`}
          showsVerticalScrollIndicator={false}
        >
          {filteredFriends.map(friend => (
            <TouchableOpacity
              key={friend.id}
              style={[
                tw`bg-white rounded-xl px-4 py-3 mb-2 shadow-sm`,
                selectedFriends.includes(friend.id) && tw`border-2 border-[#FF7300]`,
                // カスタムshadowスタイルを適用
                selectedFriends.includes(friend.id) ? {
                  shadowColor: '#FF7300',
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                } : {
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 1,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }
              ]}
              onPress={() => toggleFriendSelection(friend.id)}
            >
              <View style={tw`flex-row items-center`}>
                <View style={tw`mr-3 relative`}>
                  <View style={[
                    tw`w-12 h-12 rounded-full items-center justify-center`,
                    { backgroundColor: getProfileBackgroundColor(friend.displayName) }
                  ]}>
                    <Text style={tw`text-lg font-semibold text-white`}>
                      {friend.displayName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  {friend.isAvailableNow && (
                    <View style={tw`absolute -bottom-0 -right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white`} />
                  )}
                </View>
                
                <View style={tw`flex-1`}>
                  <Text style={tw`text-base font-semibold text-[#333333] mb-0.5`}>{friend.displayName}</Text>
                  
                  {/* カスタムメッセージがある場合は表示 */}
                  {friend.customMessage && (
                    <Text style={tw`text-sm text-[#666666] mb-1`}>&quot;{friend.customMessage}&quot;</Text>
                  )}
                  
                  {/* アクティビティラベル */}
                  {friend.activities && friend.activities.length > 0 && (
                    <View style={tw`flex-row flex-wrap my-1`}>
                      {friend.activities.slice(0, 2).map((activityKey, index) => {
                        const activity = getActivityLabel(activityKey);
                        return activity ? (
                          <View key={index} style={tw`flex-row items-center bg-[#F0F0F0] px-2 py-0.5 rounded-xl mr-1`}>
                            <activity.IconComponent size={12} color="#666666" style={tw`mr-1`} />
                            <Text style={tw`text-xs font-medium text-[#666666]`}>{activity.label}</Text>
                          </View>
                        ) : null;
                      })}
                      {friend.activities.length > 2 && (
                        <View style={tw`flex-row items-center bg-[#F0F0F0] px-2 py-0.5 rounded-xl mr-1`}>
                          <Text style={tw`text-xs font-medium text-[#666666]`}>+{friend.activities.length - 2}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  
                  {friend.lastSeen && (
                    <Text style={tw`text-xs font-normal text-[#999999]`}>{friend.lastSeen}</Text>
                  )}
                </View>

                {/* 選択時のチェックマーク */}
                {selectedFriends.includes(friend.id) && (
                  <View style={tw`ml-3 w-6 h-6 items-center justify-center`}>
                    <Icons.Check size={20} color="#FF7300" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 浮いている招待ボタン */}
        <View style={tw`absolute bottom-5 left-4 right-4 z-50`}>
          <TouchableOpacity
            style={[
              selectedFriends.length > 0 
                ? tw`bg-[#FF7300] rounded-3xl py-4 items-center justify-center`
                : tw`bg-gray-400 rounded-3xl py-4 items-center justify-center`,
              {
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }
            ]}
            onPress={handleInvite}
            disabled={selectedFriends.length === 0}
          >
            <Text style={tw`text-lg font-semibold text-white`}>誘う</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* フィルターモーダル */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* 招待成功モーダル */}
      <InviteSuccessModal
        visible={isInviteSuccessModalVisible}
        onClose={() => setIsInviteSuccessModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// フィルターモーダルコンポーネント
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, filters, onFiltersChange }) => {
  const availabilityOptions = [
    { key: 'now', label: '今すぐ暇' },
    { key: 'evening', label: '夕方から暇' },
    { key: 'tomorrow_morning', label: '明日午前中暇' },
    { key: 'tomorrow_evening', label: '明日夕方から暇' },
  ];

  const toggleAvailabilityFilter = (status: string) => {
    const newStatuses = filters.availabilityStatus.includes(status)
      ? filters.availabilityStatus.filter(s => s !== status)
      : [...filters.availabilityStatus, status];
    onFiltersChange({ ...filters, availabilityStatus: newStatuses });
  };

  const toggleActivityFilter = (activity: string) => {
    const newActivities = filters.activities.includes(activity)
      ? filters.activities.filter(a => a !== activity)
      : [...filters.activities, activity];
    onFiltersChange({ ...filters, activities: newActivities });
  };

  const clearAllFilters = () => {
    onFiltersChange({ availabilityStatus: [], activities: [] });
  };

  const hasAnyFilters = filters.availabilityStatus.length > 0 || filters.activities.length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={tw`flex-1 bg-white`}>
        <View style={tw`flex-row justify-between items-center p-5 pt-15 border-b border-gray-200`}>
          <ThemedText type="title">ステータスで絞り込み</ThemedText>
          <TouchableOpacity onPress={onClose} style={tw`w-8 h-8 justify-center items-center bg-gray-100 rounded-full`}>
            <Icons.X size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={tw`flex-1 p-5`} showsVerticalScrollIndicator={false}>
          {/* いつ暇？ */}
          <View style={tw`mb-8`}>
            <ThemedText type="subtitle">いつ暇？</ThemedText>
            <View style={tw`flex-row flex-wrap mt-3 -m-1`}>
              {availabilityOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    tw`flex-1 min-w-[45%] py-3 px-4 bg-gray-100 rounded-xl items-center m-1`,
                    filters.availabilityStatus.includes(option.key) && [
                      tw`border-2 border-orange-500`,
                      { backgroundColor: '#FFF' }
                    ],
                  ]}
                  onPress={() => toggleAvailabilityFilter(option.key)}
                >
                  <Text style={[
                    tw`text-gray-600 font-medium`,
                    filters.availabilityStatus.includes(option.key) && tw`text-orange-500 font-bold`,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 何したい？ */}
          <View style={tw`mb-8`}>
            <ThemedText type="subtitle">何したい？</ThemedText>
            <View style={tw`flex-row flex-wrap mt-3 -m-1`}>
              {activityOptions.map((option) => {
                const IconComponent = option.IconComponent;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      tw`flex-1 min-w-[45%] py-3 px-4 bg-gray-100 rounded-xl items-center m-1`,
                      filters.activities.includes(option.key) && [
                        tw`border-2 border-orange-500`,
                        { backgroundColor: '#FFF' }
                      ],
                    ]}
                    onPress={() => toggleActivityFilter(option.key)}
                  >
                    <IconComponent 
                      size={24} 
                      color={filters.activities.includes(option.key) ? "#FF7300" : "#666"} 
                      style={tw`mb-1`}
                    />
                    <Text style={[
                      tw`text-gray-600 font-medium text-xs`,
                      filters.activities.includes(option.key) && tw`text-orange-500 font-bold`,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* フィルターリセット & 適用ボタン */}
        <View style={tw`p-5 pt-0 pb-8`}>
          {hasAnyFilters && (
            <TouchableOpacity 
              style={tw`border border-gray-300 rounded-xl py-3 mb-3 items-center`}
              onPress={clearAllFilters}
            >
              <Text style={tw`text-gray-600 font-medium`}>全てリセット</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={tw`bg-[#FF7300] rounded-xl py-4 items-center`}
            onPress={onClose}
          >
            <Text style={tw`text-white font-semibold text-lg`}>適用</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
};

// 招待成功モーダルコンポーネント
interface InviteSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

const InviteSuccessModal: React.FC<InviteSuccessModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center px-8`}>
        <View style={tw`bg-white rounded-2xl p-8 items-center max-w-80 w-full`}>
          <View style={tw`w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4`}>
            <Icons.CircleCheck size={32} color="#22C55E" />
          </View>
          
          <Text style={tw`text-xl font-bold text-gray-800 mb-2 text-center`}>
            招待を送信しました！
          </Text>
          
          <Text style={tw`text-gray-600 text-center leading-5`}>
            友達に通知が届きました。{'\n'}返事を待ちましょう。
          </Text>
        </View>
      </View>
    </Modal>
  );
};

