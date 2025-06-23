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
import MapView, { Marker, Circle } from 'react-native-maps';
import tw from 'twrnc';

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

  const handleMyLocationPress = () => {
    if (userLocation && mapRef.current) {
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

      <SafeAreaView style={tw`absolute right-0 bottom-0`}>
        <View style={tw`mr-4 mb-20`}>
          <TouchableOpacity
            style={tw`w-14 h-14 rounded-full justify-center items-center shadow-lg bg-white mb-3`}
            onPress={handleMyLocationPress}
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