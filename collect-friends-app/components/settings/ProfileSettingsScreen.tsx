import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
// import * as ImagePicker from 'expo-image-picker';
// import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { router, useNavigation } from 'expo-router';
import { Icons } from '../../utils/iconHelper';

export default function ProfileSettingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={saving}
          style={styles.headerButton}
        >
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, saving]);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setDisplayName(userData.displayName || '');
        setBio(userData.bio || '');
        setProfileImage(userData.profileImage || '');
      }
    } catch (error) {
      console.error('ユーザーデータの読み込みエラー:', error);
      Alert.alert('エラー', 'プロフィール情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    // 画像アップロード機能は一時的に無効化
    Alert.alert('お知らせ', '画像アップロード機能は現在準備中です');
    
    // const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // 
    // if (status !== 'granted') {
    //   Alert.alert('権限エラー', '写真へのアクセス権限が必要です');
    //   return;
    // }

    // const result = await ImagePicker.launchImageLibraryAsync({
    //   mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //   allowsEditing: true,
    //   aspect: [1, 1],
    //   quality: 0.8,
    // });

    // if (!result.canceled && result.assets[0]) {
    //   uploadImage(result.assets[0].uri);
    // }
  };

  const uploadImage = async (uri: string) => {
    // 画像アップロード機能は一時的に無効化
    console.log('画像アップロード機能は準備中です:', uri);
    
    // setSaving(true);
    // try {
    //   const response = await fetch(uri);
    //   const blob = await response.blob();
    //   
    //   const storageRef = ref(storage, `profileImages/${user?.uid}/${Date.now()}.jpg`);
    //   const uploadTask = uploadBytesResumable(storageRef, blob);

    //   uploadTask.on(
    //     'state_changed',
    //     null,
    //     (error: any) => {
    //       console.error('アップロードエラー:', error);
    //       Alert.alert('エラー', '画像のアップロードに失敗しました');
    //       setSaving(false);
    //     },
    //     async () => {
    //       const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    //       setProfileImage(downloadURL);
    //       setSaving(false);
    //     }
    //   );
    // } catch (error) {
    //   console.error('画像処理エラー:', error);
    //   Alert.alert('エラー', '画像の処理に失敗しました');
    //   setSaving(false);
    // }
  };

  const handleSave = async () => {
    if (!user) {
      console.error('ユーザーが見つかりません');
      return;
    }
    
    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    setSaving(true);
    try {
      console.log('プロフィール保存開始:', {
        uid: user.uid,
        displayName: displayName.trim(),
        bio: bio.trim(),
        profileImage,
      });

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        bio: bio.trim(),
        profileImage,
        updatedAt: new Date(),
      });

      console.log('プロフィール保存成功');
      Alert.alert('成功', 'プロフィールを更新しました');
      router.back();
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', `プロフィールの保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
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
        <View style={styles.content}>
          <View style={styles.imageSection}>
            <TouchableOpacity onPress={handleImagePicker} disabled={saving}>
              <View style={styles.imageContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>画像を選択</Text>
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Text style={styles.editBadgeText}>編集</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>表示名</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="表示名を入力"
              maxLength={50}
            />
            <Text style={styles.charCount}>{displayName.length}/50</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>自己紹介</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="自己紹介を入力"
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/200</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>メールアドレス</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>ユーザーID</Text>
            <Text style={styles.infoValue}>{user?.uid}</Text>
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
  backButtonContainer: {
    padding: 4,
    borderRadius: 8,
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
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    padding: 16,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});