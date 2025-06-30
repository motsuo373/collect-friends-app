# Google Cloud Run デプロイメントガイド（改善版）

このガイドでは、位置情報ベースアクティビティ推奨システムをGoogle Cloud Runにデプロイし、Cloud Schedulerでスケジュール実行する方法を説明します。

## 📋 事前準備

### 1. Google Cloud プロジェクトのセットアップ

```bash
# Google Cloud CLIのインストール（未インストールの場合）
# https://cloud.google.com/sdk/docs/install

# 認証
gcloud auth login

# プロジェクトの作成（または既存プロジェクトを使用）
gcloud projects create YOUR_PROJECT_ID

# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# 課金を有効化（必須）
# Google Cloud Consoleで課金アカウントをプロジェクトに関連付け
```

### 2. 必要なAPIの有効化

```bash
# 基本API
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable redis.googleapis.com

# Firebase連携（必要に応じて）
gcloud services enable firestore.googleapis.com
```

### 3. 必要な環境変数の設定

```bash
# 設定値の準備
export PROJECT_ID="your-actual-project-id"
export REGION="asia-northeast1"
export GOOGLE_PLACES_API_KEY="your-google-places-api-key"
export GEMINI_API_KEY="your-gemini-api-key"
export REDIS_HOST="your-redis-ip-address"  # Memorystore作成後に設定
```

## 🗄️ データベース（Redis）のセットアップ

### Cloud Memorystore for Redis の作成

```bash
# Memorystore Redisインスタンスの作成
gcloud redis instances create activity-redis \
    --size=1 \
    --region=$REGION \
    --redis-version=redis_6_x \
    --network=default \
    --connect-mode=DIRECT_PEERING

# 接続情報の取得
REDIS_HOST=$(gcloud redis instances describe activity-redis \
    --region=$REGION --format='value(host)')
echo "Redis Host: $REDIS_HOST"

# 環境変数に設定
export REDIS_HOST=$REDIS_HOST
```

## 🚀 Cloud Run へのデプロイ

### 自動デプロイ（推奨）

1. **設定ファイルの更新**：

```bash
# deploy.sh の設定値を編集
sed -i "s/your-gcp-project-id/$PROJECT_ID/g" deploy.sh
sed -i "s/your-redis-host/$REDIS_HOST/g" deploy.sh
```

2. **デプロイスクリプトを実行**：

```bash
chmod +x deploy.sh
./deploy.sh
```

### Cloud Build による自動デプロイ

```bash
# cloudbuild.yaml を使用したビルド
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _REGION=$REGION,_REDIS_HOST=$REDIS_HOST
```

## ⏰ Cloud Scheduler でのスケジュール実行

### スケジューラーのセットアップ

```bash
# setup-scheduler.sh の設定値を編集
sed -i "s/your-gcp-project-id/$PROJECT_ID/g" setup-scheduler.sh

# スケジューラーをセットアップ
chmod +x setup-scheduler.sh
./setup-scheduler.sh
```

### 作成されるスケジュールジョブ

| ジョブ名 | スケジュール | 説明 |
|----------|-------------|------|
| `ai-proposal-generation-morning` | 9:00 AM 毎日 | 朝のAI提案生成 |
| `ai-proposal-generation-afternoon` | 1:00 PM 毎日 | 昼のAI提案生成 |
| `ai-proposal-generation-evening` | 5:00 PM 毎日 | 夕方のAI提案生成 |
| `cache-cleanup-daily` | 2:00 AM 毎日 | キャッシュクリーンアップ |

## 🔧 設定オプション

### 環境変数

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `GOOGLE_CLOUD_PROJECT` | GCPプロジェクトID | 自動設定 |
| `REDIS_HOST` | RedisホストIP | Memorystore作成後 |
| `REDIS_PORT` | Redisポート | 6379（デフォルト） |
| `GOOGLE_PLACES_API_KEY` | Google Places API Key | Secret Manager経由 |
| `GEMINI_API_KEY` | Gemini API Key | Secret Manager経由 |

### Cloud Run 設定

- **メモリ**: 1Gi
- **CPU**: 1
- **並行性**: 80リクエスト
- **タイムアウト**: 300秒
- **最小インスタンス数**: 0
- **最大インスタンス数**: 10

## 🔐 セキュリティ設定

### Secret Manager の活用

```bash
# Secretsの作成
echo -n "$GOOGLE_PLACES_API_KEY" | gcloud secrets create google-places-api-key --data-file=-
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# サービスアカウントへの権限付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:activity-api-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### サービスアカウント権限

作成されるサービスアカウント `activity-api-sa` には以下の権限が付与されます：

- `roles/run.invoker`: Cloud Run呼び出し
- `roles/redis.editor`: Redis接続
- `roles/secretmanager.secretAccessor`: Secret Manager読み取り
- `roles/datastore.user`: Firestore読み書き

## 📊 監視とログ

### Cloud Logging

```bash
# ログの確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=activity-recommendation-api" --limit=50 --format="table(timestamp,severity,textPayload)"

