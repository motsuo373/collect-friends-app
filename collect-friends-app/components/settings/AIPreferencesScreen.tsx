import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
// import Slider from '@react-native-community/slider';

interface AIPreferences {
  interests: string[];
  budget: {
    min: number;
    max: number;
    preferred: number;
  };
  timePreferences: {
    morning: boolean;    // 6:00-12:00
    afternoon: boolean;  // 12:00-18:00
    evening: boolean;    // 18:00-22:00
    night: boolean;      // 22:00-6:00
  };
  activityTypes: string[];
  groupSizes: {
    small: boolean;     // 2-3人
    medium: boolean;    // 4-6人
    large: boolean;     // 7人以上
  };
  frequency: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
  locationTypes: string[];
  dietaryRestrictions: string[];
  aiAssistanceLevel: number; // 1-5 (1: 最小限, 5: 積極的)
}

const INTEREST_OPTIONS = [
  '食事', '飲み', 'カフェ', '映画', 'ショッピング', 'スポーツ',
  'アウトドア', 'ゲーム', '読書', '音楽', 'アート', '勉強',
  '旅行', 'カラオケ', 'ボウリング', '温泉', 'ドライブ', 'フェス'
];

const ACTIVITY_OPTIONS = [
  '食事', '飲み会', 'カフェ巡り', '映画鑑賞', 'ショッピング',
  '散歩', 'ジム', 'カラオケ', 'ゲーム', 'アウトドア活動'
];

const LOCATION_OPTIONS = [
  'レストラン', 'カフェ', 'バー', '居酒屋', '映画館',
  '公園', 'ショッピングモール', 'カラオケ', 'ボウリング場', '温泉'
];

const DIETARY_OPTIONS = [
  'なし', 'ベジタリアン', 'ヴィーガン', 'ハラル', 'アレルギー対応'
];

const DEFAULT_PREFERENCES: AIPreferences = {
  interests: [],
  budget: {
    min: 1000,
    max: 5000,
    preferred: 3000,
  },
  timePreferences: {
    morning: false,
    afternoon: true,
    evening: true,
    night: false,
  },
  activityTypes: [],
  groupSizes: {
    small: true,
    medium: true,
    large: false,
  },
  frequency: {
    daily: false,
    weekly: true,
    monthly: false,
  },
  locationTypes: [],
  dietaryRestrictions: [],
  aiAssistanceLevel: 3,
};

