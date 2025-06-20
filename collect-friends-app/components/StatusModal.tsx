import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import tw from 'twrnc';

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
  { key: 'cafe', label: 'お茶・カフェ', emoji: '☕' },
  { key: 'drink', label: '軽く飲み', emoji: '🍻' },
  { key: 'walk', label: '散歩・ぶらぶら', emoji: '🚶' },
  { key: 'shopping', label: '買い物・ショッピング', emoji: '🛍️' },
  { key: 'movie', label: '映画', emoji: '🎬' },
  { key: 'lunch', label: '軽食・ランチ', emoji: '🍽️' },
];

const moveRangeOptions = [
  { distance: 500, label: '徒歩5分圏内' },
  { distance: 1000, label: '徒歩10分圏内' },
  { distance: 1500, label: '徒歩15分圏内' },
  { distance: 3000, label: '電車30分圏内' },
  { distance: 10000, label: '車1時間圏内' },
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
  const [moveRange, setMoveRange] = useState(currentStatus?.moveRange || 1000);

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
      moveRange,
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
            <Text style={tw`text-lg text-gray-600`}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={tw`flex-1 p-5`} showsVerticalScrollIndicator={false}>
          {/* 暇かどうかの設定 */}
          <View style={tw`mb-8`}>
            <ThemedText type="subtitle">現在の状況</ThemedText>
            <View style={tw`flex-row mt-3 bg-gray-100 rounded-full p-1`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 py-3 items-center rounded-full`,
                  !isAvailable && tw`bg-blue-500`,
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
                  isAvailable && tw`bg-blue-500`,
                ]}
                onPress={() => setIsAvailable(true)}
              >
                <Text style={[
                  tw`text-gray-600 font-semibold`,
                  isAvailable && tw`text-white`,
                ]}>
                  暇している
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isAvailable && (
            <>
              {/* いつ暇かの設定 */}
              <View style={tw`mb-8`}>
                <ThemedText type="subtitle">いつ暇？</ThemedText>
                <View style={tw`flex-row flex-wrap mt-3 -m-1`}>
                  {availabilityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        tw`flex-1 min-w-[45%] py-3 px-4 bg-gray-100 rounded-xl items-center m-1`,
                        availabilityType === option.key && tw`bg-blue-500`,
                      ]}
                      onPress={() => setAvailabilityType(option.key as UserStatus['availabilityType'])}
                    >
                      <Text style={[
                        tw`text-gray-600 font-medium`,
                        availabilityType === option.key && tw`text-white`,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* やりたいことの設定 */}
              <View style={tw`mb-8`}>
                <ThemedText type="subtitle">やりたいこと</ThemedText>
                <View style={tw`flex-row flex-wrap mt-3 -m-1.5`}>
                  {activityOptions.map((activity) => (
                    <TouchableOpacity
                      key={activity.key}
                      style={[
                        tw`w-[31%] aspect-square bg-gray-100 rounded-2xl justify-center items-center p-2 m-1.5`,
                        selectedActivities.includes(activity.key) && tw`bg-blue-500`,
                      ]}
                      onPress={() => toggleActivity(activity.key)}
                    >
                      <Text style={tw`text-2xl mb-2`}>{activity.emoji}</Text>
                      <Text style={[
                        tw`text-gray-600 text-xs font-medium text-center`,
                        selectedActivities.includes(activity.key) && tw`text-white`,
                      ]}>
                        {activity.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 移動範囲の設定 */}
              <View style={tw`mb-8`}>
                <ThemedText type="subtitle">移動可能範囲</ThemedText>
                <View style={tw`mt-3`}>
                  {moveRangeOptions.map((range) => (
                    <TouchableOpacity
                      key={range.distance}
                      style={[
                        tw`py-3 px-4 bg-gray-100 rounded-xl mb-2`,
                        moveRange === range.distance && tw`bg-blue-500`,
                      ]}
                      onPress={() => setMoveRange(range.distance)}
                    >
                      <Text style={[
                        tw`text-gray-600 font-medium text-center`,
                        moveRange === range.distance && tw`text-white`,
                      ]}>
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <View style={tw`p-5 pb-10`}>
          <TouchableOpacity style={tw`bg-blue-500 py-4 rounded-xl`} onPress={handleSave}>
            <Text style={tw`text-white text-base font-semibold text-center`}>保存</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}; 