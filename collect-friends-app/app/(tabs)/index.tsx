import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
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

// Platform別のインポート
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
}

const { width, height } = Dimensions.get('window');

interface UserLocation {
  latitude: number;
  longitude: number;
}

const INITIAL_REGION = {
  latitude: 35.6762,
  longitude: 139.6503, // 東京駅付近
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function HomeScreen() {
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
  const mapRef = useRef<any>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'web') {
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
        return;
      }

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
      
      // マップを現在地に移動
      if (mapRef.current && Platform.OS !== 'web') {
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
    
    // TODO: Firestoreに保存する処理を実装
    Alert.alert(
      'ステータス更新完了',
      status.isAvailable 
        ? `${status.activities.join('、')} で遊べる人を探しています！`
        : '現在忙しい状態に設定されました。'
    );
  };

  const handleMyLocationPress = () => {
    if (userLocation && mapRef.current && Platform.OS !== 'web') {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
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

  const getMoveRangeText = () => {
    const range = userStatus.moveRange;
    if (range <= 500) return '徒歩5分圏内';
    if (range <= 1000) return '徒歩10分圏内';
    if (range <= 1500) return '徒歩15分圏内';
    if (range <= 3000) return '電車30分圏内';
    return '車1時間圏内';
  };

  if (loading) {
    return (
      <ThemedView style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <ActivityIndicator size="large" color="#007AFF" />
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
        <TouchableOpacity style={tw`bg-blue-500 px-8 py-3 rounded-full`} onPress={requestLocationPermission}>
          <Text style={tw`text-white text-base font-semibold`}>再試行</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Web用の代替画面
  if (Platform.OS === 'web') {
    return (
      <ThemedView style={tw`flex-1`}>
        {/* ヘッダー */}
        <View style={tw`p-5 pt-15 bg-blue-500 items-center`}>
          <ThemedText type="title">Correct Friends</ThemedText>
          <ThemedText style={tw`text-white text-sm mt-2 opacity-90`}>
            {userLocation ? `現在地: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : '位置情報取得中...'}
          </ThemedText>
        </View>

        {/* ステータス表示カード */}
        <View style={tw`m-5 bg-white rounded-2xl p-5 shadow-sm`}>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={[
              tw`w-4 h-4 rounded-full mr-3`,
              { backgroundColor: userStatus.isAvailable ? '#4CAF50' : '#FF9800' }
            ]} />
            <ThemedText type="subtitle">あなたの現在のステータス</ThemedText>
          </View>
          
          <View style={tw`mb-4`}>
            <ThemedText style={tw`text-lg font-semibold mb-2`}>{getStatusText()}</ThemedText>
            {userStatus.isAvailable && (
              <ThemedText style={tw`text-sm text-gray-600`}>移動範囲: {getMoveRangeText()}</ThemedText>
            )}
          </View>

          <TouchableOpacity
            style={tw`flex-row items-center justify-center bg-gray-100 p-3 rounded-xl`}
            onPress={() => setStatusModalVisible(true)}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
            <Text style={tw`ml-2 text-base text-blue-500 font-medium`}>ステータスを変更</Text>
          </TouchableOpacity>
        </View>

        {/* 位置情報カード */}
        {userLocation && (
          <View style={tw`mx-5 mt-0 bg-white rounded-2xl p-5 shadow-sm`}>
            <ThemedText type="subtitle">現在地情報</ThemedText>
            <View style={tw`mt-4`}>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="location" size={20} color="#007AFF" />
                <View style={tw`ml-3 flex-1`}>
                  <ThemedText style={tw`text-xs text-gray-600 mb-1`}>緯度</ThemedText>
                  <ThemedText style={tw`text-base font-medium`}>{userLocation.latitude.toFixed(6)}</ThemedText>
                </View>
              </View>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="location" size={20} color="#007AFF" />
                <View style={tw`ml-3 flex-1`}>
                  <ThemedText style={tw`text-xs text-gray-600 mb-1`}>経度</ThemedText>
                  <ThemedText style={tw`text-base font-medium`}>{userLocation.longitude.toFixed(6)}</ThemedText>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Web用注意事項 */}
        <View style={tw`mx-5 mt-0 p-4 bg-yellow-50 rounded-xl flex-row items-start`}>
          <Ionicons name="information-circle-outline" size={24} color="#FF9800" />
          <ThemedText style={tw`ml-3 flex-1 text-sm text-yellow-800 leading-5`}>
            Web版では地図表示に制限があります。{'\n'}
            完全な機能を利用するには、モバイルアプリをご利用ください。
          </ThemedText>
        </View>

        {/* ステータス設定モーダル */}
        <StatusModal
          visible={statusModalVisible}
          onClose={() => setStatusModalVisible(false)}
          onSave={handleStatusSave}
          currentStatus={userStatus}
        />
      </ThemedView>
    );
  }

  // モバイル用のマップ画面
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
            {/* 現在地のマーカー */}
            <Marker
              coordinate={userLocation}
              title="あなたの現在地"
              description={getStatusText()}
              onPress={() => setStatusModalVisible(true)}
            >
              <View style={[
                tw`w-10 h-10 rounded-full justify-center items-center border-2 border-white shadow-md`,
                { backgroundColor: userStatus.isAvailable ? '#4CAF50' : '#FF9800' }
              ]}>
                <Ionicons 
                  name="person" 
                  size={20} 
                  color="white" 
                />
              </View>
            </Marker>

            {/* 移動範囲の円 */}
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
      </MapView>

      {/* ステータス表示バー - セーフエリア内に配置 */}
      <SafeAreaView style={tw`absolute top-0 left-0 right-0`}>
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

      {/* フローティングアクションボタン - セーフエリア内に配置 */}
      <SafeAreaView style={tw`absolute right-0 bottom-0`}>
        <View style={tw`mr-4 mb-20`}>
        {/* 現在地ボタン */}
        <TouchableOpacity
          style={tw`w-14 h-14 rounded-full justify-center items-center shadow-lg bg-white mb-3`}
          onPress={handleMyLocationPress}
        >
          <Ionicons name="locate" size={24} color="#007AFF" />
        </TouchableOpacity>

        {/* ステータス設定ボタン */}
        <TouchableOpacity
          style={tw`w-14 h-14 rounded-full justify-center items-center shadow-lg bg-blue-500`}
          onPress={() => setStatusModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ステータス設定モーダル */}
      <StatusModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        onSave={handleStatusSave}
        currentStatus={userStatus}
      />
    </View>
  );
}
