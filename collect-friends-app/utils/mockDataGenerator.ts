import { addDocument, setDocument, getDocument, updateDocument } from './firestoreService';
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

// 一都三県の主要エリアの座標
const metropolitanLocations = [
  // 東京都 - 山手線主要駅
  { lat: 35.6762, lng: 139.6503, area: '新宿', prefecture: '東京都' },
  { lat: 35.6581, lng: 139.7414, area: '渋谷', prefecture: '東京都' },
  { lat: 35.6812, lng: 139.7671, area: '池袋', prefecture: '東京都' },
  { lat: 35.7681, lng: 139.7753, area: '上野', prefecture: '東京都' },
  { lat: 35.6284, lng: 139.7347, area: '品川', prefecture: '東京都' },
  { lat: 35.6785, lng: 139.7748, area: '秋葉原', prefecture: '東京都' },
  { lat: 35.6809, lng: 139.7667, area: '東京', prefecture: '東京都' },
  { lat: 35.6627, lng: 139.7296, area: '恵比寿', prefecture: '東京都' },
  { lat: 35.6598, lng: 139.7006, area: '目黒', prefecture: '東京都' },
  { lat: 35.6433, lng: 139.7399, area: '五反田', prefecture: '東京都' },
  { lat: 35.6195, lng: 139.7288, area: '大崎', prefecture: '東京都' },
  { lat: 35.7193, lng: 139.7060, area: '日暮里', prefecture: '東京都' },
  { lat: 35.7208, lng: 139.7370, area: '田端', prefecture: '東京都' },
  { lat: 35.7308, lng: 139.7397, area: '駒込', prefecture: '東京都' },
  { lat: 35.7280, lng: 139.7287, area: '巣鴨', prefecture: '東京都' },
  { lat: 35.7295, lng: 139.7180, area: '大塚', prefecture: '東京都' },
  { lat: 35.6917, lng: 139.7016, area: '高田馬場', prefecture: '東京都' },
  { lat: 35.7002, lng: 139.7205, area: '新大久保', prefecture: '東京都' },
  { lat: 35.6896, lng: 139.7006, area: '代々木', prefecture: '東京都' },
  { lat: 35.6470, lng: 139.7105, area: '原宿', prefecture: '東京都' },
  { lat: 35.6654, lng: 139.7707, area: '有楽町', prefecture: '東京都' },
  { lat: 35.6815, lng: 139.7640, area: '神田', prefecture: '東京都' },
  
  // 神奈川県主要エリア
  { lat: 35.4658, lng: 139.6201, area: '横浜', prefecture: '神奈川県' },
  { lat: 35.4478, lng: 139.6425, area: 'みなとみらい', prefecture: '神奈川県' },
  { lat: 35.3338, lng: 139.4225, area: '藤沢', prefecture: '神奈川県' },
  { lat: 35.5495, lng: 139.6493, area: '武蔵小杉', prefecture: '神奈川県' },
  { lat: 35.5308, lng: 139.7027, area: '自由が丘', prefecture: '神奈川県' },
  { lat: 35.3924, lng: 139.4821, area: '鎌倉', prefecture: '神奈川県' },
  { lat: 35.5065, lng: 139.6174, area: '川崎', prefecture: '神奈川県' },
  
  // 埼玉県主要エリア
  { lat: 35.8617, lng: 139.6455, area: '大宮', prefecture: '埼玉県' },
  { lat: 35.9096, lng: 139.6574, area: '浦和', prefecture: '埼玉県' },
  { lat: 35.7901, lng: 139.7913, area: '越谷', prefecture: '埼玉県' },
  { lat: 35.8575, lng: 139.9101, area: '春日部', prefecture: '埼玉県' },
  { lat: 35.8256, lng: 139.5538, area: '所沢', prefecture: '埼玉県' },
  { lat: 35.7497, lng: 139.6538, area: '赤羽', prefecture: '埼玉県' },
  
  // 千葉県主要エリア
  { lat: 35.6074, lng: 140.1065, area: '千葉', prefecture: '千葉県' },
  { lat: 35.6958, lng: 139.9947, area: '市川', prefecture: '千葉県' },
  { lat: 35.7056, lng: 139.9681, area: '船橋', prefecture: '千葉県' },
  { lat: 35.6939, lng: 140.0106, area: '本八幡', prefecture: '千葉県' },
  { lat: 35.6588, lng: 140.0406, area: '津田沼', prefecture: '千葉県' },
  { lat: 35.6297, lng: 140.1160, area: '稲毛', prefecture: '千葉県' },
  { lat: 35.6259, lng: 140.1233, area: '幕張', prefecture: '千葉県' }
];

// geohashを簡易生成（実際のgeohashライブラリの代替）
function generateSimpleGeohash(lat: number, lng: number): string {
  const latStr = Math.floor(lat * 1000000).toString(36);
  const lngStr = Math.floor(lng * 1000000).toString(36);
  return (latStr + lngStr).substring(0, 6);
}

