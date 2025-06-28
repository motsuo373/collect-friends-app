import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  Text,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusModal, UserStatus } from '@/components/StatusModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { setDocument, getDocument, updateDocument } from '@/utils/firestoreService';
import { LocationService } from '@/utils/locationService';
import tw from 'twrnc';

// Dynamic import for web only
let WebMap: any = null;

interface UserLocation {
  latitude: number;
  longitude: number;
}

// UserStatusをFirestoreの構造に変換する関数（他のコンポーネントでも使用可能）
export const convertUserStatusToFirestore = (status: UserStatus) => {
  // 利用可能時間の計算
  const calculateAvailableUntil = (availabilityType: UserStatus['availabilityType']) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (availabilityType) {
      case 'now':
        // 3時間後まで暇
        return new Date(now.getTime() + 3 * 60 * 60 * 1000);
      case 'evening':
        // 今日の18:00から22:00まで
        const todayEvening = new Date(today);
        todayEvening.setHours(22, 0, 0, 0);
        return todayEvening;
      case 'tomorrow_morning':
        // 明日の9:00から12:00まで
        const tomorrowMorning = new Date(tomorrow);
        tomorrowMorning.setHours(12, 0, 0, 0);
        return tomorrowMorning;
      case 'tomorrow_evening':
        // 明日の18:00から22:00まで
        const tomorrowEvening = new Date(tomorrow);
        tomorrowEvening.setHours(22, 0, 0, 0);
        return tomorrowEvening;
      default:
        return new Date(now.getTime() + 3 * 60 * 60 * 1000);
    }
  };

  const availabilityText = {
    now: '今すぐ暇',
    evening: '夕方から暇',
    tomorrow_morning: '明日午前中暇',
    tomorrow_evening: '明日夕方から暇',
  }[status.availabilityType];

  return {
    status: status.isAvailable ? 'free' : 'busy',
    availabilityType: status.availabilityType,
    activities: status.activities,
    moveRange: status.moveRange,
    availableUntil: status.isAvailable ? calculateAvailableUntil(status.availabilityType) : null,
    customMessage: status.isAvailable ? `${availabilityText} - ${status.activities.join('・')}` : '現在忙しいです',
    lastUpdate: new Date(),
  };
};

