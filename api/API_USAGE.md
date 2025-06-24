# API使用方法 - 近くのユーザー機能

## 🌐 エンドポイント一覧

### 1. 近くのユーザー取得API

**エンドポイント:** `POST /getNearbyUsers`
**認証:** Bearer Token必須

#### リクエスト
```json
{
  "latitude": 35.6762,
  "longitude": 139.6503,
  "radius": 5000
}
```

#### レスポンス
```json
{
  "success": true,
  "users": [
    {
      "uid": "user123",
      "name": "田中太郎",
      "distance": 250,
      "status": {
        "isAvailable": true,
        "availabilityType": "now",
        "activities": ["カフェ", "映画"],
        "moveRange": 1000,
        "lastUpdated": 1640995200000
      },
      "location": {
        "latitude": 35.6765,
        "longitude": 139.6508,
        "accuracy": "exact"
      },
      "shareLevel": "detailed"
    }
  ],
  "searchCenter": {
    "latitude": 35.6762,
    "longitude": 139.6503
  },
  "searchRadius": 5000,
  "timestamp": 1640995200000
}
```

### 2. ユーザーステータス更新API

**エンドポイント:** `POST /updateUserStatus`
**認証:** Bearer Token必須

#### リクエスト
```json
{
  "isAvailable": true,
  "availabilityType": "now",
  "activities": ["カフェ", "映画"],
  "moveRange": 2000
}
```

#### レスポンス
```json
{
  "success": true,
  "status": {
    "isAvailable": true,
    "availabilityType": "now",
    "activities": ["カフェ", "映画"],
    "moveRange": 2000,
    "lastUpdated": 1640995200000
  },
  "timestamp": 1640995200000
}
```

### 3. 位置情報更新API

**エンドポイント:** `POST /updateUserLocation`
**認証:** Bearer Token必須

#### リクエスト
```json
{
  "latitude": 35.6762,
  "longitude": 139.6503
}
```

#### レスポンス
```json
{
  "success": true,
  "location": {
    "latitude": 35.6762,
    "longitude": 139.6503,
    "timestamp": 1640995200000
  }
}
```

## 🔧 フロントエンド実装例

### React Native / Expo での使用

```typescript
import { useAuth } from '@/contexts/AuthContext';

interface NearbyUser {
  uid: string;
  name: string;
  distance: number;
  status: {
    isAvailable: boolean;
    activities: string[];
    moveRange: number;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy: 'exact' | 'approximate' | 'area';
  };
  shareLevel: 'detailed' | 'approximate' | 'hidden';
}

const useNearbyUsers = () => {
  const { user } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNearbyUsers = async (latitude: number, longitude: number, radius = 5000) => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      
      const response = await fetch('https://asia-northeast1-collect-friends-app.cloudfunctions.net/getNearbyUsers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setNearbyUsers(data.users);
      }
    } catch (error) {
      console.error('近くのユーザー取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (status: {
    isAvailable: boolean;
    availabilityType: string;
    activities: string[];
    moveRange: number;
  }) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      
      const response = await fetch('https://asia-northeast1-collect-friends-app.cloudfunctions.net/updateUserStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(status)
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      return false;
    }
  };

  const updateUserLocation = async (latitude: number, longitude: number) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      
      const response = await fetch('https://asia-northeast1-collect-friends-app.cloudfunctions.net/updateUserLocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude,
          longitude
        })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('位置情報更新エラー:', error);
      return false;
    }
  };

  return {
    nearbyUsers,
    loading,
    fetchNearbyUsers,
    updateUserStatus,
    updateUserLocation
  };
};

export default useNearbyUsers;
```

### WebMapコンポーネントでの使用

```typescript
// マップ画面での実装例
const MapScreen = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [userStatus, setUserStatus] = useState({
    isAvailable: false,
    activities: [],
    moveRange: 1000
  });
  
  const { nearbyUsers, fetchNearbyUsers, updateUserStatus, updateUserLocation } = useNearbyUsers();

  // 位置情報取得時に近くのユーザーを検索
  useEffect(() => {
    if (userLocation) {
      fetchNearbyUsers(userLocation.latitude, userLocation.longitude);
      updateUserLocation(userLocation.latitude, userLocation.longitude);
    }
  }, [userLocation]);

  // ステータス変更時にAPIを呼び出し
  const handleStatusChange = async (newStatus: any) => {
    const success = await updateUserStatus(newStatus);
    if (success) {
      setUserStatus(newStatus);
      // 近くのユーザーを再取得
      if (userLocation) {
        fetchNearbyUsers(userLocation.latitude, userLocation.longitude);
      }
    }
  };

  const handleUserPress = (user: NearbyUser) => {
    Alert.alert(
      `${user.name}さん`,
      `距離: ${user.distance}m\nステータス: ${user.status.activities.join('、')}`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '話しかける', onPress: () => {
          // チャット画面に遷移
          console.log('チャット開始:', user.uid);
        }}
      ]
    );
  };

  return (
    <WebMap
      userLocation={userLocation}
      userStatus={userStatus}
      nearbyUsers={nearbyUsers}
      onStatusPress={() => setStatusModalVisible(true)}
      onUserPress={handleUserPress}
    />
  );
};
```

## 🔒 認証について

すべてのAPIエンドポイントはFirebase Authenticationによる認証が必要です。

### トークン取得方法
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();
const token = await user.getIdToken();
```

### ヘッダー設定
```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

## 📊 位置情報共有レベル

### shareLevel の種類
- **detailed**: 詳細位置（誤差10m以内）
- **approximate**: 大雑把位置（500m-1km範囲）
- **hidden**: 非表示

### location.accuracy の種類
- **exact**: 正確な位置情報
- **approximate**: 大雑把な位置情報
- **area**: エリア情報のみ

## ⚡ リアルタイム更新

位置情報とステータスはRealtime Databaseに保存され、リアルタイムで更新されます。

### 推奨更新頻度
- **位置情報**: 30秒〜1分間隔
- **ステータス**: ユーザーが変更した時のみ
- **近くのユーザー検索**: 1〜2分間隔

## 🚨 エラーハンドリング

### 一般的なエラー
- **401**: 認証エラー（トークン無効）
- **400**: リクエストパラメータエラー
- **500**: サーバーエラー

### エラーレスポンス例
```json
{
  "error": "位置情報（latitude, longitude）が必要です",
  "details": "詳細なエラー情報（開発環境のみ）"
}
``` 