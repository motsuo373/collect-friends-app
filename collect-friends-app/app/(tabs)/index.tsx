import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { StatusModal, UserStatus } from '@/components/StatusModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

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
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>位置情報を取得中...</ThemedText>
      </ThemedView>
    );
  }

  if (!locationPermissionGranted) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="location-outline" size={64} color="#ccc" />
        <ThemedText type="title" style={styles.errorTitle}>
          位置情報が必要です
        </ThemedText>
        <ThemedText style={styles.errorText}>
          近くの友達を見つけるために{'\n'}位置情報の使用を許可してください
        </ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Web用の代替画面
  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.webHeader}>
          <ThemedText type="title">Correct Friends</ThemedText>
          <ThemedText style={styles.webSubtitle}>
            {userLocation ? `現在地: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : '位置情報取得中...'}
          </ThemedText>
        </View>

        {/* ステータス表示カード */}
        <View style={styles.webStatusCard}>
          <View style={styles.webStatusHeader}>
            <View style={[
              styles.webStatusIndicator,
              { backgroundColor: userStatus.isAvailable ? '#4CAF50' : '#FF9800' }
            ]} />
            <ThemedText type="subtitle">あなたの現在のステータス</ThemedText>
          </View>
          
          <View style={styles.webStatusContent}>
            <ThemedText style={styles.webStatusText}>{getStatusText()}</ThemedText>
            {userStatus.isAvailable && (
              <ThemedText style={styles.webRangeText}>移動範囲: {getMoveRangeText()}</ThemedText>
            )}
          </View>

          <TouchableOpacity
            style={styles.webStatusButton}
            onPress={() => setStatusModalVisible(true)}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
            <Text style={styles.webStatusButtonText}>ステータスを変更</Text>
          </TouchableOpacity>
        </View>

        {/* 位置情報カード */}
        {userLocation && (
          <View style={styles.webLocationCard}>
            <ThemedText type="subtitle">現在地情報</ThemedText>
            <View style={styles.webLocationInfo}>
              <View style={styles.webLocationItem}>
                <Ionicons name="location" size={20} color="#007AFF" />
                <View style={styles.webLocationText}>
                  <ThemedText style={styles.webLocationLabel}>緯度</ThemedText>
                  <ThemedText style={styles.webLocationValue}>{userLocation.latitude.toFixed(6)}</ThemedText>
                </View>
              </View>
              <View style={styles.webLocationItem}>
                <Ionicons name="location" size={20} color="#007AFF" />
                <View style={styles.webLocationText}>
                  <ThemedText style={styles.webLocationLabel}>経度</ThemedText>
                  <ThemedText style={styles.webLocationValue}>{userLocation.longitude.toFixed(6)}</ThemedText>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Web用注意事項 */}
        <View style={styles.webNotice}>
          <Ionicons name="information-circle-outline" size={24} color="#FF9800" />
          <ThemedText style={styles.webNoticeText}>
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
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
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
                styles.userMarker,
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

      {/* ステータス表示バー */}
      <View style={styles.statusBar}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: userStatus.isAvailable ? '#4CAF50' : '#FF9800' }
        ]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setStatusModalVisible(true)}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* フローティングアクションボタン */}
      <View style={styles.fabContainer}>
        {/* 現在地ボタン */}
        <TouchableOpacity
          style={[styles.fab, styles.locationFab]}
          onPress={handleMyLocationPress}
        >
          <Ionicons name="locate" size={24} color="#007AFF" />
        </TouchableOpacity>

        {/* ステータス設定ボタン */}
        <TouchableOpacity
          style={[styles.fab, styles.statusFab]}
          onPress={() => setStatusModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  errorTitle: {
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  statusBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  editButton: {
    padding: 4,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  locationFab: {
    backgroundColor: 'white',
    marginBottom: 12,
  },
  statusFab: {
    backgroundColor: '#007AFF',
  },
  // Web用のスタイル
  webHeader: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  webSubtitle: {
    color: 'white',
    fontSize: 14,
    marginTop: 8,
    opacity: 0.9,
  },
  webStatusCard: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  webStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  webStatusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  webStatusContent: {
    marginBottom: 16,
  },
  webStatusText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  webRangeText: {
    fontSize: 14,
    color: '#666',
  },
  webStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 12,
  },
  webStatusButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  webLocationCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  webLocationInfo: {
    marginTop: 16,
  },
  webLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  webLocationText: {
    marginLeft: 12,
    flex: 1,
  },
  webLocationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  webLocationValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  webNotice: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  webNoticeText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    color: '#FF8F00',
    lineHeight: 20,
  },
});