// Web版のコンポーネント
function WebHomeScreen() {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>({
    isAvailable: false,
    availabilityType: 'now',
    activities: [],
    moveRange: 1000,
  });
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [webMapLoaded, setWebMapLoaded] = useState(false);
  const webMapRef = useRef<any>(null);
  const locationService = LocationService.getInstance();

  // Web用マップコンポーネントの動的読み込み
  useEffect(() => {
    const loadWebMap = async () => {
      try {
        const module = await import('@/components/WebMap');
        WebMap = module.default;
        setWebMapLoaded(true);
      } catch (error) {
        console.error('WebMap読み込みエラー:', error);
      }
    };
    
    loadWebMap();
  }, []);

  useEffect(() => {
    requestLocationPermission();
    loadUserStatus();
  }, []);

  // Firestoreからユーザーのステータスを読み込む
  const loadUserStatus = async () => {
    if (!user?.uid) return;

    try {
      const userData = await getDocument(`/users/${user.uid}`);
      
      if (userData?.currentStatus) {
        const firestoreStatus = userData.currentStatus;
        const convertedStatus: UserStatus = {
          isAvailable: firestoreStatus.status === 'free',
          availabilityType: firestoreStatus.availabilityType || 'now',
          activities: firestoreStatus.activities || [],
          moveRange: firestoreStatus.moveRange || 1000,
        };
        setUserStatus(convertedStatus);
      } else if (userData) {
        // ユーザーは存在するがステータスがない場合、デフォルトステータスを設定
        const defaultStatus: UserStatus = {
          isAvailable: false,
          availabilityType: 'now',
          activities: [],
          moveRange: 1000,
        };
        const firestoreStatus = convertUserStatusToFirestore(defaultStatus);
        
        await updateDocument(`/users/${user.uid}`, {
          currentStatus: firestoreStatus
        });
        
        setUserStatus(defaultStatus);
      } else {
        // ユーザードキュメント自体が存在しない場合、初期ユーザーデータを作成
        const defaultStatus: UserStatus = {
          isAvailable: false,
          availabilityType: 'now',
          activities: [],
          moveRange: 1000,
        };
        const firestoreStatus = convertUserStatusToFirestore(defaultStatus);
        
        await setDocument(`/users/${user.uid}`, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'ユーザー',
          currentStatus: firestoreStatus,
          isActive: true,
        });
        
        setUserStatus(defaultStatus);
      }
    } catch (error) {
      console.error('ユーザーステータス読み込みエラー:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      // Web環境では位置情報APIを直接使用
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setUserLocation(newLocation);
            setLocationPermissionGranted(true);
            
            // Firestoreに位置情報を保存
            const locationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 0,
              timestamp: Date.now()
            };
            
            const saveSuccess = await locationService.saveLocationToFirestore(locationData, true);
            if (!saveSuccess) {
              console.error('位置情報のFirestore保存に失敗しました');
            }
            
            setLoading(false);
          },
          (error) => {
            console.error('Web位置情報エラー:', error);
            setLoading(false);
            Alert.alert('エラー', 'Web環境で位置情報の取得に失敗しました。');
          }
        );
      } else {
        setLoading(false);
        Alert.alert('エラー', 'このブラウザは位置情報をサポートしていません。');
      }
    } catch (error) {
      console.error('位置情報の許可取得エラー:', error);
      Alert.alert('エラー', '位置情報の許可取得に失敗しました。');
      setLoading(false);
    }
  };

  const handleMyLocationPress = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setUserLocation(newLocation);
            
            // Firestoreに位置情報を保存
            const locationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 0,
              timestamp: Date.now()
            };
            
            const saveSuccess = await locationService.saveLocationToFirestore(locationData, true);
            if (saveSuccess) {
              Alert.alert('位置更新', '現在地がFirestoreに保存されました。');
            } else {
              Alert.alert('エラー', '位置情報の保存に失敗しました。');
            }

            // 地図の位置も更新
            if (webMapRef.current?.moveToLocation) {
              webMapRef.current.moveToLocation(newLocation);
            }
          },
          (error) => {
            console.error('Web位置情報エラー:', error);
            Alert.alert('エラー', '現在地の取得に失敗しました。');
          }
        );
      } else {
        Alert.alert('エラー', 'このブラウザは位置情報をサポートしていません。');
      }
    } catch (error) {
      console.error('現在地取得エラー:', error);
      Alert.alert('エラー', '現在地の取得に失敗しました。');
    }
  };

  const handleStatusSave = async (status: UserStatus) => {
    if (!user?.uid) {
      Alert.alert('エラー', 'ユーザー情報が取得できません。');
      return;
    }

    try {
      // UserStatusをFirestore形式に変換
      const firestoreStatus = convertUserStatusToFirestore(status);
      
      // Firestoreのusersコレクションにステータスを保存
      await updateDocument(`/users/${user.uid}`, {
        currentStatus: firestoreStatus
      });

      // ローカルステートも更新
      setUserStatus(status);
      
      console.log('ステータス保存完了:', firestoreStatus);
      
      Alert.alert(
        'ステータス更新完了',
        status.isAvailable 
          ? `${status.activities.join('、')} で遊べる人を探しています！`
          : '現在忙しい状態に設定されました。'
      );
    } catch (error) {
      console.error('ステータス保存エラー:', error);
      Alert.alert(
        'エラー',
        'ステータスの保存に失敗しました。ネットワーク接続を確認してください。'
      );
    }
  };

  const getStatusText = () => {
    if (!userStatus.isAvailable) return '忙しい';
    
    const activityText = userStatus.activities.length > 0 
      ? userStatus.activities.join('・') 
      : 'なんでも';
    
    const availabilityText = {
      now: '今すぐ',
      evening: '夕方から',
      tomorrow_morning: '明日午前',
      tomorrow_evening: '明日夕方',
    }[userStatus.availabilityType];

    return `${availabilityText} ${activityText}`;
  };

  if (loading || !webMapLoaded) {
    return (
      <ThemedView style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <ActivityIndicator size="large" color="#FF8700" />
        <ThemedText style={tw`mt-4 text-base text-gray-600`}>
          {loading ? '位置情報を取得中...' : 'マップを読み込み中...'}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!locationPermissionGranted) {
    return (
      <ThemedView style={tw`flex-1 justify-center items-center bg-gray-100 px-10`}>
        <Ionicons name="location-outline" size={64} color="#ccc" />
        <ThemedText type="title" style={tw`mt-5 mb-3 text-center`}>
          位置情報が必要です
        </ThemedText>
        <ThemedText style={tw`text-center text-gray-600 leading-6 mb-8`}>
          近くの友達を見つけるために{'\n'}位置情報の使用を許可してください
        </ThemedText>
        <TouchableOpacity style={[tw`px-8 py-3 rounded-full`, { backgroundColor: '#FF8700' }]} onPress={requestLocationPermission}>
          <Text style={tw`text-white text-base font-semibold`}>再試行</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <View style={tw`flex-1`}>
      {/* Leafletマップコンポーネント */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 1 
      }}>
        {WebMap && (
          <WebMap
            ref={webMapRef}
            userLocation={userLocation}
            userStatus={userStatus}
            onStatusPress={() => setStatusModalVisible(true)}
          />
        )}
      </div>

      {/* ステータス表示バー */}
      <SafeAreaView style={[tw`absolute top-0 left-0 right-0`, { zIndex: 1000 }]}>
        <View style={tw`mx-4 mt-2 bg-white rounded-full px-4 py-3 flex-row items-center shadow-lg`}>
          <View style={[
            tw`w-3 h-3 rounded-full mr-3`,
            { backgroundColor: userStatus.isAvailable ? '#4CAF50' : '#FF9800' }
          ]} />
          <Text style={tw`flex-1 text-sm font-medium text-gray-800`}>{getStatusText()}</Text>
          <TouchableOpacity
            style={tw`p-1`}
            onPress={() => setStatusModalVisible(true)}
          >
            <Ionicons name="create-outline" size={20} color="#FF8700" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* フローティングアクションボタン */}
      <SafeAreaView style={[tw`absolute right-0 bottom-0`, { zIndex: 1000 }]}>
        <View style={tw`mr-4 mb-20`}>
          <TouchableOpacity
            style={tw`w-14 h-14 rounded-full justify-center items-center shadow-lg bg-white mb-3`}
            onPress={handleMyLocationPress}
          >
            <Ionicons name="locate" size={24} color="#FF8700" />
          </TouchableOpacity>


        </View>
      </SafeAreaView>

      <StatusModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        onSave={handleStatusSave}
        currentStatus={userStatus}
      />
    </View>
  );
}

