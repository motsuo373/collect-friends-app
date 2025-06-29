import { addDocument, setDocument } from './firestoreService';
import { doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// 仮ユーザーデータの基盤
const mockUsers = [
  {
    displayName: '田中太郎',
    email: 'tanaka@example.com',
    bio: 'カフェ巡りが好きです。新しい場所を開拓中！',
    currentStatus: 'free',
    mood: ['cafe', 'chat'],
    customMessage: 'カフェでまったりしませんか？',
  },
  {
    displayName: '佐藤花子',
    email: 'sato@example.com', 
    bio: 'お酒と映画が大好き。週末は映画館かバーにいます。',
    currentStatus: 'free',
    mood: ['drinking', 'movie'],
    customMessage: '今夜飲みに行きませんか？',
  },
  {
    displayName: '鈴木一郎',
    email: 'suzuki@example.com',
    bio: 'スポーツ観戦とグルメが趣味。一緒に楽しみましょう！',
    currentStatus: 'free', 
    mood: ['eating', 'sports'],
    customMessage: '美味しいお店知ってます',
  },
  {
    displayName: '高橋美咲',
    email: 'takahashi@example.com',
    bio: 'アートと音楽が好き。ギャラリーやライブによく行きます。',
    currentStatus: 'free',
    mood: ['art', 'music'],
    customMessage: 'アート鑑賞しませんか？',
  },
  {
    displayName: '渡辺健太',
    email: 'watanabe@example.com',
    bio: 'アウトドア派。ハイキングやキャンプが大好きです。',
    currentStatus: 'free',
    mood: ['outdoor', 'sports'],
    customMessage: '自然の中でリフレッシュしましょう',
  }
];

// 東京都内の主要エリアの座標
const tokyoLocations = [
  { lat: 35.6762, lng: 139.6503, area: '新宿' }, // 新宿
  { lat: 35.6581, lng: 139.7414, area: '渋谷' }, // 渋谷  
  { lat: 35.6812, lng: 139.7671, area: '池袋' }, // 池袋
  { lat: 35.7681, lng: 139.7753, area: '上野' }, // 上野
  { lat: 35.6284, lng: 139.7347, area: '品川' }, // 品川
];

// geohashを簡易生成（実際のgeohashライブラリの代替）
function generateSimpleGeohash(lat: number, lng: number): string {
  const latStr = Math.floor(lat * 1000000).toString(36);
  const lngStr = Math.floor(lng * 1000000).toString(36);
  return (latStr + lngStr).substring(0, 6);
}

/**
 * 仮ユーザーデータを生成
 * @param currentUserUid - 現在のユーザーUID（友人関係を作るため）
 * @returns Promise<string[]> - 生成されたユーザーのUIDリスト
 */
export const generateMockUsers = async (currentUserUid: string): Promise<string[]> => {
  const generatedUids: string[] = [];
  
  for (const userData of mockUsers) {
    try {
      // ランダムな位置を選択
      const location = tokyoLocations[Math.floor(Math.random() * tokyoLocations.length)];
      
      // ユーザーデータを生成
      const mockUser = {
        uid: '', // addDocumentで自動生成される
        email: userData.email,
        displayName: userData.displayName,
        profileImage: '',
        bio: userData.bio,
        accountType: 'user',
        isActive: true,
        inviteCode: Math.random().toString(36).substring(2, 8),
        privacySettings: {
          defaultLocationShareLevel: 2
        },
        preferences: {
          interests: userData.mood,
          budget: { min: 1000, max: 5000 },
          timePreference: ['evening', 'weekend']
        },
        stats: {
          participationCount: Math.floor(Math.random() * 10),
          rating: 4.0 + Math.random()
        },
        currentStatus: userData.currentStatus,
        mood: userData.mood,
        availableUntil: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6時間後
        customMessage: userData.customMessage,
        isOnline: true,
        lastActive: new Date()
      };
      
      // ユーザーを追加（UIDは自動生成）
      const uid = await addDocument('users', mockUser);
      generatedUids.push(uid);
      
      // そのユーザーの位置情報も追加
      const locationData = {
        uid: uid,
        coordinates: {
          lat: location.lat + (Math.random() - 0.5) * 0.01, // 少しランダム化
          lng: location.lng + (Math.random() - 0.5) * 0.01
        },
        geohash: generateSimpleGeohash(location.lat, location.lng),
        address: `東京都 ${location.area}エリア`,
        lastUpdate: new Date(),
        isSharing: true,
        sharingSettings: {
          [currentUserUid]: { level: 2 }
        },
        locationHistory: []
      };
      
      await setDocument(`locations/${uid}`, locationData, false);
      
      console.log(`仮ユーザー生成完了: ${userData.displayName} (${uid})`);
      
    } catch (error) {
      console.error(`仮ユーザー生成エラー: ${userData.displayName}`, error);
    }
  }
  
  return generatedUids;
};

/**
 * 現在のユーザーと仮ユーザーの間に友人関係を作成
 * @param currentUserUid - 現在のユーザーUID
 * @param mockUserUids - 仮ユーザーのUIDリスト  
 */
export const generateMockRelationships = async (
  currentUserUid: string, 
  mockUserUids: string[]
): Promise<void> => {
  
  for (const mockUserUid of mockUserUids) {
    try {
      const relationshipData = {
        relationshipId: '', // 自動生成される
        userARef: doc(db, 'users', currentUserUid),
        userBRef: doc(db, 'users', mockUserUid),
        status: 'accepted',
        locationSharingA: { level: 2, enabled: true },
        locationSharingB: { level: 2, enabled: true },
        requestedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // 過去1週間のランダム
        acceptedAt: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000), // 過去6日間のランダム
        interactionHistory: {
          meetupCount: Math.floor(Math.random() * 5),
          lastMeetup: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // 過去30日間のランダム
        }
      };
      
      await addDocument('relationships', relationshipData);
      console.log(`友人関係作成完了: ${currentUserUid} - ${mockUserUid}`);
      
    } catch (error) {
      console.error(`友人関係作成エラー: ${currentUserUid} - ${mockUserUid}`, error);
    }
  }
};

