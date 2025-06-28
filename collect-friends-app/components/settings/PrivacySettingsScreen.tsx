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
  Image,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const LOCATION_SHARING_LEVELS = [
  { level: 1, name: '詳細位置', description: 'リアルタイム正確位置（恋人・家族向け）', color: '#FF3B30' },
  { level: 2, name: '大雑把位置', description: 'エリア位置のみ（友人向け）', color: '#FF9500' },
  { level: 3, name: '非表示', description: '位置情報非表示、オンライン状況のみ', color: '#007AFF' },
  { level: 4, name: 'ブロック', description: '全情報非表示', color: '#8E8E93' },
];

interface Friend {
  uid: string;
  displayName: string;
  profileImage: string;
  locationSharingLevel: number;
}

export default function PrivacySettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultLevel, setDefaultLevel] = useState(2);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [editingFriend, setEditingFriend] = useState<string | null>(null);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // ユーザーのプライバシー設定を読み込む
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setDefaultLevel(userData.privacySettings?.defaultLocationSharingLevel || 2);
      }

      // 友達リストと関係設定を読み込む
      const relationshipsQuery = query(
        collection(db, 'relationships'),
        where('userARef', '==', doc(db, 'users', user.uid)),
        where('status', '==', 'accepted')
      );
      
      const relationshipsSnapshot = await getDocs(relationshipsQuery);
      const friendsList: Friend[] = [];

      for (const relationDoc of relationshipsSnapshot.docs) {
        const relationData = relationDoc.data();
        const friendRef = relationData.userBRef;
        const friendDoc = await getDoc(friendRef);
        
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          friendsList.push({
            uid: friendDoc.id,
            displayName: friendData.displayName || 'ユーザー名未設定',
            profileImage: friendData.profileImage || '',
            locationSharingLevel: relationData.locationSharingA?.level || defaultLevel,
          });
        }
      }

      setFriends(friendsList);
    } catch (error) {
      console.error('プライバシー設定の読み込みエラー:', error);
      Alert.alert('エラー', 'プライバシー設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDefaultLevelChange = async (level: number) => {
    if (!user) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'privacySettings.defaultLocationSharingLevel': level,
        updatedAt: new Date(),
      });
      
      setDefaultLevel(level);
      Alert.alert('成功', 'デフォルトの位置共有レベルを更新しました');
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleFriendLevelChange = async (friendUid: string, level: number) => {
    if (!user) return;
    
    setSaving(true);
    try {
      // 関係ドキュメントを検索して更新
      const relationshipsQuery = query(
        collection(db, 'relationships'),
        where('userARef', '==', doc(db, 'users', user.uid)),
        where('userBRef', '==', doc(db, 'users', friendUid))
      );
      
      const snapshot = await getDocs(relationshipsQuery);
      if (!snapshot.empty) {
        const relationDoc = snapshot.docs[0];
        await updateDoc(relationDoc.ref, {
          'locationSharingA.level': level,
        });
        
        // ローカルステートを更新
        setFriends(prev => prev.map(friend => 
          friend.uid === friendUid 
            ? { ...friend, locationSharingLevel: level }
            : friend
        ));
        
        Alert.alert('成功', '位置共有レベルを更新しました');
      }
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setSaving(false);
      setEditingFriend(null);
    }
  };

  const renderLevelSelector = (currentLevel: number, onSelect: (level: number) => void) => {
    return (
      <View style={styles.levelSelector}>
        {LOCATION_SHARING_LEVELS.map((levelOption) => (
          <TouchableOpacity
            key={levelOption.level}
            style={[
              styles.levelOption,
              currentLevel === levelOption.level && styles.levelOptionSelected,
              { borderColor: levelOption.color }
            ]}
            onPress={() => onSelect(levelOption.level)}
            disabled={saving}
          >
            <Text style={[
              styles.levelOptionText,
              currentLevel === levelOption.level && { color: levelOption.color }
            ]}>
              {levelOption.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
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
          <Text style={styles.title}>プライバシー設定</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* デフォルト設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>デフォルト位置共有レベル</Text>
            <Text style={styles.sectionDescription}>
              新しい友達に対するデフォルトの位置共有レベルを設定します
            </Text>
            
            <View style={styles.levelInfo}>
              {LOCATION_SHARING_LEVELS.map((level) => (
                <View key={level.level} style={styles.levelDescription}>
                  <View style={[styles.levelIndicator, { backgroundColor: level.color }]} />
                  <View style={styles.levelTextContainer}>
                    <Text style={styles.levelName}>{level.name}</Text>
                    <Text style={styles.levelDesc}>{level.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {renderLevelSelector(defaultLevel, handleDefaultLevelChange)}
          </View>

          {/* 友達別設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>友達別の位置共有設定</Text>
            <Text style={styles.sectionDescription}>
              各友達に対する個別の位置共有レベルを設定します
            </Text>

            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>友達がいません</Text>
              </View>
            ) : (
              friends.map((friend) => (
                <View key={friend.uid} style={styles.friendItem}>
                  <View style={styles.friendInfo}>
                    {friend.profileImage ? (
                      <Image source={{ uri: friend.profileImage }} style={styles.friendImage} />
                    ) : (
                      <View style={styles.friendImagePlaceholder}>
                        <Ionicons name="person" size={24} color="#999" />
                      </View>
                    )}
                    <Text style={styles.friendName}>{friend.displayName}</Text>
                  </View>
                  
                  {editingFriend === friend.uid ? (
                    <View style={styles.editingContainer}>
                      {renderLevelSelector(
                        friend.locationSharingLevel,
                        (level) => handleFriendLevelChange(friend.uid, level)
                      )}
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setEditingFriend(null)}
                      >
                        <Text style={styles.cancelButtonText}>キャンセル</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.friendLevel}
                      onPress={() => setEditingFriend(friend.uid)}
                    >
                      <Text style={[
                        styles.friendLevelText,
                        { color: LOCATION_SHARING_LEVELS.find(l => l.level === friend.locationSharingLevel)?.color }
                      ]}>
                        {LOCATION_SHARING_LEVELS.find(l => l.level === friend.locationSharingLevel)?.name}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
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
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  levelInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  levelDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  levelTextContainer: {
    flex: 1,
  },
  levelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  levelDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  levelSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
  },
  levelOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  levelOptionSelected: {
    backgroundColor: '#f0f0f0',
  },
  levelOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  friendItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  friendLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  friendLevelText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  editingContainer: {
    marginTop: 8,
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});