// ネイティブ版のコンポーネント - 動的インポートを使用
function NativeHomeScreen() {
  const [NativeMapComponent, setNativeMapComponent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNativeMap = async () => {
      try {
        // todo: 正しくエラー回避する方法を書く
        // @ts-expect-error: Dynamic import for platform-specific component
        const module = await import('@/components/NativeMapScreen'); // eslint-disable-line
        setNativeMapComponent(() => module.default);
      } catch (error) {
        console.error('NativeMapScreen読み込みエラー:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNativeMap();
  }, []);

  if (loading) {
    return (
      <ThemedView style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={tw`mt-4 text-base text-gray-600`}>マップを読み込み中...</ThemedText>
      </ThemedView>
    );
  }

  if (!NativeMapComponent) {
    return (
      <ThemedView style={tw`flex-1 justify-center items-center bg-gray-100 px-10`}>
        <Ionicons name="warning-outline" size={64} color="#FF9800" />
        <ThemedText type="title" style={tw`mt-5 mb-3 text-center`}>
          マップの読み込みに失敗しました
        </ThemedText>
      </ThemedView>
    );
  }

  return <NativeMapComponent />;
}

// メインのエクスポートコンポーネント
export default function HomeScreen() {
  // Web環境ではWebHomeScreen、ネイティブ環境ではNativeHomeScreenを返す
  if (Platform.OS === 'web') {
    return <WebHomeScreen />;
  } else {
    return <NativeHomeScreen />;
  }
}
