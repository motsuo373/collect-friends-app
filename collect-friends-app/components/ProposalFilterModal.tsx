import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Icons } from '@/utils/iconHelper';
import tw from 'twrnc';

interface FilterOptions {
  activities: string[];
}

interface ProposalFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilter: (filters: FilterOptions) => void;
  initialFilters: FilterOptions;
}

const ACTIVITY_OPTIONS = [
  { id: 'cafe', label: 'お茶・カフェ', IconComponent: Icons.Coffee },
  { id: 'light_drinking', label: '軽く飲み', IconComponent: Icons.Beer },
  { id: 'walk', label: '散歩・ぶらぶら', IconComponent: Icons.Compass },
  { id: 'shopping', label: 'ショッピング', IconComponent: Icons.ShoppingBag },
  { id: 'movie', label: '映画', IconComponent: Icons.Play },
  { id: 'lunch', label: '軽食・ランチ', IconComponent: Icons.Utensils },
];

export default function ProposalFilterModal({
  visible,
  onClose,
  onApplyFilter,
  initialFilters,
}: ProposalFilterModalProps) {
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    initialFilters.activities || []
  );

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev => {
      if (prev.includes(activityId)) {
        return prev.filter(id => id !== activityId);
      } else {
        return [...prev, activityId];
      }
    });
  };

  const handleApplyFilter = () => {
    onApplyFilter({
      activities: selectedActivities,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedActivities([]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>やりたいこと</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* フィルターコンテンツ */}
        <View style={styles.content}>
          {/* アクティビティ選択 */}
          <View style={styles.activityGrid}>
            {ACTIVITY_OPTIONS.map((activity) => {
              const IconComponent = activity.IconComponent;
              return (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityButton,
                    selectedActivities.includes(activity.id) && styles.activityButtonSelected
                  ]}
                  onPress={() => toggleActivity(activity.id)}
                >
                  <IconComponent 
                    size={24} 
                    color={selectedActivities.includes(activity.id) ? "#FFFFFF" : "#666666"} 
                    style={styles.activityIcon}
                  />
                  <Text
                    style={[
                      styles.activityLabel,
                      selectedActivities.includes(activity.id) && styles.activityLabelSelected
                    ]}
                  >
                    {activity.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ボタンエリア */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>リセット</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilter}>
            <Text style={styles.applyButtonText}>条件を設定</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activityButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityButtonSelected: {
    backgroundColor: '#FF8700',
    borderColor: '#FF8700',
  },
  activityIcon: {
    marginBottom: 8,
  },
  activityLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
    textAlign: 'center',
  },
  activityLabelSelected: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 16,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  applyButton: {
    flex: 2,
    height: 50,
    backgroundColor: '#FF8700',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 