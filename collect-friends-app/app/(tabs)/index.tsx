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
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { StatusModal, UserStatus } from '@/components/StatusModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import tw from 'twrnc';

// Dynamic import for web only
let WebMap: any = null;

interface UserLocation {
  latitude: number;
  longitude: number;
}

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
  }, []);

  const requestLocationPermission = async () => {
    try {
      // Web環境では位置情報APIを直接使用
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setUserLocation(newLocation);
            setLocationPermissionGranted(true);
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

  const handleStatusSave = (status: UserStatus) => {
    setUserStatus(status);
    console.log('ステータス保存:', status);
    
    Alert.alert(
      'ステータス更新完了',
      status.isAvailable 
        ? `${status.activities.join('、')} で遊べる人を探しています！`
        : '現在忙しい状態に設定されました。'
    );
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
        <ActivityIndicator size="large" color="#007AFF" />
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
        <TouchableOpacity style={tw`bg-blue-500 px-8 py-3 rounded-full`} onPress={requestLocationPermission}>
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
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* フローティングアクションボタン */}
      <SafeAreaView style={[tw`absolute right-0 bottom-0`, { zIndex: 1000 }]}>
        <View style={tw`mr-4 mb-20`}>
          <TouchableOpacity
            style={tw`w-14 h-14 rounded-full justify-center items-center shadow-lg bg-white mb-3`}
            onPress={() => {
              if (userLocation && webMapRef.current?.moveToLocation) {
                webMapRef.current.moveToLocation(userLocation);
              }
            }}
          >
            <Ionicons name="locate" size={24} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`w-14 h-14 rounded-full justify-center items-center shadow-lg bg-blue-500`}
            onPress={() => setStatusModalVisible(true)}
          >
            <Ionicons name="add" size={28} color="white" />
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
        const module = await import('@/components/NativeMapScreen');
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
