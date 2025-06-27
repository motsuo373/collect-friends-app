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
import { ref, get, set, onValue, off } from 'firebase/database';
import { rtdb } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

interface UserStatus {
  status: 'free' | 'busy' | 'offline';
  mood: string[];
  availableUntil: number | null;
  lastUpdate: number;
  customMessage: string;
}

const STATUS_OPTIONS = [
  { value: 'free', label: '暇', description: '集まりに参加できます', color: '#34C759', icon: 'checkmark-circle' },
  { value: 'busy', label: '忙しい', description: '現在は参加できません', color: '#FF9500', icon: 'time' },
  { value: 'offline', label: 'オフライン', description: '通知を受け取りません', color: '#8E8E93', icon: 'moon' },
];

const MOOD_OPTIONS = [
  '飲み', 'カフェ', '食事', '映画', 'ショッピング', 'スポーツ',
  'アウトドア', 'ゲーム', '読書', '音楽', 'ドライブ', 'カラオケ',
  '温泉', '勉強', '散歩', '新しい場所'
];

const AVAILABILITY_OPTIONS = [
  { label: '30分後まで', minutes: 30 },
  { label: '1時間後まで', minutes: 60 },
  { label: '2時間後まで', minutes: 120 },
  { label: '今日中', minutes: null },
  { label: '指定しない', minutes: 0 },
];

