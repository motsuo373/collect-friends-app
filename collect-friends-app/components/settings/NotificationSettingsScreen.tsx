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
  Switch,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

interface NotificationSettings {
  ai_proposal: {
    enabled: boolean;
    push: boolean;
    priority: 'low' | 'normal' | 'high';
  };
  event_invitation: {
    enabled: boolean;
    push: boolean;
    priority: 'low' | 'normal' | 'high';
  };
  friend_request: {
    enabled: boolean;
    push: boolean;
    priority: 'low' | 'normal' | 'high';
  };
  general: {
    enabled: boolean;
    push: boolean;
    sound: boolean;
    vibration: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  ai_proposal: {
    enabled: true,
    push: true,
    priority: 'normal',
  },
  event_invitation: {
    enabled: true,
    push: true,
    priority: 'high',
  },
  friend_request: {
    enabled: true,
    push: true,
    priority: 'high',
  },
  general: {
    enabled: true,
    push: true,
    sound: true,
    vibration: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  },
};

export default function NotificationSettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const notificationSettings = userData.notificationSettings || DEFAULT_SETTINGS;
        setSettings({ ...DEFAULT_SETTINGS, ...notificationSettings });
      }
    } catch (error) {
      console.error('通知設定の読み込みエラー:', error);
      Alert.alert('エラー', '通知設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    if (!user) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationSettings: newSettings,
        updatedAt: new Date(),
      });
      
      setSettings(newSettings);
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category: keyof NotificationSettings, field: string, value: any) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [field]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updateNestedSetting = (category: keyof NotificationSettings, parent: string, field: string, value: any) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [parent]: {
          ...(settings[category] as any)[parent],
          [field]: value,
        },
      },
    };
    saveSettings(newSettings);
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
          <Text style={styles.title}>通知設定</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* 全般設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>全般</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>通知を有効にする</Text>
                <Text style={styles.settingDescription}>アプリからの通知を受け取ります</Text>
              </View>
              <Switch
                value={settings.general.enabled}
                onValueChange={(value) => updateSetting('general', 'enabled', value)}
                disabled={saving}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>プッシュ通知</Text>
                <Text style={styles.settingDescription}>端末にプッシュ通知を送信します</Text>
              </View>
              <Switch
                value={settings.general.push}
                onValueChange={(value) => updateSetting('general', 'push', value)}
                disabled={saving || !settings.general.enabled}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>サウンド</Text>
                <Text style={styles.settingDescription}>通知時に音を鳴らします</Text>
              </View>
              <Switch
                value={settings.general.sound}
                onValueChange={(value) => updateSetting('general', 'sound', value)}
                disabled={saving || !settings.general.enabled}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>バイブレーション</Text>
                <Text style={styles.settingDescription}>通知時にバイブレーションします</Text>
              </View>
              <Switch
                value={settings.general.vibration}
                onValueChange={(value) => updateSetting('general', 'vibration', value)}
                disabled={saving || !settings.general.enabled}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>サイレント時間</Text>
                <Text style={styles.settingDescription}>指定した時間帯は通知を無効にします</Text>
              </View>
              <Switch
                value={settings.general.quietHours.enabled}
                onValueChange={(value) => updateNestedSetting('general', 'quietHours', 'enabled', value)}
                disabled={saving || !settings.general.enabled}
              />
            </View>
          </View>

          {/* AI提案通知 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI提案</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>AI提案通知</Text>
                <Text style={styles.settingDescription}>AIからの集まり提案を通知します</Text>
              </View>
              <Switch
                value={settings.ai_proposal.enabled}
                onValueChange={(value) => updateSetting('ai_proposal', 'enabled', value)}
                disabled={saving || !settings.general.enabled}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>プッシュ通知</Text>
                <Text style={styles.settingDescription}>AI提案をプッシュ通知で受け取ります</Text>
              </View>
              <Switch
                value={settings.ai_proposal.push}
                onValueChange={(value) => updateSetting('ai_proposal', 'push', value)}
                disabled={saving || !settings.ai_proposal.enabled}
              />
            </View>

            <TouchableOpacity style={styles.prioritySelector}>
              <Text style={styles.priorityLabel}>優先度</Text>
              <View style={styles.priorityValue}>
                <Text style={styles.priorityText}>
                  {settings.ai_proposal.priority === 'low' ? '低' :
                   settings.ai_proposal.priority === 'normal' ? '中' : '高'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#999" />
              </View>
            </TouchableOpacity>
          </View>

          {/* イベント招待通知 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>イベント招待</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>イベント招待通知</Text>
                <Text style={styles.settingDescription}>友達からのイベント招待を通知します</Text>
              </View>
              <Switch
                value={settings.event_invitation.enabled}
                onValueChange={(value) => updateSetting('event_invitation', 'enabled', value)}
                disabled={saving || !settings.general.enabled}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>プッシュ通知</Text>
                <Text style={styles.settingDescription}>イベント招待をプッシュ通知で受け取ります</Text>
              </View>
              <Switch
                value={settings.event_invitation.push}
                onValueChange={(value) => updateSetting('event_invitation', 'push', value)}
                disabled={saving || !settings.event_invitation.enabled}
              />
            </View>

            <TouchableOpacity style={styles.prioritySelector}>
              <Text style={styles.priorityLabel}>優先度</Text>
              <View style={styles.priorityValue}>
                <Text style={styles.priorityText}>
                  {settings.event_invitation.priority === 'low' ? '低' :
                   settings.event_invitation.priority === 'normal' ? '中' : '高'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#999" />
              </View>
            </TouchableOpacity>
          </View>

          {/* 友達リクエスト通知 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>友達リクエスト</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>友達リクエスト通知</Text>
                <Text style={styles.settingDescription}>新しい友達リクエストを通知します</Text>
              </View>
              <Switch
                value={settings.friend_request.enabled}
                onValueChange={(value) => updateSetting('friend_request', 'enabled', value)}
                disabled={saving || !settings.general.enabled}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>プッシュ通知</Text>
                <Text style={styles.settingDescription}>友達リクエストをプッシュ通知で受け取ります</Text>
              </View>
              <Switch
                value={settings.friend_request.push}
                onValueChange={(value) => updateSetting('friend_request', 'push', value)}
                disabled={saving || !settings.friend_request.enabled}
              />
            </View>

            <TouchableOpacity style={styles.prioritySelector}>
              <Text style={styles.priorityLabel}>優先度</Text>
              <View style={styles.priorityValue}>
                <Text style={styles.priorityText}>
                  {settings.friend_request.priority === 'low' ? '低' :
                   settings.friend_request.priority === 'normal' ? '中' : '高'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#999" />
              </View>
            </TouchableOpacity>
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  prioritySelector: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  priorityValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
  },
});