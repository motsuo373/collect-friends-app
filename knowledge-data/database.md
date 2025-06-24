# AI-Agent位置情報共有アプリ - データベース設計書

## 概要

- **Firestore**: メインデータベース（ユーザー情報、チャット、イベントなど）
- **Realtime Database**: リアルタイムデータ（位置情報、ステータスなど）
- **Cloud Storage**: 画像・メディアファイル

---

## Firestore コレクション

### users
```
ドキュメントID: {uid}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| uid | string | Firebase Auth UID |
| email | string | メールアドレス |
| displayName | string | 表示名 |
| profileImage | string | プロフィール画像URL |
| bio | string | 自己紹介 |
| accountType | string | 'user' または 'store' |
| isActive | boolean | アカウント有効性 |
| inviteCode | string | QRコード用招待コード |
| privacySettings | object | プライバシー設定（デフォルト位置共有レベルなど） |
| preferences | object | AI学習用データ（興味、予算、時間帯など） |
| stats | object | 統計データ（参加回数、評価など） |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

### relationships
```
ドキュメントID: {relationshipId}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| relationshipId | string | 関係ID |
| userARef | reference | ユーザーA参照 |
| userBRef | reference | ユーザーB参照 |
| status | string | 関係状態 ('pending', 'accepted', 'blocked') |
| locationSharingA | object | AからBへの位置共有設定 |
| locationSharingB | object | BからAへの位置共有設定 |
| requestedAt | timestamp | 申請日時 |
| acceptedAt | timestamp | 承認日時 |
| interactionHistory | object | 交流履歴（過去の集まり回数など） |

### chats
```
ドキュメントID: {chatId}
サブコレクション: messages
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| chatId | string | チャットID |
| type | string | チャット種類 ('group', 'ai_proposal') |
| participants | array | 参加者リスト |
| eventRef | reference | 関連イベント参照（任意） |
| aiAssistEnabled | boolean | AI支援機能有効化 |
| lastMessage | object | 最後のメッセージ情報 |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

#### messages (サブコレクション)
```
ドキュメントID: {messageId}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| messageId | string | メッセージID |
| senderRef | reference | 送信者参照 |
| content | string | メッセージ内容 |
| type | string | メッセージ種類 ('text', 'image', 'poll', 'ai_message') |
| mediaUrl | string | 画像・動画URL（任意） |
| aiGenerated | boolean | AI生成メッセージかどうか |
| reactions | array | リアクション情報 |
| timestamp | timestamp | 送信日時 |

### events
```
ドキュメントID: {eventId}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| eventId | string | イベントID |
| title | string | イベントタイトル |
| description | string | 説明 |
| category | string | カテゴリー ('drinking', 'cafe', 'movie'など) |
| organizerRef | reference | 主催者参照 |
| participants | array | 参加者リスト |
| scheduledAt | timestamp | 開催日時 |
| location | object | 開催場所情報 |
| status | string | イベント状態 ('proposed', 'confirmed', 'completed') |
| budget | object | 予算情報（最小・最大金額） |
| reservationInfo | object | 予約情報（プラットフォーム、URL） |
| aiGenerated | boolean | AI生成イベントかどうか |
| chatRef | reference | 関連チャット参照 |
| createdAt | timestamp | 作成日時 |

### stores
```
ドキュメントID: {storeId}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| storeId | string | 店舗ID |
| ownerRef | reference | オーナー参照（任意） |
| name | string | 店舗名 |
| description | string | 店舗説明 |
| category | string | カテゴリー ('restaurant', 'cafe', 'bar') |
| address | object | 住所・位置情報 |
| businessHours | array | 営業時間 |
| contact | object | 連絡先情報 |
| currentStatus | object | リアルタイム営業状況 |
| capacity | number | 最大収容人数 |
| averageBudget | object | 平均予算 |
| features | array | 店舗特徴 (['wifi', 'parking'など) |
| images | array | 店舗画像URL |
| aiSettings | object | AI推薦設定 |
| ratings | object | 評価情報 |
| verified | boolean | 認証済み店舗かどうか |
| createdAt | timestamp | 作成日時 |

### ai_proposals
```
ドキュメントID: {proposalId}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| proposalId | string | 提案ID |
| type | string | 提案種類 ('group_meetup', 'venue_recommendation') |
| targetUsers | array | 対象ユーザーリスト |
| proposal | object | 提案内容（タイトル、説明、場所、時間） |
| aiAnalysis | object | AI分析データ（信頼度、推薦理由） |
| responses | array | ユーザー応答リスト |
| status | string | 提案状態 ('active', 'processed', 'expired') |
| expiresAt | timestamp | 有効期限 |
| createdAt | timestamp | 作成日時 |

### notifications
```
ドキュメントID: {notificationId}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| notificationId | string | 通知ID |
| recipientRef | reference | 受信者参照 |
| type | string | 通知種類 ('ai_proposal', 'event_invitation', 'friend_request') |
| title | string | 通知タイトル |
| body | string | 通知内容 |
| relatedRefs | object | 関連データ参照 |
| status | string | 通知状態 ('pending', 'sent', 'read') |
| priority | string | 優先度 ('low', 'normal', 'high') |
| createdAt | timestamp | 作成日時 |

---

## Realtime Database 構造

### user_status (リアルタイムユーザーステータス)
```json
{
  "user_status": {
    "{uid}": {
      "status": "free",           // ステータス: free, busy, offline
      "mood": ["drinking", "cafe"], // やりたいこと
      "availableUntil": 1703980800000, // 暇でいられる時間（タイムスタンプ）
      "lastUpdate": 1703977200000,     // 最終更新時間
      "customMessage": "今夜飲みに行きたい！" // カスタムメッセージ
    }
  }
}
```

### location_data (位置情報)
```json
{
  "location_data": {
    "{uid}": {
      "coordinates": {
        "lat": 35.6762,           // 緯度
        "lng": 139.6503           // 経度
      },
      "accuracy": 10,             // 精度（メートル）
      "lastUpdate": 1703977200000, // 最終更新時間
      "sharing": {                // 共有設定
        "{friendUid}": {
          "level": 2,             // 共有レベル (1:詳細, 2:大雑把, 3:非表示, 4:ブロック)
          "maskedCoordinates": {  // マスキングされた座標
            "lat": 35.676,
            "lng": 139.650
          }
        }
      }
    }
  }
}
```

### active_sessions (アクティブセッション)
```json
{
  "active_sessions": {
    "chats": {
      "{chatId}": {
        "activeUsers": ["{uid1}", "{uid2}"], // アクティブユーザー
        "typingUsers": {                     // 入力中ユーザー
          "{uid1}": 1703977200000
        },
        "lastActivity": 1703977200000        // 最終活動時間
      }
    },
    "ai_processing": {
      "{proposalId}": {
        "status": "processing",              // 処理状態: processing, completed, failed
        "progress": 75,                      // 進捗率
        "startedAt": 1703977200000           // 開始時間
      }
    }
  }
}
```

---

## 位置情報共有レベル

| レベル | 名称 | 説明 |
|--------|------|------|
| 1 | 詳細位置 | リアルタイム正確位置（恋人・家族向け） |
| 2 | 大雑把位置 | エリア位置のみ（友人向け） |
| 3 | 非表示 | 位置情報非表示、オンライン状況のみ |
| 4 | ブロック | 全情報非表示 | 