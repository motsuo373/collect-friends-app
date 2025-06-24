# Collect Friends API

AI-Agent位置情報共有アプリのバックエンドAPI（Firebase Functions）

## 🏗️ 構成

```
api/
├── functions/                 # Firebase Functions
│   ├── src/
│   │   ├── index.ts          # エントリーポイント
│   │   ├── ai/               # AI関連API
│   │   ├── users/            # ユーザー関連API
│   │   ├── events/           # イベント関連API
│   │   ├── stores/           # 店舗関連API
│   │   └── utils/            # 共通ユーティリティ
│   ├── package.json
│   └── tsconfig.json
├── firebase.json             # Firebase設定
├── .firebaserc               # Firebaseプロジェクト設定
└── README.md                 # このファイル
```

## 🚀 セットアップ

### 1. 依存関係のインストール
```bash
cd functions
npm install
```

### 2. Firebase設定
```bash
# Firebaseプロジェクトの設定（.firebasercを編集）
# your-project-id を実際のプロジェクトIDに変更してください
```

### 3. ビルド
```bash
npm run build
```

## 🛠️ 開発

### ローカル開発
```bash
# ローカルエミュレーター起動
cd functions
npm run serve

# 別ターミナルでホットリロード
npm run build:watch
```

### テスト
```bash
npm test
```

### リント
```bash
npm run lint
npm run lint:fix
```

## 📦 デプロイ

### 全体デプロイ
```bash
cd functions
npm run deploy
```

### 特定の関数のみデプロイ
```bash
firebase deploy --only functions:helloWorld
```

## 🔧 利用可能なコマンド

| コマンド | 説明 |
|---------|------|
| `npm run build` | TypeScriptコンパイル |
| `npm run build:watch` | ホットリロードでコンパイル |
| `npm run serve` | ローカルエミュレーター起動 |
| `npm run deploy` | 本番環境にデプロイ |
| `npm run logs` | 関数のログを表示 |
| `npm test` | テスト実行 |
| `npm run lint` | ESLint実行 |

## 🌐 エンドポイント

### テスト用
- `GET /helloWorld` - API動作確認

### AI関連（予定）
- `POST /generateAIProposal` - AI提案生成
- `POST /processAIMatching` - AIマッチング処理

### ユーザー関連（予定）
- `POST /updateLocationSharing` - 位置情報共有設定
- `GET /getNearbyUsers` - 近くのユーザー取得

### イベント関連（予定）
- `POST /createEvent` - イベント作成
- `PUT /updateEvent` - イベント更新

### 店舗関連（予定）
- `POST /updateStoreStatus` - 店舗状況更新
- `GET /getReservationLinks` - 予約リンク取得

## 🔒 認証

Firebase Authenticationを使用してユーザー認証を行います。
各APIエンドポイントは認証済みユーザーのみアクセス可能です。

## 📊 監視・ログ

```bash
# リアルタイムログの確認
firebase functions:log

# 特定の関数のログ
firebase functions:log --only helloWorld
```

## 🚨 トラブルシューティング

### よくある問題

1. **Firebase CLIがインストールされていない**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **プロジェクトIDが設定されていない**
   ```bash
   # .firebasercファイルでプロジェクトIDを設定
   firebase use --add
   ```

3. **Node.jsバージョンの不一致**
   ```bash
   # Node.js 20を使用することを推奨
   node --version
   ```

## 📝 TODO

- [ ] AI提案機能の実装
- [ ] ユーザー位置情報管理機能
- [ ] イベント作成・管理機能
- [ ] 店舗連携機能
- [ ] テストの追加
- [ ] CI/CDパイプラインの設定 