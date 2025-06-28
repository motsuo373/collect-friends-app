import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { router } from 'expo-router';

export default function SettingsIndexScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await signOut();
            } catch (error) {
              console.error('ログアウトエラー:', error);
              Alert.alert('エラー', 'ログアウトに失敗しました');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const navigateToSetting = (path: string) => {
    router.push(`/settings/${path}` as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>設定</ThemedText>
          </View>

          {/* ユーザー情報セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ユーザー情報</Text>
            <View style={styles.userInfo}>
              <View style={styles.userInfoRow}>
                <Text style={styles.label}>ユーザー名:</Text>
                <Text style={styles.value}>
                  {user?.displayName || 'ユーザー名未設定'}
                </Text>
              </View>
              <View style={styles.userInfoRow}>
                <Text style={styles.label}>メールアドレス:</Text>
                <Text style={styles.value}>{user?.email}</Text>
              </View>
              <View style={styles.userInfoRow}>
                <Text style={styles.label}>ユーザーID:</Text>
                <Text style={styles.value}>{user?.uid}</Text>
              </View>
            </View>
          </View>

          {/* アプリ設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>アプリ設定</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigateToSetting('profile')}
            >
              <Text style={styles.settingText}>プロフィール編集</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigateToSetting('notifications')}
            >
              <Text style={styles.settingText}>通知設定</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigateToSetting('privacy')}
            >
              <Text style={styles.settingText}>プライバシー設定</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigateToSetting('status')}
            >
              <Text style={styles.settingText}>ステータス設定</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigateToSetting('ai-preferences')}
            >
              <Text style={styles.settingText}>AI学習設定</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* サポートセクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>サポート</Text>
            
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>ヘルプ・FAQ</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>お問い合わせ</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>利用規約</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>プライバシーポリシー</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ログアウトボタン */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.logoutButton, loading && styles.buttonDisabled]}
              onPress={handleLogout}
              disabled={loading}
            >
              <Text style={styles.logoutButtonText}>
                {loading ? 'ログアウト中...' : 'ログアウト'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* アプリ情報 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Collect Friends App</Text>
            <Text style={styles.footerText}>Version 1.0.2</Text>
          </View>
        </ThemedView>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  userInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 20,
    color: '#ccc',
    fontWeight: '300',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
});