export default function StatusSettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<UserStatus>({
    status: 'free',
    mood: [],
    availableUntil: null,
    lastUpdate: Date.now(),
    customMessage: '',
  });

  useEffect(() => {
    if (user) {
      loadCurrentStatus();
      
      // リアルタイムでステータスの変更を監視
      const statusRef = ref(rtdb, `user_status/${user.uid}`);
      const unsubscribe = onValue(statusRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setStatus(data);
        }
      });

      return () => {
        off(statusRef, 'value', unsubscribe);
      };
    }
  }, [user]);

  const loadCurrentStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const statusRef = ref(rtdb, `user_status/${user.uid}`);
      const snapshot = await get(statusRef);
      
      if (snapshot.exists()) {
        setStatus(snapshot.val());
      }
    } catch (error) {
      console.error('ステータス読み込みエラー:', error);
      Alert.alert('エラー', 'ステータスの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: Partial<UserStatus>) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const updatedStatus = {
        ...status,
        ...newStatus,
        lastUpdate: Date.now(),
      };

      const statusRef = ref(rtdb, `user_status/${user.uid}`);
      await set(statusRef, updatedStatus);
      
      setStatus(updatedStatus);
      Alert.alert('成功', 'ステータスを更新しました');
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      Alert.alert('エラー', 'ステータスの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const toggleMood = (mood: string) => {
    const newMoods = status.mood.includes(mood)
      ? status.mood.filter(m => m !== mood)
      : [...status.mood, mood];
    
    updateStatus({ mood: newMoods });
  };

  const setAvailabilityTime = (minutes: number | null) => {
    let availableUntil: number | null = null;
    
    if (minutes === null) {
      // 今日中 - 今日の23:59まで
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      availableUntil = endOfDay.getTime();
    } else if (minutes > 0) {
      // 指定した分数後まで
      availableUntil = Date.now() + (minutes * 60 * 1000);
    }
    
    updateStatus({ availableUntil });
  };

  const formatAvailabilityTime = (timestamp: number | null) => {
    if (!timestamp) return '指定なし';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return `今日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}まで`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}まで`;
    }
  };

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
          <Text style={styles.title}>ステータス設定</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* 現在のステータス表示 */}
          <View style={styles.currentStatusSection}>
            <Text style={styles.sectionTitle}>現在のステータス</Text>
            <View style={[styles.currentStatusCard, { borderColor: STATUS_OPTIONS.find(s => s.value === status.status)?.color }]}>
              <View style={styles.currentStatusInfo}>
                <Ionicons
                  name={STATUS_OPTIONS.find(s => s.value === status.status)?.icon as any}
                  size={24}
                  color={STATUS_OPTIONS.find(s => s.value === status.status)?.color}
                />
                <View style={styles.currentStatusText}>
                  <Text style={styles.currentStatusLabel}>
                    {STATUS_OPTIONS.find(s => s.value === status.status)?.label}
                  </Text>
                  <Text style={styles.currentStatusDescription}>
                    {STATUS_OPTIONS.find(s => s.value === status.status)?.description}
                  </Text>
                </View>
              </View>
              {status.availableUntil && (
                <Text style={styles.availabilityText}>
                  {formatAvailabilityTime(status.availableUntil)}
                </Text>
              )}
            </View>
          </View>

          {/* ステータス選択 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ステータスを変更</Text>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusOption,
                  status.status === option.value && styles.statusOptionSelected,
                  { borderColor: option.color }
                ]}
                onPress={() => updateStatus({ status: option.value as any })}
                disabled={saving}
              >
                <View style={styles.statusOptionContent}>
                  <Ionicons name={option.icon as any} size={20} color={option.color} />
                  <View style={styles.statusOptionText}>
                    <Text style={[styles.statusLabel, { color: option.color }]}>
                      {option.label}
                    </Text>
                    <Text style={styles.statusDescription}>
                      {option.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* やりたいこと（気分）設定 */}
          {status.status === 'free' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>やりたいこと</Text>
              <Text style={styles.sectionDescription}>
                今の気分に合うものを選択してください
              </Text>
              <View style={styles.moodGrid}>
                {MOOD_OPTIONS.map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    style={[
                      styles.moodButton,
                      status.mood.includes(mood) && styles.moodButtonSelected
                    ]}
                    onPress={() => toggleMood(mood)}
                    disabled={saving}
                  >
                    <Text style={[
                      styles.moodText,
                      status.mood.includes(mood) && styles.moodTextSelected
                    ]}>
                      {mood}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 利用可能時間設定 */}
          {status.status === 'free' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>いつまで空いていますか？</Text>
              <View style={styles.availabilityGrid}>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.availabilityButton,
                      (option.minutes === 0 && !status.availableUntil) ||
                      (option.minutes === null && status.availableUntil && new Date(status.availableUntil).getHours() === 23) ||
                      (option.minutes && status.availableUntil && 
                       Math.abs(status.availableUntil - Date.now() - option.minutes * 60 * 1000) < 60000) ?
                       styles.availabilityButtonSelected : {}
                    ]}
                    onPress={() => setAvailabilityTime(option.minutes)}
                    disabled={saving}
                  >
                    <Text style={[
                      styles.availabilityText,
                      (option.minutes === 0 && !status.availableUntil) ||
                      (option.minutes === null && status.availableUntil && new Date(status.availableUntil).getHours() === 23) ||
                      (option.minutes && status.availableUntil && 
                       Math.abs(status.availableUntil - Date.now() - option.minutes * 60 * 1000) < 60000) ?
                       styles.availabilityTextSelected : {}
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* カスタムメッセージ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>カスタムメッセージ</Text>
            <Text style={styles.sectionDescription}>
              友達に表示するメッセージを設定できます
            </Text>
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                value={status.customMessage}
                onChangeText={(text) => setStatus(prev => ({ ...prev, customMessage: text }))}
                placeholder="例：今夜飲みに行きたい！"
                maxLength={100}
                multiline
              />
              <TouchableOpacity
                style={[styles.updateButton, saving && styles.updateButtonDisabled]}
                onPress={() => updateStatus({ customMessage: status.customMessage })}
                disabled={saving}
              >
                <Text style={styles.updateButtonText}>
                  {saving ? '更新中...' : '更新'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.charCount}>{status.customMessage.length}/100</Text>
          </View>

          {/* 最終更新時刻 */}
          <View style={styles.footer}>
            <Text style={styles.lastUpdateText}>
              最終更新: {new Date(status.lastUpdate).toLocaleString('ja-JP')}
            </Text>
          </View>
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
  content: {
    padding: 16,
  },
  currentStatusSection: {
    marginBottom: 30,
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
  currentStatusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  currentStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentStatusText: {
    marginLeft: 12,
    flex: 1,
  },
  currentStatusLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  currentStatusDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  availabilityText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
  statusOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodButton: {
    width: '30%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  moodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  moodTextSelected: {
    color: '#007AFF',
  },
  availabilityGrid: {
    flexDirection: 'column',
  },
  availabilityButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  availabilityButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  availabilityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  availabilityTextSelected: {
    color: '#007AFF',
  },
  messageInputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  messageInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  lastUpdateText: {
    fontSize: 14,
    color: '#999',
  },
});