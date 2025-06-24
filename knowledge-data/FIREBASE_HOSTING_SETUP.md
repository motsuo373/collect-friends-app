# Firebase Hosting セットアップガイド

## 概要

このガイドでは、Collect Friends アプリをFirebase HostingにデプロイしてWebアプリケーションとして公開する手順を説明します。

## 前提条件

1. Node.js がインストールされていること
2. Firebase プロジェクトが作成されていること
3. プロジェクト内で Firebase Authentication と Firestore が設定済みであること

## セットアップ手順

### 1. Firebase CLI のインストール

```bash
# Firebase CLI をグローバルにインストール
npm install -g firebase-tools

# インストールの確認
firebase --version
```

### 2. Firebase ログイン

```bash
# Firebaseアカウントにログイン
firebase login

# ブラウザが開くので、Googleアカウントでログイン
```

### 3. Firebase プロジェクトの設定

```bash
# collect-friends-app ディレクトリに移動
cd collect-friends-app

# Firebase プロジェクトを選択
firebase use --add

# 既存のFirebaseプロジェクトを選択
# エイリアス名を入力（例: default, staging, production など）
```

### 4. Hosting の初期化

```bash
# Hosting を初期化
firebase init hosting

# 設定項目:
# - "What do you want to use as your public directory?" → web-build
# - "Configure as a single-page app?" → Yes
# - "Set up automatic builds and deploys with GitHub?" → No（任意）
# - "File web-build/index.html already exists. Overwrite?" → No
```

## デプロイメント

### 1. Web 用ビルドの生成

```bash
# Expo を使ってWeb用の静的ファイルを生成
npm run build:web

# または直接実行
npx expo export:web
```

### 2. デプロイの実行

```bash
# 本番環境へのデプロイ
npm run deploy

# または直接実行
firebase deploy --only hosting
```

### 3. プレビューデプロイ（テスト用）

```bash
# プレビュー環境へのデプロイ
npm run deploy:preview

# または直接実行
firebase hosting:channel:deploy preview
```

## 設定ファイルの詳細

### firebase.json

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

#### 設定項目の説明

- **public**: 公開する静的ファイルのディレクトリ
- **ignore**: デプロイ時に無視するファイル
- **rewrites**: SPAのためのURL書き換えルール
- **headers**: ファイルタイプ別のHTTPヘッダー設定

## 環境変数の設定

### Web 環境用の環境変数

Web版では以下の環境変数が適切に設定されている必要があります：

```bash
# Firebase 設定
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# OAuth 設定
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_TWITTER_CLIENT_ID=your_twitter_client_id
```

## カスタムドメインの設定

### 1. ドメインの追加

```bash
# Firebase Console でのドメイン設定
# または CLI での設定
firebase hosting:sites:create your-custom-domain
```

### 2. DNS 設定

Firebase Console の Hosting セクションで提供される DNS 設定を、ドメインプロバイダーに追加してください。

## 継続的デプロイメント（オプション）

### GitHub Actions を使用した自動デプロイ

`.github/workflows/deploy.yml`：

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        working-directory: ./collect-friends-app
        
      - name: Build web
        run: npm run build:web
        working-directory: ./collect-friends-app
        
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
          entryPoint: './collect-friends-app'
```

## トラブルシューティング

### よくある問題

1. **Firebase CLI が見つからない**
   ```bash
   # パスを確認
   which firebase
   
   # 再インストール
   npm uninstall -g firebase-tools
   npm install -g firebase-tools
   ```

2. **ビルドエラー**
   ```bash
   # キャッシュをクリア
   expo r -c
   
   # 依存関係を再インストール
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **認証エラー**
   ```bash
   # ログアウト・再ログイン
   firebase logout
   firebase login
   ```

4. **デプロイ権限エラー**
   - Firebase Console でプロジェクトの権限を確認
   - 正しいプロジェクトが選択されているか確認

### デバッグ方法

```bash
# デプロイのデバッグ情報
firebase deploy --only hosting --debug

# ローカルでのプレビュー
firebase serve --only hosting

# プロジェクト情報の確認
firebase projects:list
firebase use
```

## セキュリティ考慮事項

1. **環境変数の管理**: 
   - 本番環境では機密情報を適切に管理
   - Firebase Console の環境設定を使用

2. **Firebase Security Rules**:
   - Firestore と Authentication のセキュリティルールを適切に設定

3. **HTTPS強制**:
   - Firebase Hosting は自動的にHTTPSを有効化

## 監視とメンテナンス

1. **Firebase Console での監視**:
   - Hosting の使用量とトラフィック
   - エラーログの確認

2. **定期的な更新**:
   - 依存関係の更新
   - Firebase SDKの更新

3. **バックアップ**:
   - ビルドファイルのバックアップ
   - 設定ファイルのバージョン管理

## 参考リンク

- [Firebase Hosting 公式ドキュメント](https://firebase.google.com/docs/hosting)
- [Expo Web 公式ドキュメント](https://docs.expo.dev/workflow/web/)
- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli) 