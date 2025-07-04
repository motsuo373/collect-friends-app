# Correct Friends App

「今ヒマな人、どこ？」をサクッと解決するAIエージェント搭載のスケジュール調整＆自動予約アプリ

## アプリ概要

友人同士の空き時間をリアルタイムで把握し、AIが最適な遊びプランを提案して自動予約まで完結するスマートフォンアプリです。

### 主な特徴
- 🔐 **認証機能**: Google・X(Twitter)・LINE認証対応
- 🤖 **AIエージェント**: 自動返信・プラン提案・予約まで一貫サポート
- 📱 **リアルタイム**: 友人の暇ステータスをリアルタイム共有
- 🎯 **スマートマッチング**: 趣味・距離・時間を考慮した最適なマッチング
- 🏷️ **コミュニティタグ**: 大学・会社・サークル単位でのグループ機能
- 💬 **チャット形式**: 直感的なやりとりで簡単プラン調整

## 技術スタック

### フロントエンド
- **React Native**: 19.0.0
- **Expo**: ~53.0.11
- **Expo Router**: ~5.0.7 (ファイルベースルーティング)
- **TypeScript**: ~5.8.3

### 認証・セキュリティ
- **Firebase Authentication**: ユーザー認証
- **Expo Auth Session**: OAuth認証フロー
- **Expo Web Browser**: ソーシャルログイン
- **UUID**: ユニークID生成

### スタイリング
- **twrnc**: ^4.9.0 (TailwindCSS for React Native)
- **Expo Vector Icons**: ^14.1.0
- **Expo Linear Gradient**: グラデーション背景

### バックエンド・データベース
- **Firebase**: ^11.9.1
  - Firestore (NoSQLデータベース)
  - Authentication (認証)
  - Cloud Messaging (プッシュ通知)
  - **Firebase Hosting** (Webアプリケーションホスティング)

### マップ・位置情報
- **React Native Maps**: 1.20.1 (ネイティブアプリ用)
- **React Leaflet**: ^4.2.1 (Web用マップ)
- **Leaflet**: ^1.9.4 (Web用地図ライブラリ)
- **Expo Location**: 位置情報取得

### ナビゲーション・UI
- **React Navigation**: ^7.1.6
- **React Native Gesture Handler**: ~2.24.0
- **React Native Reanimated**: ~3.17.4
- **React Native Safe Area Context**: 5.4.0

### 開発ツール
- **ESLint**: ^9.25.0
- **Babel**: ^7.25.2
- **Firebase CLI**: Firebase Hostingデプロイメント

## 認証機能

### 対応認証方法
- **メールアドレス**: メールでの登録
- **Google認証**: Gmail アカウントでのログイン (今後実装予定)
- **X(Twitter)認証**: X (旧Twitter) アカウントでのログイン (今後実装予定)
- **LINE認証**: LINE アカウントでのログイン (今後実装予定)

### 環境変数設定
認証機能を使用するために以下の環境変数を設定してください：

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
EXPO_PUBLIC_TWITTER_CLIENT_ID=your_twitter_client_id_here
EXPO_PUBLIC_LINE_CLIENT_ID=your_line_client_id_here
```

## セットアップ・起動方法

### 前提条件
- Node.js (最新LTS版推奨)
- npm または yarn
- Expo CLI
- iOS Simulator (Mac) / Android Emulator
- Firebase プロジェクト
- Google・X(Twitter) OAuth アプリ設定

### インストール

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **Firebase設定**
   - Firebase Console で新しいプロジェクトを作成
   - Authentication を有効化
   - Firestore Database を作成
   - 必要な環境変数を設定

3. **OAuth設定**
   - Google Cloud Console でOAuth2.0 Client ID を作成
   - X Developer Portal でアプリを作成
   - 各プロバイダーのClient IDを環境変数に設定

### 起動方法

#### 基本的な起動
```bash
npm start
# または
npx expo start
```

#### プラットフォーム別起動
```bash
# iOS Simulator
npm run ios
# または
npx expo start --ios

# Android Emulator  
npm run android
# または
npx expo start --android

# Web (開発用)
npm run web
# または
npx expo start --web
```

#### その他のコマンド
```bash
# リンター実行
npm run lint

# プロジェクトリセット（初期化）
npm run reset-project
```
## 使用方法

### 初回起動時
1. アプリを起動すると自動的にログイン画面が表示されます
2. Google、X(Twitter)、または LINE のいずれかでログインします
3. 初回ログイン時に自動的にユーザープロフィールが作成されます
4. ログイン完了後、メインアプリ画面に遷移します

### プロフィール管理
- **プロフィール画面**: 右下のExploreタブからアクセス
- **ユーザー情報**: 名前、メールアドレス、UID、カスタムUUID を表示
- **ログアウト**: プロフィール画面上部またはログアウトボタンから実行

## 関連ドキュメント

- [機能仕様書](../knowledge-data/features.md) - 詳細な機能仕様
- [Expo Documentation](https://docs.expo.dev/) - Expo開発ガイド
- [React Native Documentation](https://reactnative.dev/) - React Native公式ドキュメント
- [Firebase Documentation](https://firebase.google.com/docs) - Firebase使用方法

## 開発時の注意事項

- ファイルベースルーティング（Expo Router）を使用
- TailwindCSS クラスは `twrnc` パッケージ経由で使用
- Firebase設定ファイルは機密情報を含むため、環境変数での管理推奨
- リアルタイム機能のためFirestore リスナーの適切な管理が重要
- 認証状態の変更は AuthContext で管理
- 未ログイン時は自動的にログイン画面に遷移

## トラブルシューティング

### よくある問題

1. **認証エラー**: 
   - 環境変数が正しく設定されているか確認
   - Firebase Console で Authentication が有効化されているか確認

2. **OAuth認証の失敗**:
   - Google/X の Client ID が正しく設定されているか確認
   - リダイレクトURIが正しく設定されているか確認

3. **Firestore エラー**:
   - Firestore セキュリティルールが適切に設定されているか確認
   - ネットワーク接続を確認

## Firebase Hosting デプロイメント

### 1. 前提条件
- Firebase CLI のインストール
- Firebase プロジェクトでHostingが有効化されていること
- Webビルドの動作確認が完了していること

### 2. Firebase CLI のインストール
```bash
npm install -g firebase-tools
firebase --version  # インストール確認
```

### 3. Firebase プロジェクトの初期化
```bash
# Firebaseにログイン
firebase login

# Hostingの初期化（collect-friends-appディレクトリ内で実行）
firebase init hosting

# プロジェクト選択時は既存のFirebaseプロジェクトを選択
# Public directory: web-build
# Single-page app: Yes
# Overwrite index.html: No
```

### 4. Web用ビルドの生成
```bash
# Web用の最適化ビルドを生成
npx expo export:web

# または
npm run build:web  # カスタムスクリプトがある場合
```

### 5. Firebase Hostingへのデプロイ
```bash
# プレビューデプロイ（テスト用）
firebase hosting:channel:deploy preview

# 本番デプロイ
firebase deploy --only hosting
```

### 6. デプロイ後の確認
- デプロイ完了後に表示されるURLでアクセス確認
- HTTPSが有効化されていることを確認
- カスタムドメインの設定（必要に応じて）

### 設定ファイル (firebase.json)
```json
{
  "hosting": {
    "public": "web-build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

#### その他のコマンド
```bash
# リンター実行
npm run lint

# プロジェクトリセット（初期化）
npm run reset-project
```
