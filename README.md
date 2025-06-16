# Correct Friends App

「今ヒマな人、どこ？」をサクッと解決するAIエージェント搭載のスケジュール調整＆自動予約アプリ

## アプリ概要

友人同士の空き時間をリアルタイムで把握し、AIが最適な遊びプランを提案して自動予約まで完結するスマートフォンアプリです。

### 主な特徴
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

### スタイリング
- **twrnc**: ^4.9.0 (TailwindCSS for React Native)
- **Expo Vector Icons**: ^14.1.0

### バックエンド・データベース
- **Firebase**: ^11.9.1
  - Firestore (NoSQLデータベース)
  - Authentication (認証)
  - Cloud Messaging (プッシュ通知)

### ナビゲーション・UI
- **React Navigation**: ^7.1.6
- **React Native Gesture Handler**: ~2.24.0
- **React Native Reanimated**: ~3.17.4
- **React Native Safe Area Context**: 5.4.0

### 開発ツール
- **ESLint**: ^9.25.0
- **Babel**: ^7.25.2

## セットアップ・起動方法

### 前提条件
- Node.js (最新LTS版推奨)
- npm または yarn
- Expo CLI
- iOS Simulator (Mac) / Android Emulator

### インストール

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **Firebase設定**
   - `firebaseConfig.js`ファイルを確認・設定
   - Firebase Console で新しいプロジェクトを作成
   - 必要なAPIキーを設定

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

### 開発時の確認方法

起動後、以下の方法でアプリを確認できます：

- **Expo Go**: スマートフォンでExpo Goアプリをダウンロードし、QRコードをスキャン
- **iOS Simulator**: Xcodeに含まれるiOSシミュレーター
- **Android Emulator**: Android Studioのエミュレーター
- **Web**: ブラウザでの確認（機能制限あり）

## プロジェクト構造

```
collect-friends-app/
├── app/                 # メイン画面ファイル（Expo Router）
├── components/          # 再利用可能コンポーネント
├── constants/           # 定数・設定ファイル
├── hooks/              # カスタムフック
├── assets/             # 画像・フォントなどのアセット
├── firebaseConfig.js   # Firebase設定
└── package.json        # 依存関係・スクリプト
```

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
