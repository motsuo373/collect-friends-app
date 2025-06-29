import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Icons } from '@/utils/iconHelper';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';

interface StatusModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (status: UserStatus) => void;
  currentStatus?: UserStatus;
}

export interface UserStatus {
  isAvailable: boolean;
  availabilityType: 'now' | 'evening' | 'tomorrow_morning' | 'tomorrow_evening';
  activities: string[];
  moveRange: number; // メートル単位
}

const availabilityOptions = [
  { key: 'now', label: '今すぐ暇' },
  { key: 'evening', label: '夕方から暇' },
  { key: 'tomorrow_morning', label: '明日午前中暇' },
  { key: 'tomorrow_evening', label: '明日夕方から暇' },
];

const activityOptions = [
  { key: 'cafe', label: 'お茶・カフェ', IconComponent: Icons.Coffee },
  { key: 'drink', label: '軽く飲み', IconComponent: Icons.Wine },
  { key: 'walk', label: '散歩・ぶらぶら', IconComponent: Icons.Compass },
  { key: 'shopping', label: 'ショッピング', IconComponent: Icons.ShoppingBag },
  { key: 'movie', label: '映画', IconComponent: Icons.Play },
  { key: 'lunch', label: '軽食・ランチ', IconComponent: Icons.Utensils },
];

export const StatusModal: React.FC<StatusModalProps> = ({
  visible,
  onClose,
  onSave,
  currentStatus,
}) => {
  const [isAvailable, setIsAvailable] = useState(currentStatus?.isAvailable || false);
  const [availabilityType, setAvailabilityType] = useState<UserStatus['availabilityType']>(
    currentStatus?.availabilityType || 'now'
  );
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    currentStatus?.activities || []
  );

  const toggleActivity = (activity: string) => {
    setSelectedActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleSave = () => {
    if (isAvailable && selectedActivities.length === 0) {
      Alert.alert('エラー', 'やりたいことを少なくとも1つ選択してください。');
      return;
    }

    const status: UserStatus = {
      isAvailable,
      availabilityType,
      activities: selectedActivities,
      moveRange: 1000, // デフォルト値
    };

    onSave(status);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={tw`flex-1 bg-white`}>
        <View style={tw`flex-row justify-between items-center p-5 pt-15 border-b border-gray-200`}>
          <ThemedText type="title">ステータス設定</ThemedText>
          <TouchableOpacity onPress={onClose} style={tw`w-8 h-8 justify-center items-center bg-gray-100 rounded-full`}>
            <Icons.X size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={tw`flex-1 p-5`} showsVerticalScrollIndicator={false}>
          {/* 現在の状況 */}
          <View style={tw`mb-8`}>
            <ThemedText type="subtitle">現在の状況</ThemedText>
            <View style={tw`flex-row mt-3 bg-gray-100 rounded-full p-1`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 py-3 items-center rounded-full`,
                  !isAvailable && tw`bg-gray-500`,
                ]}
                onPress={() => setIsAvailable(false)}
              >
                <Text style={[
                  tw`text-gray-600 font-semibold`,
                  !isAvailable && tw`text-white`,
                ]}>
                  忙しい
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`flex-1 py-3 items-center rounded-full`,
                ]}
                onPress={() => setIsAvailable(true)}
              >
                {isAvailable ? (
                  <LinearGradient
                    colors={['#FF7300', '#FF9C00']}
                    style={tw`flex-1 py-3 items-center justify-center rounded-full absolute inset-0`}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={tw`text-white font-semibold`}>
                      暇している
                    </Text>
                  </LinearGradient>
                ) : (
                  <Text style={tw`text-gray-600 font-semibold`}>
                    暇している
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {isAvailable && (
            <>
              {/* いつ暇？ */}
              <View style={tw`mb-8`}>
                <ThemedText type="subtitle">いつ暇？</ThemedText>
                <View style={tw`flex-row flex-wrap mt-3 -m-1`}>
                  {availabilityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        tw`flex-1 min-w-[45%] py-3 px-4 bg-gray-100 rounded-xl items-center m-1`,
                        availabilityType === option.key && [
                          tw`border-2 border-orange-500`,
                          { backgroundColor: '#FFF' }
                        ],
                      ]}
                      onPress={() => setAvailabilityType(option.key as UserStatus['availabilityType'])}
                    >
                      <Text style={[
                        tw`text-gray-600 font-medium`,
                        availabilityType === option.key && tw`text-orange-500 font-bold`,
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
                  {activityOptions.map((activity) => {
                    const IconComponent = activity.IconComponent;
                    return (
                      <TouchableOpacity
                        key={activity.key}
                        style={[
                          tw`w-[30%] bg-gray-100 rounded-2xl justify-center items-center p-2 m-1.5`,
                          { height: 60 },
                          selectedActivities.includes(activity.key) && [
                            tw`border-2 border-orange-500`,
                            { backgroundColor: '#FFF' }
                          ],
                        ]}
                        onPress={() => toggleActivity(activity.key)}
                      >
                        <IconComponent 
                          size={18} 
                          color={selectedActivities.includes(activity.key) ? '#FF8700' : '#666'} 
                        />
                        <Text style={[
                          tw`text-xs text-center mt-1 font-medium`,
                          selectedActivities.includes(activity.key) ? tw`text-orange-500 font-bold` : tw`text-gray-600`,
                        ]}>
                          {activity.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <View style={tw`p-5 pb-10`}>
          <TouchableOpacity onPress={handleSave}>
            <LinearGradient
              colors={['#FF7300', '#FF9C00']}
              style={tw`py-4 rounded-xl`}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={tw`text-white text-base font-semibold text-center`}>
                ステータスを更新
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}; 