# AI-Agent位置情報共有アプリ - データベース設計書

## 概要

- **Firestore**: メインデータベース（ユーザー情報、チャット、イベント、位置情報など）
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
| currentStatus | string | 現在のステータス ('free', 'busy', 'offline') |
| mood | array | やりたいこと (['drinking', 'cafe']など) |
| availableUntil | timestamp | 暇でいられる時間 |
| customMessage | string | カスタムステータスメッセージ |
| isOnline | boolean | オンライン状況 |
| lastActive | timestamp | 最終アクティブ時間 |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

#### friendsList (usersのサブコレクション)
```
ドキュメントID: {friendUid}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| friendUid | string | 友人のUID |
| displayName | string | 友人の表示名 |
| profileImage | string | 友人のプロフィール画像URL |
| relationshipRef | reference | relationships コレクションへの参照 |
| sharingLevel | number | この友人への位置情報共有レベル (1-4) |
| currentStatus | string | 友人の現在ステータス ('free', 'busy', 'offline') |
| mood | array | 友人のやりたいこと (['drinking', 'cafe']など) |
| availableUntil | timestamp | 友人が暇でいられる時間 |
| customMessage | string | 友人のカスタムステータスメッセージ |
| isOnline | boolean | 友人のオンライン状況 |
| lastActive | timestamp | 友人の最終アクティブ時間 |
| sharedLocation | object | 共有レベルに応じた位置情報 |
| locationLastUpdate | timestamp | 位置情報の最終更新時間 |
| isFavorite | boolean | お気に入り友人フラグ |
| interactionCount | number | 過去の交流回数 |
| lastInteraction | timestamp | 最後の交流日時 |
| createdAt | timestamp | 友人関係の開始日時 |
| updatedAt | timestamp | 情報の最終更新日時 |

#### userProposal（usersのサブコレクション）
```
ドキュメントID: {proposalId}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| proposalId | string | 提案ID（proposals コレクションと同じID） |
| proposalRef | reference | proposals コレクションへの参照 |
| status | string | このユーザーの応答状況 ('pending', 'accepted', 'declined', 'maybe') |
| respondedAt | timestamp | 応答日時（任意） |
| notificationSent | boolean | 通知送信済みかどうか |
| receivedAt | timestamp | 提案を受信した日時 |
| updatedAt | timestamp | 最終更新日時 |

**sharedLocation オブジェクトの構造**
```json
{
  "level": 1-4,  // 共有レベル
  "coordinates": {  // レベル1,2の場合のみ
    "lat": number,
    "lng": number
  },
  "maskedCoordinates": {  // レベル2の場合（大雑把な位置）
    "lat": number,  // 精度を落とした座標
    "lng": number,
    "accuracy": "area"  // エリア表示であることを示す
  },
  "statusOnly": boolean,  // レベル3の場合（位置非表示、ステータスのみ）
  "areaDescription": string,  // "家にいる", "外出中", "職場" など
  "distanceRange": string  // "近く", "少し離れた場所", "遠く" など（レベル2の場合）
}
```

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

### locations
```
ドキュメントID: {uid}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| uid | string | ユーザーUID |
| coordinates | object | 座標情報 {lat: number, lng: number} |
| geohash | string | Geohash（近隣検索用） |
| address | string | 住所（任意） |
| lastUpdate | timestamp | 最終更新時間 |
| isSharing | boolean | 位置共有が有効かどうか |
| sharingSettings | map | 各友人への共有設定 {[friendUid]: {level: number, maskedCoordinates?: object}} |
| locationHistory | array | 位置履歴（直近10件） |
| expiresAt | timestamp | 位置情報の有効期限（任意） |

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
| activeUsers | array | 現在アクティブなユーザーリスト |
| typingUsers | map | 入力中ユーザー {[uid]: timestamp} |
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
| editedAt | timestamp | 編集日時（任意） |
| isRead | map | 既読状況 {[uid]: timestamp} |

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
| coordinates | object | 座標情報 {lat: number, lng: number} |
| geohash | string | Geohash（近隣検索用） |
| businessHours | array | 営業時間 |
| contact | object | 連絡先情報 |
| currentStatus | object | 現在の営業状況 |
| capacity | number | 最大収容人数 |
| averageBudget | object | 平均予算 |
| features | array | 店舗特徴 (['wifi', 'parking'など) |
| images | array | 店舗画像URL |
| aiSettings | object | AI推薦設定 |
| ratings | object | 評価情報 |
| verified | boolean | 認証済み店舗かどうか |
| createdAt | timestamp | 作成日時 |

### proposals
```
ドキュメントID: {proposalId}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| proposalId | string | 提案ID |
| title | string | 提案タイトル（例：「渋谷で飲み会」） |
| description | string | 提案の詳細説明 |
| type | string | 提案種類 ('group_meetup', 'venue_recommendation', 'activity_suggestion') |
| proposalSource | string | 提案元 ('user', 'ai', 'friend_invite') |
| creatorRef | reference | 提案作成者への参照（ユーザー提案の場合） |
| creatorDisplayName | string | 提案作成者の表示名 |
| targetUsers | array | 対象ユーザーリスト（UID配列） |
| invitedUsers | array | 招待されたユーザーの詳細情報配列 |
| scheduledAt | timestamp | 予定日時 |
| endTime | timestamp | 終了予定時間（任意） |
| location | object | 場所情報 |
| category | string | カテゴリー ('drinking', 'cafe', 'restaurant', 'activity', 'other') |
| budget | object | 予算情報（最小・最大金額） |
| capacity | object | 参加人数（最小・最大人数） |
| requirements | array | 参加条件・要件 |
| tags | array | タグリスト（検索・フィルタリング用） |
| aiAnalysis | object | AI分析データ（信頼度、推薦理由、マッチングスコア） |
| responses | object | ユーザー応答状況 {[uid]: {status: string, respondedAt: timestamp}} |
| responseCount | object | 応答集計 {accepted: number, declined: number, pending: number} |
| status | string | 提案状態 ('active', 'confirmed', 'cancelled', 'expired', 'completed') |
| priority | string | 優先度 ('low', 'normal', 'high', 'urgent') |
| isPublic | boolean | 公開提案かどうか |
| allowInvites | boolean | 参加者が他の人を招待できるか |
| autoConfirm | boolean | 一定条件で自動確定するか |
| confirmationDeadline | timestamp | 確定期限 |
| expiresAt | timestamp | 提案の有効期限 |
| relatedEventRef | reference | 関連イベントへの参照（確定後） |
| relatedChatRef | reference | 関連チャットへの参照 |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 最終更新日時 |

