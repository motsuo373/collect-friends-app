import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import * as geohash from 'ngeohash';
import { 
  setDocument, 
  getDocument, 
  updateDocument, 
  deleteDocument, 
  getCollectionWithQuery,
  firestoreQueries 
} from './firestoreService';
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

export enum LocationSharingLevel {
  DETAILED = 1,
  APPROXIMATE = 2,
  HIDDEN = 3,
  BLOCKED = 4
}

// Firestore用の位置情報データ型
export interface FirestoreLocationData {
  uid: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  geohash: string;
  address?: string;
  lastUpdate: Date;
  isSharing: boolean;
  sharingSettings: { [friendUid: string]: { level: number; maskedCoordinates?: { lat: number; lng: number } } };
  locationHistory: { coordinates: { lat: number; lng: number }; timestamp: Date }[];
  expiresAt?: Date;
}

export interface LocationHistoryEntry {
  coordinates: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
}

export class LocationService {
  private static instance: LocationService;
  private currentLocation: LocationData | null = null;
  private updateInterval: any = null;
  private readonly UPDATE_INTERVAL = 60000;

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
   * Geohashを生成する
   */
  private generateGeohash(lat: number, lng: number, precision: number = 6): string {
    return geohash.encode(lat, lng, precision);
  }

  /**
   * 位置履歴エントリを作成
   */
  private createLocationHistoryEntry(coordinates: { lat: number; lng: number }): LocationHistoryEntry {
    return {
      coordinates,
      timestamp: new Date()
    };
  }

