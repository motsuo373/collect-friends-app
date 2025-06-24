# Firebase Functions デプロイガイド

## 🎯 現在の状況
✅ Firebase CLI インストール済み  
✅ プロジェクト設定完了  
✅ ビルド成功  
✅ ローカルエミュレーター動作確認済み  

## 🚀 本番デプロイ手順

### Step 1: Firebase プラン変更
1. Firebase Console にアクセス
   - URL: https://console.firebase.google.com/project/collect-friends-app/usage/details
2. 「Blaze プラン」に変更
   - 基本料金: 無料
   - 使用した分だけ課金
   - 無料枠: 月128,000回の関数呼び出し

### Step 2: デプロイ実行
```bash
cd api
firebase deploy --only functions
```

### Step 3: デプロイ後の確認
```bash
# デプロイされた関数の確認
firebase functions:list

# ログの確認
firebase functions:log
```

## 🛠️ ローカル開発

### エミュレーター起動
```bash
cd api/functions
npm run serve
```

### エンドポイント
- **Functions**: http://127.0.0.1:5001
- **Emulator UI**: http://127.0.0.1:4000
- **helloWorld**: http://127.0.0.1:5001/collect-friends-app/asia-northeast1/helloWorld

### テスト方法
```bash
# API テスト
curl http://127.0.0.1:5001/collect-friends-app/asia-northeast1/helloWorld

# レスポンス例
{
  "message": "Hello from Collect Friends API!",
  "timestamp": "2025-01-25T02:00:00.000Z",
  "version": "1.0.0"
}
```

## 📊 コスト見積もり（Blaze プラン）

### 無料枠
- 関数呼び出し: 200万回/月
- GB秒: 40万GB秒/月
- CPU秒: 20万CPU秒/月

### 開発・テスト段階の想定コスト
- **小規模テスト**: 月0円（無料枠内）
- **中規模開発**: 月数百円程度
- **本格運用**: 使用量に応じて

## 🔧 トラブルシューティング

### デプロイエラーの場合
```bash
# 権限確認
firebase projects:list

# プロジェクト再設定
firebase use collect-friends-app

# 強制再デプロイ
firebase deploy --only functions --force
```

### ログ確認
```bash
# リアルタイムログ
firebase functions:log --follow

# 特定関数のログ
firebase functions:log --only helloWorld
```

## 📝 次の開発ステップ

1. **基本API実装**
   - ユーザー認証API
   - 位置情報管理API
   
2. **AI機能実装**
   - マッチングアルゴリズム
   - 提案生成システム
   
3. **店舗連携API**
   - 店舗情報管理
   - 予約リンク統合 