/**
 * 現在のユーザーのfriendsListサブコレクションに仮友達を追加
 * @param currentUserUid - 現在のユーザーUID
 * @param mockUserUids - 仮ユーザーのUIDリスト
 */
export const generateMockFriendsList = async (
  currentUserUid: string,
  mockUserUids: string[]
): Promise<void> => {
  
  for (let i = 0; i < mockUserUids.length; i++) {
    const mockUserUid = mockUserUids[i];
    const userData = mockUsers[i];
    
    try {
      // 位置情報データ（簡易版）
      const location = tokyoLocations[Math.floor(Math.random() * tokyoLocations.length)];
      const coordinates = {
        lat: location.lat + (Math.random() - 0.5) * 0.01,
        lng: location.lng + (Math.random() - 0.5) * 0.01
      };
      
      // friendsListエントリを作成
      const friendsListData = {
        friendUid: mockUserUid,
        displayName: userData.displayName,
        profileImage: '',
        relationshipRef: doc(db, 'relationships', `${currentUserUid}_${mockUserUid}`), // 仮のrelationship参照
        sharingLevel: 2,
        currentStatus: userData.currentStatus,
        mood: userData.mood,
        availableUntil: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6時間後
        customMessage: userData.customMessage,
        isOnline: true,
        lastActive: new Date(),
        sharedLocation: {
          level: 2,
          coordinates: coordinates,
          maskedCoordinates: {
            lat: Math.floor(coordinates.lat * 100) / 100, // 精度を落とす
            lng: Math.floor(coordinates.lng * 100) / 100,
            accuracy: 'area'
          },
          statusOnly: false,
          areaDescription: `${location.area}エリア`,
          distanceRange: '近く'
        },
        locationLastUpdate: new Date(),
        isFavorite: Math.random() > 0.7, // 30%の確率でお気に入り
        interactionCount: Math.floor(Math.random() * 10),
        lastInteraction: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 過去30日間のランダム
        createdAt: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000), // 過去6日間のランダム
        updatedAt: new Date()
      };
      
      // friendsListサブコレクションに追加
      await setDocument(
        `users/${currentUserUid}/friendsList/${mockUserUid}`, 
        friendsListData, 
        false
      );
      
      console.log(`friendsList追加完了: ${userData.displayName} → ${currentUserUid}`);
      
    } catch (error) {
      console.error(`friendsList追加エラー: ${userData.displayName}`, error);
    }
  }
};

/**
 * 全ての仮データを生成するメイン関数
 * @param currentUserUid - 現在のユーザーUID
 */
export const generateAllMockData = async (currentUserUid: string): Promise<void> => {
  try {
    console.log('仮データ生成を開始します...');
    
    // 1. 仮ユーザーを生成
    const mockUserUids = await generateMockUsers(currentUserUid);
    console.log(`${mockUserUids.length}人の仮ユーザーを生成しました`);
    
    // 2. 友人関係を生成
    await generateMockRelationships(currentUserUid, mockUserUids);
    console.log('友人関係の生成が完了しました');
    
    // 3. friendsListサブコレクションを生成
    await generateMockFriendsList(currentUserUid, mockUserUids);
    console.log('friendsList サブコレクションの生成が完了しました');
    
    console.log('仮データ生成が完了しました！');
    
  } catch (error) {
    console.error('仮データ生成エラー:', error);
    throw error;
  }
}; 