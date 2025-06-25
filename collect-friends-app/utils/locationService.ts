import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';

// 位置情報データ型
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface UserStatus {
  status: 'free' | 'busy' | 'offline';
  mood: string[];
  availableUntil?: number;
  customMessage?: string;
  isOnline: boolean;
}

export interface NearbyUser {
  uid: string;
  displayName: string;
  profileImage?: string;
  location: LocationData;
  distance: number;
  status: string;
  mood: string[];
  customMessage: string;
  lastUpdate: number;
  sharingLevel: number;
}

// API基本URL（本番のCloud Functionsを使用）
const API_BASE_URL = 'https://asia-northeast1-collect-friends-app.cloudfunctions.net';

export class LocationService {
  private static instance: LocationService;
  private currentLocation: LocationData | null = null;
  private updateInterval: number | null = null;
  private readonly UPDATE_INTERVAL = 30000; // 30秒間隔

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * 位置情報の使用許可を要求
   */
  async requestPermission(): Promise<boolean> {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('位置情報の使用が許可されませんでした');
        return false;
      }

      return true;
    } catch (error) {
      console.error('位置情報の許可要求エラー:', error);
      return false;
    }
  }

  /**
   * 現在位置を取得
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // 10秒でタイムアウト
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: Date.now()
      };

      this.currentLocation = locationData;
      return locationData;
    } catch (error) {
      console.error('位置情報取得エラー:', error);
      return null;
    }
  }

  /**
   * 位置情報とステータスをサーバーに更新
   */
  async updateLocationAndStatus(
    location: LocationData, 
    userStatus: UserStatus
  ): Promise<boolean> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.error('ユーザーが認証されていません');
        return false;
      }

      const idToken = await user.getIdToken();

      const response = await fetch(`${API_BASE_URL}/updateLocation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          location,
          isOnline: userStatus.isOnline,
          status: userStatus.status,
          mood: userStatus.mood,
          availableUntil: userStatus.availableUntil,
          customMessage: userStatus.customMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('位置情報更新エラー:', errorData);
        return false;
      }

      const result = await response.json();
      console.log('位置情報更新成功:', result);
      return true;

    } catch (error) {
      console.error('位置情報更新エラー:', error);
      return false;
    }
  }

  /**
   * 近隣ユーザーを検索
   */
  async searchNearbyUsers(location: LocationData, radius: number = 5000): Promise<NearbyUser[]> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.error('ユーザーが認証されていません');
        return [];
      }

      const idToken = await user.getIdToken();

      const response = await fetch(`${API_BASE_URL}/searchNearbyUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          location,
          radius
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('近隣ユーザー検索エラー:', errorData);
        return [];
      }

      const result = await response.json();
      return result.users || [];

    } catch (error) {
      console.error('近隣ユーザー検索エラー:', error);
      return [];
    }
  }

  /**
   * 定期的な位置情報更新を開始
   */
  startPeriodicUpdates(userStatus: UserStatus): void {
    // 既存のタイマーがあれば停止
    this.stopPeriodicUpdates();

    this.updateInterval = setInterval(async () => {
      const location = await this.getCurrentLocation();
      if (location) {
        await this.updateLocationAndStatus(location, userStatus);
      }
    }, this.UPDATE_INTERVAL);

    console.log('定期的な位置情報更新を開始しました（30秒間隔）');
  }

  /**
   * 定期的な位置情報更新を停止
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('定期的な位置情報更新を停止しました');
    }
  }

  /**
   * 現在の位置情報を取得（キャッシュされた値）
   */
  getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }

  /**
   * 位置が大幅に変わったかどうかをチェック
   */
  hasLocationChangedSignificantly(newLocation: LocationData): boolean {
    if (!this.currentLocation) {
      return true;
    }

    // 約100メートル以上移動した場合に更新
    const distance = this.calculateDistance(
      this.currentLocation,
      newLocation
    );

    return distance > 100; // 100メートル
  }

  /**
   * 2点間の距離を計算（メートル）
   */
  private calculateDistance(point1: LocationData, point2: LocationData): number {
    const R = 6371e3; // 地球の半径（メートル）
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // メートル
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.stopPeriodicUpdates();
    this.currentLocation = null;
  }
} 