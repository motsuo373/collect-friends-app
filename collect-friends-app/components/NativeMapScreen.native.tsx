import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  Text,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { StatusModal, UserStatus } from '@/components/StatusModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { LocationService } from '@/utils/locationService';
import { useFriends, FriendData } from '@/hooks/useFriends';
import MapView, { Marker, Circle } from 'react-native-maps';
import tw from 'twrnc';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface FriendMapData {
  uid: string;
  name: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  isAvailable: boolean;
  activities: string[];
  shareLevel: number;
}

const INITIAL_REGION = {
  latitude: 35.6762,
  longitude: 139.6503, // 東京駅付近
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// FriendDataをFriendMapDataに変換するユーティリティ関数
const convertFriendToMapData = (friend: FriendData, userLocation: UserLocation | null): FriendMapData | null => {
  // 位置情報がない友達は表示しない
  if (!friend.sharedLocation?.coordinates) {
    return null;
  }

  // 距離を計算（簡易実装）
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // メートル
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const distance = userLocation 
    ? calculateDistance(
        userLocation.latitude, 
        userLocation.longitude,
        friend.sharedLocation.coordinates.lat,
        friend.sharedLocation.coordinates.lng
      )
    : 0;

  return {
    uid: friend.friendUid,
    name: friend.displayName,
    coordinate: {
      latitude: friend.sharedLocation.coordinates.lat,
      longitude: friend.sharedLocation.coordinates.lng,
    },
    distance: Math.round(distance),
    isAvailable: friend.isAvailableNow,
    activities: friend.activities,
    shareLevel: friend.sharedLocation.level,
  };
};

export default function NativeMapScreen() {
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
  const mapRef = useRef<MapView>(null);
  const locationService = LocationService.getInstance();
  
  // 友達データを取得
  const { friends, loading: friendsLoading, error: friendsError } = useFriends(user?.uid || null);

  // 友達データをマップ用に変換
  const friendsMapData: FriendMapData[] = React.useMemo(() => {
    return friends
      .map(friend => convertFriendToMapData(friend, userLocation))
      .filter((friend): friend is FriendMapData => friend !== null);
  }, [friends, userLocation]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          '位置情報の許可が必要です',
          '近くの友達を見つけるために位置情報の使用を許可してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定を開く', onPress: () => Location.requestForegroundPermissionsAsync() },
          ]
        );
        setLoading(false);
        return;
      }

      setLocationPermissionGranted(true);
      getCurrentLocation();
    } catch (error) {
      console.error('位置情報の許可取得エラー:', error);
      Alert.alert('エラー', '位置情報の許可取得に失敗しました。');
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(newLocation);
      
      // Firestoreに位置情報を保存
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: Date.now()
      };
      
      const saveSuccess = await locationService.saveLocationToFirestore(locationData, true);
      if (!saveSuccess) {
        console.error('位置情報のFirestore保存に失敗しました');
      }
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...newLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } catch (error) {
      console.error('現在地取得エラー:', error);
      Alert.alert('エラー', '現在地の取得に失敗しました。');
    } finally {
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

  const handleMyLocationPress = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(newLocation);
      
      // Firestoreに位置情報を保存
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: Date.now()
      };
      
      const saveSuccess = await locationService.saveLocationToFirestore(locationData, true);
      if (saveSuccess) {
        Alert.alert('位置更新', '現在地がFirestoreに保存されました。');
      } else {
        Alert.alert('エラー', '位置情報の保存に失敗しました。');
      }

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...newLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } catch (error) {
      console.error('現在地取得エラー:', error);
      Alert.alert('エラー', '現在地の取得に失敗しました。');
    }
  };

  const getStatusText = () => {
    if (!userStatus.isAvailable) return '忙しい';
    return '暇している';
  };

  const handleFriendPress = (friend: FriendMapData) => {
    const distanceText = friend.distance < 1000 
      ? `${friend.distance}m` 
      : `${(friend.distance / 1000).toFixed(1)}km`;
    
    const statusText = friend.isAvailable 
      ? (friend.activities.length > 0 ? friend.activities.join('・') : '暇している')
      : '忙しい';

    Alert.alert(
      `${friend.name}さん`,
      `距離: ${distanceText}\nステータス: ${statusText}`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '話しかける', 
          onPress: () => {
            // TODO: チャット画面に遷移（友達テーマカラー: #FFB366を将来的に適用）
            console.log('チャット開始:', friend.uid);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <ThemedView style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <ActivityIndicator size="large" color="#FF8700" />
        <ThemedText style={tw`mt-4 text-base text-gray-600`}>位置情報を取得中...</ThemedText>
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
      <MapView
        ref={mapRef}
        style={tw`absolute inset-0`}
        initialRegion={userLocation ? {
          ...userLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : INITIAL_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {userLocation && (
          <>
            <Marker
              coordinate={userLocation}
              title="あなたの現在地"
              description={getStatusText()}
            >
              <View style={[
                tw`w-10 h-10 rounded-full justify-center items-center border-2 border-white shadow-md`,
                { backgroundColor: userStatus.isAvailable ? '#FF8700' : '#666666' }
              ]}>
                <Ionicons 
                  name="person" 
                  size={20} 
                  color="white" 
                />
              </View>
            </Marker>

            {userStatus.isAvailable && (
              <Circle
                center={userLocation}
                radius={userStatus.moveRange}
                fillColor="rgba(0, 122, 255, 0.1)"
                strokeColor="rgba(0, 122, 255, 0.3)"
                strokeWidth={2}
              />
            )}
          </>
        )}

        {/* 友達のマーカー */}
        {friendsMapData.map((friend) => (
          <Marker
            key={friend.uid}
            coordinate={friend.coordinate}
            title={friend.name}
            description={friend.isAvailable ? friend.activities.join('・') || '暇している' : '忙しい'}
            onPress={() => handleFriendPress(friend)}
          >
            <View style={[
              tw`w-8 h-8 rounded-full justify-center items-center border-2 border-white shadow-md`,
              { 
                backgroundColor: friend.isAvailable ? '#FFB366' : '#FFCC99', // 薄いオレンジ系の色に変更
                opacity: friend.shareLevel > 2 ? 0.7 : 1.0 // 共有レベルが低い場合は透明度を下げる
              }
            ]}>
              <Ionicons 
                name="people" 
                size={16} 
                color="white" 
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={tw`absolute top-0 left-0 right-0`}>
        <View style={tw`mx-4 mt-2`}>
          <TouchableOpacity 
            style={tw`bg-white rounded-full px-5 py-3 flex-row items-center justify-center shadow-lg`}
            onPress={() => setStatusModalVisible(true)}
          >
            <View style={[
              tw`w-2 h-2 rounded-full mr-2`,
              { backgroundColor: userStatus.isAvailable ? '#34C759' : '#FF8700' }
            ]} />
            <Text style={tw`flex-1 text-base font-normal text-black`}>
              {getStatusText()}
            </Text>
            <TouchableOpacity
              style={tw`p-1`}
              onPress={() => setStatusModalVisible(true)}
            >
              <Ionicons name="settings-outline" size={20} color="#FF8700" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SafeAreaView style={tw`absolute right-0 bottom-0`}>
        <View style={tw`mr-4 mb-20`}>
          <TouchableOpacity
            style={tw`w-14 h-14 rounded-full justify-center items-center shadow-lg bg-white mb-3`}
            onPress={handleMyLocationPress}
          >
            <Ionicons name="locate" size={24} color="#FF8700" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[tw`w-14 h-14 rounded-full justify-center items-center shadow-lg`, { backgroundColor: '#FF8700' }]}
            onPress={() => setStatusModalVisible(true)}
          >
            <Ionicons name="settings" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <StatusModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        onSave={handleStatusSave}
        currentStatus={userStatus}
      />

      {/* 友達データエラー表示（デバッグ用） */}
      {friendsError && (
        <SafeAreaView style={tw`absolute top-16 left-4 right-4`}>
          <View style={[tw`p-3 rounded-lg`, { backgroundColor: 'rgba(255, 204, 153, 0.3)' }]}>
            <Text style={[tw`text-sm font-medium`, { color: '#FF8700' }]}>友達データエラー: {friendsError}</Text>
          </View>
        </SafeAreaView>
      )}

      {/* 友達数表示（デバッグ用） */}
      {friendsMapData.length > 0 && (
        <SafeAreaView style={tw`absolute top-24 left-4`}>
          <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: 'rgba(255, 179, 102, 0.2)' }]}>
            <Text style={[tw`text-sm font-medium`, { color: '#FF8700' }]}>
              友達: {friendsMapData.length}人
            </Text>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}