export default function AIPreferencesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<AIPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userPreferences = userData.preferences || DEFAULT_PREFERENCES;
        setPreferences({ ...DEFAULT_PREFERENCES, ...userPreferences });
      }
    } catch (error) {
      console.error('設定の読み込みエラー:', error);
      Alert.alert('エラー', 'AI設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferences,
        updatedAt: new Date(),
      });
      
      Alert.alert('成功', 'AI学習設定を保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const renderMultiSelect = (
    title: string,
    options: string[],
    selected: string[],
    onUpdate: (newSelected: string[]) => void
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optionGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              selected.includes(option) && styles.optionButtonSelected
            ]}
            onPress={() => onUpdate(toggleArrayItem(selected, option))}
          >
            <Text style={[
              styles.optionText,
              selected.includes(option) && styles.optionTextSelected
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>戻る</Text>
          </TouchableOpacity>
          <Text style={styles.title}>AI学習設定</Text>
          <TouchableOpacity onPress={savePreferences} disabled={saving}>
            <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
              {saving ? '保存中...' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* AI支援レベル */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI支援レベル</Text>
            <Text style={styles.sectionDescription}>
              AIからの提案頻度を設定します
            </Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>最小限</Text>
              <View style={styles.levelButtons}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelButton,
                      preferences.aiAssistanceLevel === level && styles.levelButtonSelected
                    ]}
                    onPress={() => setPreferences(prev => ({ ...prev, aiAssistanceLevel: level }))}
                  >
                    <Text style={[
                      styles.levelButtonText,
                      preferences.aiAssistanceLevel === level && styles.levelButtonTextSelected
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.sliderLabel}>積極的</Text>
            </View>
            <Text style={styles.sliderValue}>レベル {preferences.aiAssistanceLevel}</Text>
          </View>

          {/* 予算設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>予算設定</Text>
            <View style={styles.budgetContainer}>
              <View style={styles.budgetInput}>
                <Text style={styles.budgetLabel}>最小予算</Text>
                <TextInput
                  style={styles.budgetField}
                  value={preferences.budget.min.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setPreferences(prev => ({
                      ...prev,
                      budget: { ...prev.budget, min: value }
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="1000"
                />
                <Text style={styles.budgetUnit}>円</Text>
              </View>
              
              <View style={styles.budgetInput}>
                <Text style={styles.budgetLabel}>最大予算</Text>
                <TextInput
                  style={styles.budgetField}
                  value={preferences.budget.max.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setPreferences(prev => ({
                      ...prev,
                      budget: { ...prev.budget, max: value }
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="5000"
                />
                <Text style={styles.budgetUnit}>円</Text>
              </View>

              <View style={styles.budgetInput}>
                <Text style={styles.budgetLabel}>希望予算</Text>
                <TextInput
                  style={styles.budgetField}
                  value={preferences.budget.preferred.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setPreferences(prev => ({
                      ...prev,
                      budget: { ...prev.budget, preferred: value }
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="3000"
                />
                <Text style={styles.budgetUnit}>円</Text>
              </View>
            </View>
          </View>

          {/* 時間帯設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>好みの時間帯</Text>
            <View style={styles.timeGrid}>
              {Object.entries({
                morning: '朝 (6:00-12:00)',
                afternoon: '昼 (12:00-18:00)',
                evening: '夕方 (18:00-22:00)',
                night: '夜 (22:00-6:00)',
              }).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.timeButton,
                    preferences.timePreferences[key as keyof typeof preferences.timePreferences] && styles.timeButtonSelected
                  ]}
                  onPress={() => setPreferences(prev => ({
                    ...prev,
                    timePreferences: {
                      ...prev.timePreferences,
                      [key]: !prev.timePreferences[key as keyof typeof prev.timePreferences]
                    }
                  }))}
                >
                  <Text style={[
                    styles.timeText,
                    preferences.timePreferences[key as keyof typeof preferences.timePreferences] && styles.timeTextSelected
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* グループサイズ設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>好みのグループサイズ</Text>
            <View style={styles.groupSizeGrid}>
              {Object.entries({
                small: '少人数 (2-3人)',
                medium: '中規模 (4-6人)',
                large: '大規模 (7人以上)',
              }).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.groupSizeButton,
                    preferences.groupSizes[key as keyof typeof preferences.groupSizes] && styles.groupSizeButtonSelected
                  ]}
                  onPress={() => setPreferences(prev => ({
                    ...prev,
                    groupSizes: {
                      ...prev.groupSizes,
                      [key]: !prev.groupSizes[key as keyof typeof prev.groupSizes]
                    }
                  }))}
                >
                  <Text style={[
                    styles.groupSizeText,
                    preferences.groupSizes[key as keyof typeof preferences.groupSizes] && styles.groupSizeTextSelected
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 興味・関心 */}
          {renderMultiSelect(
            '興味・関心',
            INTEREST_OPTIONS,
            preferences.interests,
            (newSelected) => setPreferences(prev => ({ ...prev, interests: newSelected }))
          )}

          {/* 活動タイプ */}
          {renderMultiSelect(
            '好みの活動タイプ',
            ACTIVITY_OPTIONS,
            preferences.activityTypes,
            (newSelected) => setPreferences(prev => ({ ...prev, activityTypes: newSelected }))
          )}

          {/* 場所タイプ */}
          {renderMultiSelect(
            '好みの場所タイプ',
            LOCATION_OPTIONS,
            preferences.locationTypes,
            (newSelected) => setPreferences(prev => ({ ...prev, locationTypes: newSelected }))
          )}

          {/* 食事制限 */}
          {renderMultiSelect(
            '食事制限',
            DIETARY_OPTIONS,
            preferences.dietaryRestrictions,
            (newSelected) => setPreferences(prev => ({ ...prev, dietaryRestrictions: newSelected }))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: '#ccc',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sliderContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  levelButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 8,
  },
  levelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  levelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  levelButtonTextSelected: {
    color: 'white',
  },
  sliderValue: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  budgetContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  budgetInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 16,
    color: '#333',
    width: 80,
  },
  budgetField: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  budgetUnit: {
    fontSize: 16,
    color: '#666',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeButton: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  timeTextSelected: {
    color: '#007AFF',
  },
  groupSizeGrid: {
    flexDirection: 'column',
  },
  groupSizeButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupSizeButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  groupSizeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  groupSizeTextSelected: {
    color: '#007AFF',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionButton: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#007AFF',
  },
});