# エラーログのフィルタ
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=20
```

### Cloud Monitoring

```bash
# メトリクスの確認
gcloud monitoring metrics list --filter="resource.type=cloud_run_revision"

# ダッシュボードURL
echo "https://console.cloud.google.com/monitoring/dashboards?project=$PROJECT_ID"
```

### スケジューラージョブの監視

```bash
# ジョブ実行履歴の確認
gcloud scheduler jobs describe ai-proposal-generation-morning \
    --location=$REGION \
    --format="table(status.lastAttemptTime,status.state)"

# 失敗したジョブの確認
gcloud logging read "resource.type=cloud_scheduler_job AND severity=ERROR" --limit=10
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. デプロイエラー

```bash
# 権限エラーの場合
gcloud auth application-default login

# Artifact Registry認証エラー
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

#### 2. Secret Manager エラー

```bash
# Secretの存在確認
gcloud secrets list

# Secretの値確認
gcloud secrets versions access latest --secret="google-places-api-key"
```

#### 3. Redis接続エラー

```bash
# Redisインスタンスの状態確認
gcloud redis instances describe activity-redis --region=$REGION

# ネットワーク設定確認
gcloud compute networks describe default
```

#### 4. スケジューラージョブの失敗

```bash
# ジョブの手動実行
gcloud scheduler jobs run ai-proposal-generation-morning --location=$REGION

# ログの確認
gcloud logging read "resource.type=cloud_scheduler_job" --limit=10
```

### ヘルスチェック

```bash
# Cloud Runサービスの確認
SERVICE_URL=$(gcloud run services describe activity-recommendation-api \
    --region=$REGION --format='value(status.url)')

curl "$SERVICE_URL/health"
```

## 🔄 アップデートとメンテナンス

### アプリケーションの更新

```bash
# コードを更新後
./deploy.sh

# 特定のイメージタグでデプロイ
gcloud run deploy activity-recommendation-api \
    --image asia-northeast1-docker.pkg.dev/$PROJECT_ID/activity-api/activity-recommendation-api:v1.1.0 \
    --region=$REGION
```

### スケジューラーの更新

```bash
# ジョブの停止
gcloud scheduler jobs pause ai-proposal-generation-morning --location=$REGION

# ジョブの再開
gcloud scheduler jobs resume ai-proposal-generation-morning --location=$REGION

# スケジュールの変更
gcloud scheduler jobs update http ai-proposal-generation-morning \
    --schedule="0 8 * * *" --location=$REGION
```

### バックアップとリストア

```bash
# Firestoreエクスポート（必要に応じて）
gcloud firestore export gs://your-backup-bucket

# 設定のバックアップ
gcloud scheduler jobs list --location=$REGION --format=json > scheduler-backup.json
```

## 💰 コスト最適化

### 推奨設定

1. **Cloud Run**: 最小インスタンス数を0に設定
2. **Redis**: 必要に応じてサイズを調整
3. **Logging**: ログ保持期間を30日に設定
4. **Monitoring**: アラートを設定して異常時のみ通知

### コスト監視

```bash
# 予算アラートの設定
gcloud billing budgets create \
    --billing-account=BILLING_ACCOUNT_ID \
    --display-name="Activity API Budget" \
    --budget-amount=100USD \
    --threshold-rules=percent=90,basis=CURRENT_SPEND
```

## 📈 スケーリング

### 負荷対応

```bash
# 最大インスタンス数の増加
gcloud run services update activity-recommendation-api \
    --max-instances=50 \
    --region=$REGION

# CPUとメモリの調整
gcloud run services update activity-recommendation-api \
    --cpu=2 --memory=2Gi \
    --region=$REGION
```

### Redis スケーリング

```bash
# Redisインスタンスのサイズ変更
gcloud redis instances patch activity-redis \
    --size=5 --region=$REGION
```

## 🎯 本番運用チェックリスト

- [ ] プロジェクトIDを実際の値に変更
- [ ] API Keyを取得してSecret Managerに設定
- [ ] Redis インスタンス作成と接続確認
- [ ] Cloud Run デプロイ成功確認
- [ ] スケジューラージョブ作成確認
- [ ] ヘルスチェックエンドポイント確認
- [ ] ログ監視設定
- [ ] アラート設定
- [ ] バックアップ設定
- [ ] セキュリティ監査 