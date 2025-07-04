import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import * as geolib from 'geolib';

interface UserLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface UserStatus {
  isAvailable: boolean;
  availabilityType: 'now' | 'evening' | 'tomorrow_morning' | 'tomorrow_evening';
  activities: string[];
  moveRange: number;
  lastUpdated: number;
}

interface NearbyUserResponse {
  uid: string;
  name: string;
  distance: number;
  status: UserStatus;
  location: {
    latitude: number;
    longitude: number;
    accuracy: 'exact' | 'approximate' | 'area';
  };
  shareLevel: 'detailed' | 'approximate' | 'hidden';
}

// 近くのユーザーを取得するAPI
export const getNearbyUsers = onRequest(
  { cors: true, region: 'asia-northeast1' },
  async (request, response) => {
    try {
      // 認証チェック
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        response.status(401).json({ error: '認証が必要です' });
        return;
      }

      // リクエストパラメータの取得
      const { latitude, longitude, radius = 5000 } = request.body;
      
      if (!latitude || !longitude) {
        response.status(400).json({ 
          error: '位置情報（latitude, longitude）が必要です' 
        });
        return;
      }

      const userLocation = { latitude, longitude };
      const searchRadius = Math.min(radius, 10000); // 最大10km

      logger.info('近くのユーザー検索開始', {
        latitude,
        longitude,
        radius: searchRadius
      });

      // Firestore とRealtime Database の初期化
      const firestore = getFirestore();
      const realtimeDb = getDatabase();

      // アクティブなユーザーの位置情報を取得（Realtime Database）
      const locationSnapshot = await realtimeDb.ref('location_data').once('value');
      const locationData = locationSnapshot.val() || {};

      // ユーザーステータスを取得（Realtime Database）
      const statusSnapshot = await realtimeDb.ref('user_status').once('value');
      const statusData = statusSnapshot.val() || {};

      const nearbyUsers: NearbyUserResponse[] = [];

      // 各ユーザーの位置情報をチェック
      for (const [uid, location] of Object.entries(locationData)) {
        const userLocation_data = location as UserLocation;
        const userStatus = statusData[uid] as UserStatus;

        // 最近更新された位置情報のみを対象とする（30分以内）
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
        if (userLocation_data.timestamp < thirtyMinutesAgo) {
          continue;
        }

        // 距離計算
        const distance = geolib.getDistance(
          userLocation,
          {
            latitude: userLocation_data.latitude,
            longitude: userLocation_data.longitude
          }
        );

        // 指定範囲内のユーザーのみ
        if (distance <= searchRadius) {
          // Firestoreからユーザー詳細情報を取得
          const userDoc = await firestore.collection('users').doc(uid).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            // TODO: 実際の関係性チェック（現在はモック）
            const shareLevel = getLocationShareLevel(distance);
            
            nearbyUsers.push({
              uid,
              name: userData?.name || '匿名ユーザー',
              distance,
              status: userStatus || {
                isAvailable: false,
                availabilityType: 'now',
                activities: [],
                moveRange: 1000,
                lastUpdated: Date.now()
              },
              location: {
                latitude: shareLevel === 'detailed' ? userLocation_data.latitude : 
                         Math.round(userLocation_data.latitude * 100) / 100,
                longitude: shareLevel === 'detailed' ? userLocation_data.longitude :
                          Math.round(userLocation_data.longitude * 100) / 100,
                accuracy: shareLevel === 'detailed' ? 'exact' : 
                         shareLevel === 'approximate' ? 'approximate' : 'area'
              },
              shareLevel
            });
          }
        }
      }

      // 距離順でソート
      nearbyUsers.sort((a, b) => a.distance - b.distance);

      logger.info('近くのユーザー検索完了', {
        foundUsers: nearbyUsers.length,
        searchRadius
      });

      response.json({
        success: true,
        users: nearbyUsers,
        searchCenter: userLocation,
        searchRadius,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('近くのユーザー取得エラー:', error);
      response.status(500).json({
        error: 'サーバーエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// 位置情報共有レベルを決定（実際はFirestoreの関係性データから取得）
function getLocationShareLevel(distance: number): 'detailed' | 'approximate' | 'hidden' {
  // TODO: 実際の関係性データベースから共有レベルを取得
  // 現在は距離ベースの簡易実装
  if (distance < 500) return 'detailed';      // 500m以内は詳細
  if (distance < 2000) return 'approximate';  // 2km以内は大雑把
  return 'hidden';                            // それ以外は非表示
}

// ユーザーステータス更新API
export const updateUserStatus = onRequest(
  { cors: true, region: 'asia-northeast1' },
  async (request, response) => {
    try {
      // 認証チェック
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        response.status(401).json({ error: '認証が必要です' });
        return;
      }

      // TODO: Firebase Auth トークンの検証
      const uid = 'current_user_id'; // 実際はトークンから取得

      const { 
        isAvailable, 
        availabilityType, 
        activities, 
        moveRange 
      } = request.body;

      const userStatus: UserStatus = {
        isAvailable: Boolean(isAvailable),
        availabilityType: availabilityType || 'now',
        activities: Array.isArray(activities) ? activities : [],
        moveRange: Number(moveRange) || 1000,
        lastUpdated: Date.now()
      };

      // Realtime Database にステータスを保存
      const realtimeDb = getDatabase();
      await realtimeDb.ref(`user_status/${uid}`).set(userStatus);

      logger.info('ユーザーステータス更新', { uid, status: userStatus });

      response.json({
        success: true,
        status: userStatus,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('ユーザーステータス更新エラー:', error);
      response.status(500).json({
        error: 'ステータス更新に失敗しました'
      });
    }
  }
);

// 位置情報更新API
export const updateUserLocation = onRequest(
  { cors: true, region: 'asia-northeast1' },
  async (request, response) => {
    try {
      // 認証チェック
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        response.status(401).json({ error: '認証が必要です' });
        return;
      }

      // TODO: Firebase Auth トークンの検証
      const uid = 'current_user_id'; // 実際はトークンから取得

      const { latitude, longitude } = request.body;
      
      if (!latitude || !longitude) {
        response.status(400).json({ 
          error: '位置情報（latitude, longitude）が必要です' 
        });
        return;
      }

      const locationData: UserLocation = {
        latitude: Number(latitude),
        longitude: Number(longitude),
        timestamp: Date.now()
      };

      // Realtime Database に位置情報を保存
      const realtimeDb = getDatabase();
      await realtimeDb.ref(`location_data/${uid}`).set(locationData);

      logger.info('位置情報更新', { uid, location: locationData });

      response.json({
        success: true,
        location: locationData
      });

    } catch (error) {
      logger.error('位置情報更新エラー:', error);
      response.status(500).json({
        error: '位置情報の更新に失敗しました'
      });
    }
  }
); 