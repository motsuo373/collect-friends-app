import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Icons } from '@/utils/iconHelper';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import tw from 'twrnc';
import { useFriends, type FriendData } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';

// フィルター状態の管理
interface FilterState {
  availabilityStatus: string[];
  activities: string[];
}

const activityOptions = [
  { key: 'cafe', label: 'お茶・カフェ', IconComponent: Icons.Coffee },
  { key: 'drink', label: '軽く飲み', IconComponent: Icons.Beer },
  { key: 'walk', label: '散歩・ぶらぶら', IconComponent: Icons.Compass },
  { key: 'shopping', label: 'ショッピング', IconComponent: Icons.ShoppingBag },
  { key: 'movie', label: '映画', IconComponent: Icons.Play },
  { key: 'lunch', label: '軽食・ランチ', IconComponent: Icons.Utensils },
];

// デフォルトのプロフィール画像色
const getProfileBackgroundColor = (name: string) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

// availabilityStatusをcurrentStatusとisOnlineから導出する関数
const getAvailabilityStatus = (friend: FriendData): string => {
  if (friend.currentStatus === 'free' && friend.isOnline) return 'now';
  if (friend.currentStatus === 'free' && !friend.isOnline) return 'evening';
  if (friend.currentStatus === 'busy') return 'tomorrow_morning';
  return 'tomorrow_evening';
};