  /**
   * 位置情報をFirestoreに保存
   */
  async saveLocationToFirestore(
    location: LocationData, 
    isSharing: boolean = true,
    sharingSettings: { [friendUid: string]: { level: number; maskedCoordinates?: { lat: number; lng: number } } } = {}
  ): Promise<boolean> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.error('ユーザーが認証されていません');
        return false;
      }

      const coordinates = {
        lat: location.latitude,
        lng: location.longitude
      };

      await this.saveLocationData(user.uid, coordinates, isSharing, sharingSettings);
      return true;

    } catch (error) {
      console.error('位置情報保存エラー:', error);
      return false;
    }
  }

  /**
   * 位置情報を保存する（内部関数）
   */
  private async saveLocationData(
    uid: string,
    coordinates: { lat: number; lng: number },
    isSharing: boolean = true,
    sharingSettings: { [friendUid: string]: { level: number; maskedCoordinates?: { lat: number; lng: number } } } = {},
    address?: string,
    expiresAt?: Date
  ): Promise<void> {
    try {
      const existingLocation = await getDocument(`locations/${uid}`);
      
      const newHistoryEntry = this.createLocationHistoryEntry(coordinates);
      
      let locationHistory: LocationHistoryEntry[] = [];
      if (existingLocation?.locationHistory) {
        locationHistory = [...existingLocation.locationHistory];
      }
      locationHistory.unshift(newHistoryEntry);
      locationHistory = locationHistory.slice(0, 10);

      const geohashValue = this.generateGeohash(coordinates.lat, coordinates.lng);

      const locationData: Partial<FirestoreLocationData> = {
        uid,
        coordinates,
        geohash: geohashValue,
        lastUpdate: new Date(),
        isSharing,
        sharingSettings,
        locationHistory,
        ...(address && { address }),
        ...(expiresAt && { expiresAt })
      };

      await setDocument(`locations/${uid}`, locationData, true);
      
    } catch (error) {
      console.error('位置情報保存エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーの現在の位置情報を取得
   */
  async getUserLocationFromFirestore(uid: string): Promise<LocationData | null> {
    try {
      const locationData = await this.getLocationData(uid);
      
      if (!locationData) {
        return null;
      }

      return {
        latitude: locationData.coordinates.lat,
        longitude: locationData.coordinates.lng,
        timestamp: locationData.lastUpdate.getTime()
      };

    } catch (error) {
      console.error('位置情報取得エラー:', error);
      return null;
    }
  }

  /**
   * ユーザーの位置情報を取得する（内部関数）
   */
  private async getLocationData(uid: string): Promise<FirestoreLocationData | null> {
    try {
      const locationDoc = await getDocument(`locations/${uid}`);
      return locationDoc as FirestoreLocationData | null;
    } catch (error) {
      console.error('位置情報取得エラー:', error);
      throw error;
    }
  }

  /**
   * 位置共有設定を更新
   */
  async updateSharingSettings(
    friendUid: string, 
    level: LocationSharingLevel,
    maskedCoordinates?: { lat: number; lng: number }
  ): Promise<boolean> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.error('ユーザーが認証されていません');
        return false;
      }

      await this.updateLocationSharingSettings(user.uid, friendUid, level, maskedCoordinates);
      return true;

    } catch (error) {
      console.error('位置共有設定更新エラー:', error);
      return false;
    }
  }

  /**
   * 位置共有設定を更新する（内部関数）
   */
  private async updateLocationSharingSettings(
    uid: string,
    friendUid: string,
    level: number,
    maskedCoordinates?: { lat: number; lng: number }
  ): Promise<void> {
    try {
      const updateData = {
        [`sharingSettings.${friendUid}`]: {
          level,
          ...(maskedCoordinates && { maskedCoordinates })
        }
      };

      await updateDocument(`locations/${uid}`, updateData);
    } catch (error) {
      console.error('位置共有設定更新エラー:', error);
      throw error;
    }
  }

  /**
   * 近隣の位置情報を検索する
   */
  async findNearbyLocations(
    centerGeohash: string,
    precision: number = 6
  ): Promise<FirestoreLocationData[]> {
    try {
      const geohashPrefix = centerGeohash.substring(0, precision);
      
      const nearbyLocations = await getCollectionWithQuery('locations', [
        firestoreQueries.where('geohash', '>=', geohashPrefix),
        firestoreQueries.where('geohash', '<', geohashPrefix + '\uf8ff'),
        firestoreQueries.where('isSharing', '==', true),
        firestoreQueries.orderBy('geohash'),
        firestoreQueries.limit(50)
      ]);

      return nearbyLocations as FirestoreLocationData[];
    } catch (error) {
      console.error('近隣位置情報検索エラー:', error);
      throw error;
    }
  }

  /**
   * 位置情報の有効期限をチェックして期限切れのものを削除
   */
  async cleanupExpiredLocation(uid: string): Promise<void> {
    try {
      const locationData = await this.getLocationData(uid);
      
      if (locationData?.expiresAt && new Date() > locationData.expiresAt) {
        await deleteDocument(`locations/${uid}`);
      }
    } catch (error) {
      console.error('位置情報クリーンアップエラー:', error);
      throw error;
    }
  }

  /**
   * 定期的な位置情報更新を開始（1分間隔）
   */
  startPeriodicUpdates(isSharing: boolean = true): void {
    this.stopPeriodicUpdates();
    
    this.updateInterval = setInterval(async () => {
      try {
        const location = await this.getCurrentLocation();
        if (location) {
          await this.saveLocationToFirestore(location, isSharing);
        }
      } catch (error) {
        console.error('定期位置情報更新エラー:', error);
      }
    }, this.UPDATE_INTERVAL);

    this.getCurrentLocation().then(location => {
      if (location) {
        this.saveLocationToFirestore(location, isSharing);
      }
    });
  }

  /**
   * 定期的な位置情報更新を停止
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
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

    const distance = this.calculateDistance(
      this.currentLocation,
      newLocation
    );

    return distance > 100;
  }

  /**
   * 2点間の距離を計算（メートル）
   */
  private calculateDistance(point1: LocationData, point2: LocationData): number {
    const R = 6371e3;
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.stopPeriodicUpdates();
    this.currentLocation = null;
  }
}

 