**location オブジェクトの構造**
```json
{
  "name": "焼肉居酒屋Kanjie 渋谷店",
  "address": "東京都渋谷区...",
  "coordinates": {
    "lat": 35.6580,
    "lng": 139.7016
  },
  "placeId": "ChIJ...",  // Google Places ID
  "category": "restaurant",
  "phone": "03-1234-5678",
  "website": "https://...",
  "priceLevel": 2,  // 1-4の価格レベル
  "rating": 4.2,
  "photos": ["url1", "url2"]
}
```

**invitedUsers 配列の要素構造**
```json
{
  "uid": "user123",
  "displayName": "Aさん",
  "profileImage": "https://...",
  "role": "participant",  // "creator", "participant", "maybe"
  "invitedAt": "timestamp",
  "invitedBy": "uid_of_inviter"
}
```

**budget オブジェクトの構造**
```json
{
  "min": 3000,
  "max": 5000,
  "currency": "JPY",
  "perPerson": true,
  "includesFood": true,
  "includesDrinks": true,
  "notes": "飲み放題込み"
}
```

**capacity オブジェクトの構造**
```json
{
  "min": 3,
  "max": 8,
  "current": 5,
  "waitingList": 2
}
```

**aiAnalysis オブジェクトの構造**
```json
{
  "confidence": 0.85,
  "matchingScore": 0.92,
  "reasons": ["共通の興味", "近い場所", "予算が合致"],
  "recommendationBasis": ["過去の参加履歴", "友人の好み", "位置情報"],
  "successProbability": 0.78,
  "alternativeVenues": ["venue1", "venue2"],
  "suggestedTime": "2024-06-29T18:00:00Z",
  "factorsConsidered": {
    "userPreferences": true,  
    "locationData": true,
    "pastEvents": true,
    "friendsAvailability": true
  }
}
```


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

## 位置情報共有レベル

| レベル | 名称 | 説明 |
|--------|------|------|
| 1 | 詳細位置 | リアルタイム正確位置（恋人・家族向け） |
| 2 | 大雑把位置 | エリア位置のみ（友人向け） |
| 3 | 非表示 | 位置情報非表示、オンライン状況のみ |
| 4 | ブロック | 全情報非表示 |

---

## Geohash活用

位置情報の効率的な検索のため、`locations`および`stores`コレクションではGeohashを使用します：

- **精度レベル**: 6文字（約1.2km四方）を基本とし、用途に応じて調整
- **近隣検索**: Geohashの前方一致検索で効率的な位置ベースクエリを実現
- **プライバシー**: 共有レベルに応じてGeohashの精度を調整

---

## 提案システム設計

### 提案の種類

| 提案元 | 説明 | UI表示 |
|--------|------|--------|
| user | ユーザーが作成した提案 | 「あなたが提案」 |
| ai | AIが生成した提案 | 「AIが提案」 |
| friend_invite | 友人からの招待 | 「○○さんからの招待」 |

### 提案のライフサイクル

1. **作成** (`active`) - 提案が作成され、対象ユーザーに配信
2. **応答待ち** (`active`) - ユーザーの応答を待機中
3. **確定** (`confirmed`) - 十分な参加者が集まり、イベントとして確定
4. **完了** (`completed`) - イベントが実施完了
5. **期限切れ** (`expired`) - 確定期限を過ぎて自動終了
6. **キャンセル** (`cancelled`) - 手動でキャンセル

### ユーザー応答状況

| ステータス | 説明 |
|-----------|------|
| pending | 未回答（デフォルト） |
| accepted | 参加したい |
| declined | 参加しない |
| maybe | 検討中・未定 |

### 提案配信ロジック

1. **対象ユーザー選定**: 位置情報、興味、過去の履歴に基づく
2. **個別配信**: 各ユーザーの`userProposal`サブコレクションに配信
3. **通知送信**: プッシュ通知やアプリ内通知で告知
4. **応答収集**: ユーザーの応답を`proposals`と`userProposal`両方に記録
5. **自動確定**: 条件を満たした場合に`events`コレクションにイベント作成

### フィルタリング・検索

- **カテゴリー**: 飲み会、カフェ、アクティビティなど
- **時間帯**: 朝、昼、夜
- **予算範囲**: 価格帯による絞り込み
- **距離**: 現在位置からの距離
- **提案元**: ユーザー/AI/友人招待
- **参加人数**: 希望する参加人数範囲 