// Firebase Auth UIDのような28文字の文字列を生成
function generateFirebaseAuthUID(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let uid = '';
  for (let i = 0; i < 28; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
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
      const location = metropolitanLocations[Math.floor(Math.random() * metropolitanLocations.length)];
      
      // Firebase Auth UIDのような文字列を生成
      const generatedUID = generateFirebaseAuthUID();
      
      // ユーザーデータを生成
      const mockUser = {
        uid: generatedUID,
        email: userData.email,
        displayName: userData.displayName,
        profileImage: '',
        bio: userData.bio,
        accountType: 'dummy',
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
      
      // ユーザーを追加（生成したUIDを使用）
      await setDocument(`users/${generatedUID}`, mockUser, false);
      generatedUids.push(generatedUID);
      
      // そのユーザーの位置情報も追加
      const currentCoordinates = {
        lat: location.lat + (Math.random() - 0.5) * 0.01, // 少しランダム化
        lng: location.lng + (Math.random() - 0.5) * 0.01
      };
      
              // 位置履歴を生成（直近10件）
      const locationHistory = [];
      for (let i = 0; i < 10; i++) {
        const historyTime = new Date(Date.now() - (i + 1) * 60 * 60 * 1000); // 1時間ずつ遡る
        const historyCoords = {
          lat: location.lat + (Math.random() - 0.5) * 0.02,
          lng: location.lng + (Math.random() - 0.5) * 0.02
        };
        locationHistory.push({
          coordinates: historyCoords,
          timestamp: historyTime,
          address: `${location.prefecture} ${location.area}エリア`,
          geohash: generateSimpleGeohash(historyCoords.lat, historyCoords.lng)
        });
      }
      
      const locationData = {
        uid: generatedUID,
        coordinates: currentCoordinates,
        geohash: generateSimpleGeohash(currentCoordinates.lat, currentCoordinates.lng),
        address: `${location.prefecture} ${location.area}エリア`,
        lastUpdate: new Date(),
        isSharing: true,
        sharingSettings: {
          [currentUserUid]: { 
            level: 2,
            maskedCoordinates: {
              lat: Math.floor(currentCoordinates.lat * 100) / 100,
              lng: Math.floor(currentCoordinates.lng * 100) / 100,
              accuracy: 'area'
            }
          }
        },
        locationHistory: locationHistory,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後に有効期限
      };
      
      await setDocument(`locations/${generatedUID}`, locationData, false);
      
      console.log(`仮ユーザー生成完了: ${userData.displayName} (${generatedUID})`);
      
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
      const location = metropolitanLocations[Math.floor(Math.random() * metropolitanLocations.length)];
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
          areaDescription: `${location.prefecture} ${location.area}エリア`,
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
 * mockユーザー同士のlocation sharingSettingsを更新
 * @param mockUserUids - 全てのmockユーザーのUIDリスト
 * @param currentUserUid - 現在のユーザーUID
 */
export const updateMockLocationSharingSettings = async (
  mockUserUids: string[],
  currentUserUid: string
): Promise<void> => {
  
  for (const uid of mockUserUids) {
    try {
      // 現在のlocationドキュメントを取得
      const locationDoc = await getDocument(`locations/${uid}`);
      if (!locationDoc || !locationDoc.coordinates) {
        console.warn(`位置情報が見つかりません: ${uid}`);
        continue;
      }
      
      const currentCoords = locationDoc.coordinates;
      const maskedCoords = {
        lat: Math.floor(currentCoords.lat * 100) / 100, // 精度を落とす
        lng: Math.floor(currentCoords.lng * 100) / 100,
        accuracy: 'area' as const
      };
      
      // 各mockユーザーのlocationドキュメントのsharingSettingsを更新
      const sharingSettings: { [key: string]: any } = {
        [currentUserUid]: { 
          level: 2,
          maskedCoordinates: maskedCoords
        }
      };
      
      // 他のmockユーザーとの共有設定も追加
      for (const otherUid of mockUserUids) {
        if (otherUid !== uid) {
          sharingSettings[otherUid] = {
            level: 2,
            maskedCoordinates: maskedCoords
          };
        }
      }
      
      // sharingSettingsフィールドを更新
      await updateDocument(`locations/${uid}`, { sharingSettings });
      
      console.log(`位置共有設定更新完了: ${uid}`);
      
    } catch (error) {
      console.error(`位置共有設定更新エラー: ${uid}`, error);
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
    
    // 4. mockユーザー同士のlocation sharing設定を更新
    await updateMockLocationSharingSettings(mockUserUids, currentUserUid);
    console.log('位置共有設定の更新が完了しました');
    
    console.log('仮データ生成が完了しました！');
    
  } catch (error) {
    console.error('仮データ生成エラー:', error);
    throw error;
  }
}; 