// フレンドカードコンポーネント
const FriendCard: React.FC<{
  friend: FriendData;
  isSelected: boolean;
  onPress: () => void;
}> = ({ friend, isSelected, onPress }) => {
  const getActivityIcon = (activityKey: string) => {
    const activity = activityOptions.find(opt => opt.key === activityKey);
    return activity ? activity.IconComponent : null;
  };

  return (
    <TouchableOpacity
      style={[
        tw`bg-white rounded-lg mb-2 mx-4`,
        isSelected && tw`border-2 border-[#FF8700]`
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={tw`flex-row items-center p-3`}>
        {/* プロフィール画像 */}
        <View style={tw`relative`}>
          {friend.profileImage ? (
            <Image
              source={{ uri: friend.profileImage }}
              style={tw`w-12 h-12 rounded-full`}
            />
          ) : (
            <View 
              style={[
                tw`w-12 h-12 rounded-full items-center justify-center`,
                { backgroundColor: getProfileBackgroundColor(friend.displayName) }
              ]}
            >
              <Text style={tw`text-white font-semibold text-lg`}>
                {friend.displayName.charAt(0)}
              </Text>
            </View>
          )}
        </View>

        {/* フレンド情報 */}
        <View style={tw`flex-1 ml-4`}>
          <Text style={tw`text-black text-base font-medium mb-1.5`}>
            {friend.displayName}
          </Text>
          
          {/* タグ */}
          <View style={tw`flex-row items-center flex-wrap`}>
            {/* 利用可能性ステータス */}
            {friend.isAvailableNow && (
              <View style={tw`bg-transparent border border-[#FF8700] rounded px-1 py-0.5 mr-1 mb-1`}>
                <Text style={tw`text-[#FF8700] text-xs`}>今から暇</Text>
              </View>
            )}
            
            {/* 距離情報 */}
            {friend.isWithinWalkingDistance && (
              <View style={tw`bg-transparent border border-[#FF8700] rounded px-1 py-0.5 mr-1 mb-1`}>
                <Text style={tw`text-[#FF8700] text-xs`}>徒歩5分圏内</Text>
              </View>
            )}
            
            {/* アクティビティタグ */}
            {friend.activities.slice(0, 2).map((activity, index) => {
              const activityInfo = activityOptions.find(opt => opt.key === activity);
              if (activityInfo) {
                return (
                  <View key={index} style={tw`bg-transparent border border-[#FF8700] rounded px-1 py-0.5 mr-1 mb-1`}>
                    <Text style={tw`text-[#FF8700] text-xs`}>{activityInfo.label}</Text>
                  </View>
                );
              }
              return null;
            })}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function FriendsScreen() {
  const { user } = useAuth();
  const { friends, loading, error, refetch } = useFriends(user?.uid || null);
  
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    availabilityStatus: [], // デフォルトで空
    activities: [], // デフォルトで空
  });

  // フィルタリングされた友達リスト
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

  const toggleAvailabilityFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      availabilityStatus: prev.availabilityStatus.includes(status)
        ? prev.availabilityStatus.filter(s => s !== status)
        : [...prev.availabilityStatus, status]
    }));
  };

  const toggleActivityFilter = (activity: string) => {
    setFilters(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  // 選択されたフィルターのラベルを取得
  const getSelectedFilterLabels = () => {
    const labels: Array<{
      text: string;
      type: 'availability' | 'activity';
      key: string;
      IconComponent?: any;
    }> = [];
    
    // 利用可能性ステータスのラベル
    filters.availabilityStatus.forEach(status => {
      switch (status) {
        case 'now':
          labels.push({ text: '今から暇', type: 'availability', key: status });
          break;
        case 'evening':
          labels.push({ text: '夕方から', type: 'availability', key: status });
          break;
        case 'tomorrow_morning':
          labels.push({ text: '明日午前', type: 'availability', key: status });
          break;
        case 'tomorrow_evening':
          labels.push({ text: '明日夕方', type: 'availability', key: status });
          break;
      }
    });
    
    // アクティビティのラベル
    filters.activities.forEach(activity => {
      const activityInfo = activityOptions.find(opt => opt.key === activity);
      if (activityInfo) {
        labels.push({ 
          text: activityInfo.label, 
          type: 'activity', 
          key: activity,
          IconComponent: activityInfo.IconComponent
        });
      }
    });
    
    return labels;
  };

  // フィルターラベルを削除
  const removeFilterLabel = (type: 'availability' | 'activity', key: string) => {
    if (type === 'availability') {
      toggleAvailabilityFilter(key);
    } else {
      toggleActivityFilter(key);
    }
  };

  const handleInvite = () => {
    if (selectedFriends.length > 0) {
      setIsInviteModalVisible(true);
      setSelectedFriends([]);
    }
  };

  // ローディング表示
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#F2F2F7] justify-center items-center`}>
        <ActivityIndicator size="large" color="#FF8700" />
        <Text style={tw`text-gray-600 mt-4 text-base`}>友達データを読み込み中...</Text>
      </SafeAreaView>
    );
  }

  // エラー表示
  if (error) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#F2F2F7] justify-center items-center px-4`}>
        <Text style={tw`text-red-600 text-center text-base mb-4`}>
          {error}
        </Text>
        <TouchableOpacity
          style={tw`bg-[#FF8700] px-6 py-3 rounded-xl flex-row items-center`}
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
      <SafeAreaView style={tw`flex-1 bg-[#F2F2F7] justify-center items-center px-4`}>
        <Text style={tw`text-gray-600 text-center text-lg mb-2`}>
          まだ友達がいません
        </Text>
        <Text style={tw`text-gray-500 text-center text-base mb-6`}>
          設定画面から「仮の友達を作る」ボタンで{'\n'}テストデータを追加してみてください
        </Text>
        <TouchableOpacity
          style={tw`bg-[#FF8700] px-6 py-3 rounded-xl flex-row items-center`}
          onPress={refetch}
        >
          <Icons.RefreshCw size={20} color="white" style={tw`mr-2`} />
          <Text style={tw`text-white font-semibold`}>更新</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const selectedLabels = getSelectedFilterLabels();

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F2F2F7]`}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
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
                    key={`${label.type}-${label.key}`}
                    style={tw`border border-[#FF8700] rounded-[18px] px-3 py-1 mr-2 flex-row items-center`}
                    onPress={() => removeFilterLabel(label.type, label.key)}
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
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Icons.Plus size={12} color="#8E8E93" style={tw`mr-1`} />
            <Text style={tw`text-[#8E8E93] text-xs font-medium`}>
              条件を追加
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* フレンドリスト */}
      <View style={tw`flex-1 relative`}>
        <ScrollView 
          style={tw`flex-1`}
          contentContainerStyle={tw`py-4 pb-24`}
          showsVerticalScrollIndicator={false}
        >
          {filteredFriends.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              isSelected={selectedFriends.includes(friend.id)}
              onPress={() => toggleFriendSelection(friend.id)}
            />
          ))}
          
          {filteredFriends.length === 0 && filters.availabilityStatus.length === 0 && filters.activities.length === 0 && (
            <View style={tw`flex-1 justify-center items-center mt-20`}>
              <Text style={tw`text-gray-500 text-center text-base mb-4`}>
                友達を絞り込むには{'\n'}「条件を追加」をタップしてください
              </Text>
            </View>
          )}
          
          {filteredFriends.length === 0 && (filters.availabilityStatus.length > 0 || filters.activities.length > 0) && (
            <View style={tw`flex-1 justify-center items-center mt-20`}>
              <Text style={tw`text-gray-500 text-center text-base`}>
                条件に合う友達が見つかりません
              </Text>
            </View>
          )}
        </ScrollView>

        {/* 誘うボタン */}
        {selectedFriends.length > 0 && (
          <View style={tw`absolute bottom-6 left-4 right-4`}>
            <TouchableOpacity onPress={handleInvite}>
              <LinearGradient
                colors={['#FF7300', '#FF9C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={tw`rounded-[32.5px] px-6 py-3`}
              >
                <Text style={tw`text-white text-lg font-semibold text-center`}>
                  誘う ({selectedFriends.length})
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* フィルターモーダル */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* 誘うモーダル */}
      <InviteModal
        visible={isInviteModalVisible}
        onClose={() => setIsInviteModalVisible(false)}
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
    { key: 'now', label: '今から暇' },
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
                      color={filters.activities.includes(option.key) ? "#FF8700" : "#666"} 
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
            style={tw`bg-[#FF8700] rounded-xl py-4 items-center`}
            onPress={onClose}
          >
            <Text style={tw`text-white font-semibold text-lg`}>適用</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
};

// 誘うモーダルコンポーネント
interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ visible, onClose }) => {
  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center px-8`}>
        <View style={tw`bg-white rounded-2xl p-8 items-center min-w-[280px]`}>
          {/* チェックマークアイコン */}
          <View style={tw`mb-6`}>
            <Icons.CircleCheck size={64} color="#FF8700" />
          </View>
          
          {/* 誘いましたテキスト */}
          <Text style={tw`text-[#FF8700] text-2xl font-bold mb-4`}>
            誘いました
          </Text>
          
          {/* 機能未実装の注記 */}
          <Text style={tw`text-gray-500 text-sm text-center mb-8`}>
            ※現在はこの機能はありません。
          </Text>
          
          {/* 閉じるボタン */}
          <TouchableOpacity
            style={tw`bg-[#FF8700] rounded-xl px-8 py-3 min-w-[120px]`}
            onPress={onClose}
          >
            <Text style={tw`text-white font-semibold text-center`}>
              OK
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

