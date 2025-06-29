import { useState, useEffect } from 'react';
import { DocumentData } from 'firebase/firestore';
import { getCollectionWithQuery, firestoreQueries } from '../utils/firestoreService';

// database.mdのfriendsListサブコレクションに基づく友人データの型定義
export interface FriendData {
  id: string;
  friendUid: string;
  displayName: string;
  profileImage?: string;
  bio?: string;
  currentStatus: 'free' | 'busy' | 'offline';
  mood: string[];
  availableUntil?: Date;
  customMessage?: string;
  isOnline: boolean;
  lastActive?: Date;
  // friendsListから取得される位置情報
  sharedLocation?: {
    level: number;
    coordinates?: {
      lat: number;
      lng: number;
    };
    maskedCoordinates?: {
      lat: number;
      lng: number;
      accuracy: string;
    };
    statusOnly?: boolean;
    areaDescription?: string;
    distanceRange?: string;
  };
  locationLastUpdate?: Date;
  // 関係情報
  sharingLevel: number;
  isFavorite: boolean;
  interactionCount: number;
  lastInteraction?: Date;
  // UI表示用の計算プロパティ
  isAvailableNow: boolean;
  isWithinWalkingDistance: boolean;
  lastSeen?: string;
  activities: string[];
}

export interface FriendsHookResult {
  friends: FriendData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 現在のユーザーの友人データをfriendsListサブコレクションから取得するhook
 * @param currentUserUid - 現在のユーザーのUID
 * @returns 友人データとロード状態
 */
export const useFriends = (currentUserUid: string | null): FriendsHookResult => {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = async () => {
    if (!currentUserUid) {
      setFriends([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // users/{uid}/friendsListサブコレクションから友人データを取得
      const friendsListData = await getCollectionWithQuery(
        `users/${currentUserUid}/friendsList`
      );

      if (friendsListData.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // friendsListデータをFriendData形式に変換
      const friendsData: FriendData[] = friendsListData.map((friendDoc: DocumentData) => {
        const friend: FriendData = {
          id: friendDoc.id, // ドキュメントID（friend uid）
          friendUid: friendDoc.friendUid || friendDoc.id,
          displayName: friendDoc.displayName || '名前未設定',
          profileImage: friendDoc.profileImage,
          bio: friendDoc.bio,
          currentStatus: friendDoc.currentStatus || 'offline',
          mood: friendDoc.mood || [],
          availableUntil: friendDoc.availableUntil?.toDate ? friendDoc.availableUntil.toDate() : undefined,
          customMessage: friendDoc.customMessage,
          isOnline: friendDoc.isOnline || false,
          lastActive: friendDoc.lastActive?.toDate ? friendDoc.lastActive.toDate() : undefined,
          
          // friendsListから直接取得できる位置情報
          sharedLocation: friendDoc.sharedLocation,
          locationLastUpdate: friendDoc.locationLastUpdate?.toDate ? friendDoc.locationLastUpdate.toDate() : undefined,
          
          // 関係情報
          sharingLevel: friendDoc.sharingLevel || 2,
          isFavorite: friendDoc.isFavorite || false,
          interactionCount: friendDoc.interactionCount || 0,
          lastInteraction: friendDoc.lastInteraction?.toDate ? friendDoc.lastInteraction.toDate() : undefined,
          
          // UI表示用の計算プロパティ
          isAvailableNow: (friendDoc.currentStatus === 'free' && friendDoc.isOnline),
          isWithinWalkingDistance: calculateWalkingDistanceFromSharedLocation(friendDoc.sharedLocation),
          lastSeen: calculateLastSeen(friendDoc.lastActive?.toDate ? friendDoc.lastActive.toDate() : undefined),
          activities: mapMoodToActivities(friendDoc.mood || []),
        };

        return friend;
      }).filter(friend => friend.displayName !== '名前未設定'); // 無効なデータを除外

      setFriends(friendsData);
      
    } catch (err) {
      console.error('友人データ取得エラー:', err);
      setError('友人データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [currentUserUid]);

  return {
    friends,
    loading,
    error,
    refetch: fetchFriends,
  };
};

/**
 * sharedLocationから徒歩圏内かどうかを判定
 * @param sharedLocation - 友人の共有位置情報
 * @returns 徒歩圏内かどうか
 */
function calculateWalkingDistanceFromSharedLocation(
  sharedLocation?: { 
    level: number; 
    coordinates?: { lat: number; lng: number }; 
    distanceRange?: string; 
  }
): boolean {
  if (!sharedLocation) return false;
  
  // 共有レベルが3以上の場合は位置情報が非表示なので徒歩圏内判定不可
  if (sharedLocation.level >= 3) return false;
  
  // distanceRangeがある場合はそれを使用
  if (sharedLocation.distanceRange) {
    return sharedLocation.distanceRange === '近く';
  }
  
  // 座標がある場合は東京都内であれば徒歩圏内とみなす（簡易実装）
  if (sharedLocation.coordinates) {
    const tokyoBounds = {
      north: 35.8986,
      south: 35.4959,
      east: 139.9183,
      west: 139.5141
    };
    
    return (
      sharedLocation.coordinates.lat >= tokyoBounds.south &&
      sharedLocation.coordinates.lat <= tokyoBounds.north &&
      sharedLocation.coordinates.lng >= tokyoBounds.west &&
      sharedLocation.coordinates.lng <= tokyoBounds.east
    );
  }
  
  return false;
}

/**
 * 最終アクティブ時間から表示文字列を生成
 * @param lastActive - 最終アクティブ時間
 * @returns 表示用文字列
 */
function calculateLastSeen(lastActive?: Date): string | undefined {
  if (!lastActive) return undefined;
  
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 5) return '今オンライン';
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return '1週間以上前';
}

/**
 * moodをactivitiesに変換
 * @param mood - ユーザーのmood配列
 * @returns activities配列
 */
function mapMoodToActivities(mood: string[]): string[] {
  const moodToActivityMap: { [key: string]: string } = {
    'cafe': 'cafe',
    'drinking': 'drink', 
    'movie': 'movie',
    'eating': 'lunch',
    'shopping': 'shopping',
    'chat': 'cafe',
    'sports': 'walk',
    'art': 'cafe',
    'music': 'cafe',
    'outdoor': 'walk'
  };
  
  return mood.map(m => moodToActivityMap[m] || 'cafe').filter((activity, index, arr) => 
    arr.indexOf(activity) === index // 重複を除去
  );
} 