# Google Cloud Run デプロイメントガイド

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
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable redis.googleapis.com
```

### 3. サービスアカウントの作成

```bash
# サービスアカウントの作成
gcloud iam service-accounts create activity-api-sa \
    --display-name="Activity Recommendation API Service Account"

# 必要な権限の付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:activity-api-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.invoker"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:activity-api-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/redis.editor"
```

## 🗄️ データベース（Redis）のセットアップ

### Cloud Memorystore for Redis の作成

```bash
# Memorystore Redisインスタンスの作成
gcloud redis instances create activity-redis \
    --size=1 \
    --region=asia-northeast1 \
    --redis-version=redis_6_x

# 接続情報の取得
gcloud redis instances describe activity-redis --region=asia-northeast1
```

## 🚀 Cloud Run へのデプロイ

### 方法1: 自動デプロイ（推奨）

1. `deploy.sh` ファイルを編集して設定値を更新：

```bash
# deploy.sh の設定値を編集
PROJECT_ID="your-actual-project-id"
REGION="asia-northeast1"
SERVICE_NAME="activity-recommendation-api"
```

2. 環境変数を設定：

```bash
export GOOGLE_PLACES_API_KEY="your-google-places-api-key"
export GEMINI_API_KEY="your-gemini-api-key"
```

3. デプロイスクリプトを実行：

```bash
chmod +x deploy.sh
./deploy.sh
```

### 方法2: 手動デプロイ

```bash
# 1. Dockerイメージをビルド
docker build -t gcr.io/YOUR_PROJECT_ID/activity-recommendation-api .

# 2. Container Registryにプッシュ
docker push gcr.io/YOUR_PROJECT_ID/activity-recommendation-api

# 3. Cloud Runにデプロイ
gcloud run deploy activity-recommendation-api \
  --image gcr.io/YOUR_PROJECT_ID/activity-recommendation-api \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID" \
  --set-env-vars "REDIS_HOST=REDIS_IP_ADDRESS" \
  --set-env-vars "GOOGLE_PLACES_API_KEY=YOUR_API_KEY" \
  --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_KEY"
```

### 方法3: Cloud Build による自動デプロイ

```bash
# cloudbuild.yaml を使用したビルド
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _REGION=asia-northeast1,_REDIS_URL=redis://REDIS_IP:6379
```

## ⏰ Cloud Scheduler でのスケジュール実行

### 1. スケジューラーのセットアップ

1. `setup-scheduler.sh` ファイルを編集：

```bash
PROJECT_ID="your-actual-project-id"
REGION="asia-northeast1"
SERVICE_ACCOUNT_EMAIL="activity-api-sa@your-project-id.iam.gserviceaccount.com"
CLOUD_RUN_URL="https://your-actual-cloud-run-url"
```

2. スケジューラーをセットアップ：

```bash
chmod +x setup-scheduler.sh
./setup-scheduler.sh
```

### 2. 利用可能なスケジュールジョブ

- **毎時実行**: レコメンデーション更新（`0 * * * *`）
- **毎日実行**: キャッシュクリーンアップ（`0 2 * * *`）

### 3. スケジュールの管理

```bash
# ジョブの一覧確認
gcloud scheduler jobs list --location=asia-northeast1

# ジョブの実行
gcloud scheduler jobs run JOB_NAME --location=asia-northeast1

# ジョブの停止
gcloud scheduler jobs pause JOB_NAME --location=asia-northeast1

# ジョブの再開
gcloud scheduler jobs resume JOB_NAME --location=asia-northeast1
```

## 🔧 構成オプション

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `GOOGLE_CLOUD_PROJECT` | GCPプロジェクトID | - |
| `REDIS_HOST` | RedisホストIP | localhost |
| `REDIS_PORT` | Redisポート | 6379 |
| `GOOGLE_PLACES_API_KEY` | Google Places API Key | - |
| `GEMINI_API_KEY` | Gemini API Key | - |
| `DEBUG` | デバッグモード | false |

### Cloud Run 設定

- **メモリ**: 1Gi（推奨最小値）
- **CPU**: 1（推奨最小値）
- **並行性**: 80リクエスト
- **タイムアウト**: 300秒
- **ポート**: 8080

## 📊 監視とログ

### Cloud Logging

```bash
# ログの確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=activity-recommendation-api" --limit=50
```

### Cloud Monitoring

- CPU使用率
- メモリ使用率
- リクエスト数
- レスポンス時間
- エラー率

## 🛠️ トラブルシューティング

### よくある問題

1. **Redis接続エラー**
   - Memorystore Redisのプライベートネットワーク設定を確認
   - VPC Connectorの設定（必要な場合）

2. **API Key エラー**
   - 環境変数の設定を確認
   - APIの有効化状況を確認

3. **タイムアウトエラー**
   - Cloud Runのタイムアウト設定を調整
   - 並列処理の設定を見直し

### デバッグコマンド

```bash
# サービスの詳細確認
gcloud run services describe activity-recommendation-api --region=asia-northeast1

# 最新リビジョンのログ確認
gcloud run services logs read activity-recommendation-api --region=asia-northeast1

# スケジューラージョブの実行履歴
gcloud scheduler jobs describe JOB_NAME --location=asia-northeast1
```

## 💰 コスト最適化

### 推奨設定

1. **最小インスタンス数**: 0（コールドスタート許容時）
2. **最大インスタンス数**: 10-100（トラフィックに応じて）
3. **CPU割り当て**: リクエスト処理中のみ
4. **Redis**: 必要最小サイズから開始

### コスト監視

```bash
# Cloud Run の利用状況確認
gcloud run services list
gcloud run revisions list

# Cloud Scheduler の利用状況確認
gcloud scheduler jobs list --location=asia-northeast1
```

## 🔒 セキュリティ

### 推奨事項

1. **認証の有効化**: 本番環境では`--no-allow-unauthenticated`を使用
2. **IAM権限の最小化**: 必要最小限の権限のみ付与
3. **シークレット管理**: Secret Managerの使用を検討
4. **VPC設定**: プライベートネットワークでの運用

### セキュリティコマンド

```bash
# IAM ポリシーの確認
gcloud run services get-iam-policy activity-recommendation-api --region=asia-northeast1

# 認証の設定
gcloud run services update activity-recommendation-api \
  --region=asia-northeast1 \
  --no-allow-unauthenticated
```

## 🔄 CI/CD パイプライン

### GitHub Actions の設定例

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - name: Deploy to Cloud Run
        run: |
          gcloud builds submit --config cloudbuild.yaml
```

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. Google Cloud Statusページ
2. プロジェクトの課金状況
3. API制限とクォータ
4. ネットワーク設定
5. ログとメトリクス 