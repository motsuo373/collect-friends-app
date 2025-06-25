import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { Request, Response } from 'express';
import * as geolib from 'geolib';

const db = getFirestore();

// 位置情報共有レベル
enum LocationSharingLevel {
  DETAILED = 1,  // 詳細位置
  ROUGH = 2,     // 大雑把位置（約1km単位にぼかし）
  HIDDEN = 3,    // 非表示
  BLOCKED = 4    // ブロック
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

interface UpdateLocationRequest {
  location: LocationData;
  isOnline?: boolean;
  status?: 'free' | 'busy' | 'offline';
  mood?: string[];
  availableUntil?: number;
  customMessage?: string;
}



// 位置情報更新エンドポイント
export const updateLocation = onRequest(async (request: Request, response: Response) => {
  try {
    // CORS設定
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      response.status(200).send();
      return;
    }

    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // 認証確認
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Authorization header required' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const { location, isOnline = true, status = 'free', mood = [], availableUntil, customMessage }: UpdateLocationRequest = request.body;

    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      response.status(400).json({ error: 'Valid location (latitude, longitude) required' });
      return;
    }

    const now = Date.now();
    const timestamp = location.timestamp || now;

    // ユーザーの位置情報を更新
    const locationRef = db.collection('user_locations').doc(uid);
    await locationRef.set({
      uid,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      accuracy: location.accuracy || 0,
      lastUpdate: new Date(timestamp),
      isLocationEnabled: true,
      // 位置情報のマスキングレベル別座標を事前計算
      roughCoordinates: {
        latitude: Math.round(location.latitude * 100) / 100,
        longitude: Math.round(location.longitude * 100) / 100
      }
    }, { merge: true });

    // ユーザーステータスを更新
    const statusRef = db.collection('user_status').doc(uid);
    await statusRef.set({
      uid,
      status,
      mood,
      availableUntil: availableUntil ? new Date(availableUntil) : null,
      customMessage: customMessage || '',
      lastUpdate: new Date(now),
      isOnline
    }, { merge: true });

    logger.info(`Location updated for user: ${uid}`, {
      status,
      isOnline,
      roughLat: Math.round(location.latitude * 100) / 100,
      roughLng: Math.round(location.longitude * 100) / 100
    });

    response.json({
      success: true,
      timestamp: now
    });

  } catch (error) {
    logger.error('Location update error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});

// 近隣ユーザー検索エンドポイント（新実装：geohashベース）
export const searchNearbyUsers = onRequest(async (request: Request, response: Response) => {
  try {
    // CORS設定
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      response.status(200).send();
      return;
    }

    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // 認証確認
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Authorization header required' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const { location, radius = 5000 } = request.body; // デフォルト半径5km

    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      response.status(400).json({ error: 'Valid location (latitude, longitude) required' });
      return;
    }

    // ユーザーの友達関係を取得
    const relationshipsQuery = await db.collection('relationships')
      .where('status', '==', 'accepted')
      .get();

    const friendUids = new Set<string>();
    
    relationshipsQuery.forEach(doc => {
      const data = doc.data();
      const userAId = data.userARef?.id || data.userARef?.path?.split('/').pop();
      const userBId = data.userBRef?.id || data.userBRef?.path?.split('/').pop();
      
      if (userAId === uid) {
        friendUids.add(userBId);
      } else if (userBId === uid) {
        friendUids.add(userAId);
      }
    });

    const nearbyUsers: any[] = [];

    // 全ての友達の位置情報を取得（最適化は後で実装）
    for (const friendUid of friendUids) {
      try {
        const locationDoc = await db.collection('user_locations').doc(friendUid).get();
        const statusDoc = await db.collection('user_status').doc(friendUid).get();

        if (!locationDoc.exists || !statusDoc.exists) {
          continue;
        }

        const locationData = locationDoc.data();
        const statusData = statusDoc.data();

        // 位置情報が有効でない場合はスキップ
        if (!locationData?.isLocationEnabled) {
          continue;
        }

        // 最近更新された位置情報のみ（30分以内）
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
        if (locationData.lastUpdate?.toDate().getTime() < thirtyMinutesAgo) {
          continue;
        }

        // 距離計算
        const friendLocation = locationData.coordinates;
        const distance = geolib.getDistance(
          { latitude: location.latitude, longitude: location.longitude },
          { 
            latitude: friendLocation.latitude || friendLocation._latitude, 
            longitude: friendLocation.longitude || friendLocation._longitude 
          }
        );

        if (distance <= radius) {
          // ユーザー情報を取得
          const userDoc = await db.collection('users').doc(friendUid).get();

          if (userDoc.exists) {
            const userData = userDoc.data();

            // 位置共有設定を確認
            const sharingLevel = await getLocationSharingLevel(uid, friendUid);
            
            if (sharingLevel === LocationSharingLevel.HIDDEN || sharingLevel === LocationSharingLevel.BLOCKED) {
              continue;
            }

            // 共有レベルに応じて位置情報をマスキング
            let maskedLocation = null;
            if (sharingLevel === LocationSharingLevel.DETAILED) {
              maskedLocation = {
                latitude: friendLocation.latitude || friendLocation._latitude,
                longitude: friendLocation.longitude || friendLocation._longitude
              };
            } else if (sharingLevel === LocationSharingLevel.ROUGH) {
              maskedLocation = locationData.roughCoordinates;
            }

            nearbyUsers.push({
              uid: friendUid,
              displayName: userData?.displayName || 'Anonymous',
              profileImage: userData?.profileImage || null,
              location: maskedLocation,
              distance,
              status: statusData?.status || 'offline',
              mood: statusData?.mood || [],
              customMessage: statusData?.customMessage || '',
              lastUpdate: statusData?.lastUpdate?.toDate?.()?.getTime() || null,
              sharingLevel
            });
          }
        }
      } catch (error) {
        logger.error(`Error processing friend ${friendUid}:`, error);
        continue;
      }
    }

    // 距離順でソート
    nearbyUsers.sort((a, b) => a.distance - b.distance);

    response.json({
      success: true,
      users: nearbyUsers,
      count: nearbyUsers.length
    });

  } catch (error) {
    logger.error('Nearby users search error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});

// 位置共有レベル取得
async function getLocationSharingLevel(requestingUid: string, targetUid: string): Promise<LocationSharingLevel> {
  try {
    // 関係性を確認
    const relationshipQuery = await db.collection('relationships')
      .where('status', '==', 'accepted')
      .get();

    let locationSharingSettings = null;

    for (const doc of relationshipQuery.docs) {
      const data = doc.data();
      const userAId = data.userARef?.id || data.userARef?.path?.split('/').pop();
      const userBId = data.userBRef?.id || data.userBRef?.path?.split('/').pop();

      if (userAId === requestingUid && userBId === targetUid) {
        locationSharingSettings = data.locationSharingA;
        break;
      } else if (userAId === targetUid && userBId === requestingUid) {
        locationSharingSettings = data.locationSharingB;
        break;
      }
    }

    // デフォルトは大雑把位置共有
    return locationSharingSettings?.level || LocationSharingLevel.ROUGH;

  } catch (error) {
    logger.error('Error getting location sharing level:', error);
    return LocationSharingLevel.HIDDEN;
  }
} 