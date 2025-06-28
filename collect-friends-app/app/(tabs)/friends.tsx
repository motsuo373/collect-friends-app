import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { Filter, X, Coffee, Wine, Compass, ShoppingBag, Play, Utensils, Check, CircleCheckBig } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import tw from 'twrnc';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Friend {
  id: string;
  name: string;
  profileImage?: string;
  isAvailableNow: boolean;
  isWithinWalkingDistance: boolean;
  interests: string[];
  lastSeen?: string;
  age?: number;
  occupation?: string;
  favoriteSpots?: string[];
  availabilityStatus?: 'now' | 'evening' | 'tomorrow_morning' | 'tomorrow_evening';
  activities?: string[];
  maxDistance?: number; // 徒歩分数
}

interface FilterState {
  availabilityStatus: string[];
  activities: string[];
}

// モックデータ
const mockFriends: Friend[] = [
  {
    id: '1',
    name: '田中 花子',
    isAvailableNow: true,
    isWithinWalkingDistance: true,
    interests: ['カフェ', '散歩', '写真'],
    lastSeen: '2分前',
    availabilityStatus: 'now',
    activities: ['cafe'],
  },
  {
    id: '2',
    name: '佐藤 健太',
    isAvailableNow: false,
    isWithinWalkingDistance: true,
    interests: ['映画', 'ゲーム', 'アニメ'],
    lastSeen: '30分前',
    availabilityStatus: 'evening',
    activities: ['drink', 'movie'],
  },
  {
    id: '3',
    name: '鈴木 美咲',
    isAvailableNow: true,
    isWithinWalkingDistance: false,
    interests: ['読書', 'カフェ', 'ヨガ'],
    lastSeen: '1時間前',
    availabilityStatus: 'now',
    activities: ['cafe', 'walk'],
  },
  {
    id: '4',
    name: '高橋 拓也',
    isAvailableNow: true,
    isWithinWalkingDistance: true,
    interests: ['料理', 'ショッピング', 'グルメ'],
    lastSeen: '5分前',
    availabilityStatus: 'now',
    activities: ['lunch', 'shopping'],
  },
  {
    id: '5',
    name: '山田 ゆい',
    isAvailableNow: false,
    isWithinWalkingDistance: true,
    interests: ['スポーツ', 'フィットネス', '健康'],
    lastSeen: '15分前',
    availabilityStatus: 'tomorrow_morning',
    activities: ['cafe', 'walk'],
  },
  {
    id: '6',
    name: '伊藤 慎一',
    isAvailableNow: true,
    isWithinWalkingDistance: false,
    interests: ['音楽', 'アート', 'ライブ'],
    lastSeen: '45分前',
    availabilityStatus: 'now',
    activities: ['drink'],
  },
  {
    id: '7',
    name: '渡辺 さくら',
    isAvailableNow: true,
    isWithinWalkingDistance: true,
    interests: ['旅行', '写真', 'カフェ巡り'],
    lastSeen: '10分前',
    availabilityStatus: 'now',
    activities: ['cafe', 'walk'],
  },
  {
    id: '8',
    name: '木村 大輔',
    isAvailableNow: false,
    isWithinWalkingDistance: false,
    interests: ['ビジネス', 'ネットワーキング', 'セミナー'],
    lastSeen: '2時間前',
    availabilityStatus: 'tomorrow_evening',
    activities: ['drink', 'lunch'],
  },
  {
    id: '9',
    name: '松本 あやな',
    isAvailableNow: true,
    isWithinWalkingDistance: true,
    interests: ['美容', 'ファッション', 'ショッピング'],
    lastSeen: '3分前',
    availabilityStatus: 'now',
    activities: ['shopping', 'cafe'],
  },
  {
    id: '10',
    name: '中村 雄介',
    isAvailableNow: false,
    isWithinWalkingDistance: true,
    interests: ['お酒', 'グルメ', '居酒屋'],
    lastSeen: '1時間前',
    availabilityStatus: 'evening',
    activities: ['drink', 'lunch'],
  },
];

const activityOptions = [
  { key: 'cafe', label: 'お茶・カフェ', IconComponent: Coffee },
  { key: 'drink', label: '軽く飲み', IconComponent: Wine },
  { key: 'walk', label: '散歩・ぶらぶら', IconComponent: Compass },
  { key: 'shopping', label: 'ショッピング', IconComponent: ShoppingBag },
  { key: 'movie', label: '映画', IconComponent: Play },
  { key: 'lunch', label: '軽食・ランチ', IconComponent: Utensils },
];

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isInviteSuccessModalVisible, setIsInviteSuccessModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    availabilityStatus: [],
    activities: [],
  });

  const filteredFriends = mockFriends.filter(friend => {
    // 利用可能性フィルター
    if (filters.availabilityStatus.length > 0) {
      if (!filters.availabilityStatus.includes(friend.availabilityStatus || '')) {
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
      // TODO: 招待機能の実装
      console.log('招待する友達:', selectedFriends);
      
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
            <Filter 
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
                    { backgroundColor: getProfileBackgroundColor(friend.name) }
                  ]}>
                    <Text style={tw`text-lg font-semibold text-white`}>
                      {friend.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  {friend.isAvailableNow && (
                    <View style={tw`absolute -bottom-0 -right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white`} />
                  )}
                </View>
                
                <View style={tw`flex-1`}>
                  <Text style={tw`text-base font-semibold text-[#333333] mb-0.5`}>{friend.name}</Text>
                  
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
                    <Check size={20} color="#FF7300" />
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
            <X size={20} color="#666" />
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

          {/* やりたいこと */}
          <View style={tw`mb-8`}>
            <ThemedText type="subtitle">やりたいこと</ThemedText>
            <View style={tw`flex-row flex-wrap mt-3 -m-1.5`}>
              {activityOptions.map((activity) => (
                <TouchableOpacity
                  key={activity.key}
                  style={[
                    tw`w-[30%] bg-gray-100 rounded-2xl justify-center items-center p-2 m-1.5`,
                    { height: 60 },
                    filters.activities.includes(activity.key) && [
                      tw`border-2 border-orange-500`,
                      { backgroundColor: '#FFF' }
                    ],
                  ]}
                  onPress={() => toggleActivityFilter(activity.key)}
                >
                  <activity.IconComponent 
                    size={18} 
                    color={filters.activities.includes(activity.key) ? '#FF8700' : '#666'} 
                  />
                  <Text style={[
                    tw`text-xs text-center mt-1 font-medium`,
                    filters.activities.includes(activity.key) ? tw`text-orange-500 font-bold` : tw`text-gray-600`,
                  ]}>
                    {activity.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={tw`p-5 pb-10`}>
          {hasAnyFilters && (
            <TouchableOpacity onPress={clearAllFilters} style={tw`mb-3`}>
              <View style={tw`py-4 rounded-xl border border-gray-300 bg-white`}>
                <Text style={tw`text-gray-600 text-base font-medium text-center`}>
                  フィルターをクリア
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={onClose}>
            <LinearGradient
              colors={['#FF7300', '#FF9C00']}
              style={tw`py-4 rounded-xl`}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={tw`text-white text-base font-semibold text-center`}>
                フィルターを適用
              </Text>
            </LinearGradient>
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
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[
          tw`bg-white rounded-2xl py-10 px-12 items-center`,
          {
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 10,
            },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 20,
          }
        ]}>
          <View style={tw`w-20 h-20 rounded-full bg-[#FFF0E5] justify-center items-center mb-5`}>
            <CircleCheckBig size={60} color="#FF7300" />
          </View>
          <Text style={tw`text-lg font-semibold text-[#FF7300]`}>誘いました</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

