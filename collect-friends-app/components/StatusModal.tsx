import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

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
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">ステータス設定</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 暇かどうかの設定 */}
          <View style={styles.section}>
            <ThemedText type="subtitle">現在の状況</ThemedText>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !isAvailable && styles.toggleButtonActive,
                ]}
                onPress={() => setIsAvailable(false)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  !isAvailable && styles.toggleButtonTextActive,
                ]}>
                  忙しい
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  isAvailable && styles.toggleButtonActive,
                ]}
                onPress={() => setIsAvailable(true)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  isAvailable && styles.toggleButtonTextActive,
                ]}>
                  暇している
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isAvailable && (
            <>
              {/* いつ暇かの設定 */}
              <View style={styles.section}>
                <ThemedText type="subtitle">いつ暇？</ThemedText>
                <View style={styles.optionGrid}>
                  {availabilityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionButton,
                        availabilityType === option.key && styles.optionButtonActive,
                      ]}
                      onPress={() => setAvailabilityType(option.key as UserStatus['availabilityType'])}
                    >
                      <Text style={[
                        styles.optionButtonText,
                        availabilityType === option.key && styles.optionButtonTextActive,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* やりたいことの設定 */}
              <View style={styles.section}>
                <ThemedText type="subtitle">やりたいこと</ThemedText>
                <View style={styles.activityGrid}>
                  {activityOptions.map((activity) => (
                    <TouchableOpacity
                      key={activity.key}
                      style={[
                        styles.activityButton,
                        selectedActivities.includes(activity.key) && styles.activityButtonActive,
                      ]}
                      onPress={() => toggleActivity(activity.key)}
                    >
                      <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                      <Text style={[
                        styles.activityButtonText,
                        selectedActivities.includes(activity.key) && styles.activityButtonTextActive,
                      ]}>
                        {activity.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 移動範囲の設定 */}
              <View style={styles.section}>
                <ThemedText type="subtitle">移動可能範囲</ThemedText>
                <View style={styles.rangeGrid}>
                  {moveRangeOptions.map((range) => (
                    <TouchableOpacity
                      key={range.distance}
                      style={[
                        styles.rangeButton,
                        moveRange === range.distance && styles.rangeButtonActive,
                      ]}
                      onPress={() => setMoveRange(range.distance)}
                    >
                      <Text style={[
                        styles.rangeButtonText,
                        moveRange === range.distance && styles.rangeButtonTextActive,
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

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
  },
  optionButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 12,
  },
  activityButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  activityButtonActive: {
    backgroundColor: '#007AFF',
  },
  activityEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  activityButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  activityButtonTextActive: {
    color: '#fff',
  },
  rangeGrid: {
    marginTop: 10,
  },
  rangeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 8,
  },
  rangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  rangeButtonText: {
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  rangeButtonTextActive: {
    color: '#fff',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 