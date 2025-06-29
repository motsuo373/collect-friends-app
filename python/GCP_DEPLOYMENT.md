# Google Cloud Platform デプロイ・定期実行設定ガイド

このドキュメントでは、位置情報ベースアクティビティ推薦APIをGoogle Cloud Platformで運用し、Cloud Scheduler、Cloud Tasks、Cloud Runを使用して定期実行する方法を説明します。

## 🏗️ アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Cloud Scheduler │───▶│   Cloud Tasks   │───▶│    Cloud Run    │
│   (定期実行)     │    │  (タスクキュー)  │    │      (API)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Cloud Logging  │    │ Cloud Functions │    │  Cloud Memstore │
│  (監視・ログ)    │    │  (軽量処理)     │    │    (Redis)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 1. Cloud Run デプロイ設定

### 1.1 Dockerfileの本番環境対応

```dockerfile
# cloudbuild.yaml 用の Dockerfile
FROM python:3.11-slim

WORKDIR /app

# システム依存関係のインストール
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY app/ app/
COPY research/ research/

# 非rootユーザーの作成
RUN addgroup --system appgroup && \
    adduser --system --group appuser && \
    chown -R appuser:appgroup /app

USER appuser

# 環境変数
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

EXPOSE $PORT

# 本番用起動コマンド
CMD exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
```

### 1.2 Cloud Build設定

**cloudbuild.yaml**
```yaml
steps:
  # Docker イメージのビルド
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/recommendations-api:$COMMIT_SHA', '.']
  
  # Cloud Run へのデプロイ
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'recommendations-api'
      - '--image'
      - 'gcr.io/$PROJECT_ID/recommendations-api:$COMMIT_SHA'
      - '--region'
      - 'asia-northeast1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--memory'
      - '2Gi'
      - '--cpu'
      - '2'
      - '--timeout'
      - '300'
      - '--concurrency'
      - '10'
      - '--max-instances'
      - '5'
      - '--set-env-vars'
      - 'LOG_LEVEL=INFO,PORT=8080'
      - '--set-secrets'
      - 'GOOGLE_API_KEY=google-api-key:latest,GEMINI_API_KEY=gemini-api-key:latest'

images:
  - 'gcr.io/$PROJECT_ID/recommendations-api:$COMMIT_SHA'

options:
  logging: CLOUD_LOGGING_ONLY
```

### 1.3 デプロイコマンド

```bash
# プロジェクトIDを設定
export PROJECT_ID="your-gcp-project-id"
export REGION="asia-northeast1"

# Cloud Build でビルド・デプロイ
gcloud builds submit --tag gcr.io/$PROJECT_ID/recommendations-api

# Cloud Run へのデプロイ
gcloud run deploy recommendations-api \
  --image gcr.io/$PROJECT_ID/recommendations-api \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 10 \
  --max-instances 5 \
  --set-env-vars "LOG_LEVEL=INFO,PORT=8080,REDIS_URL=redis://your-memstore-ip:6379" \
  --set-secrets "GOOGLE_API_KEY=google-api-key:latest,GEMINI_API_KEY=gemini-api-key:latest"
```

## 🗄️ 2. Cloud Memstore (Redis) 設定

### 2.1 Memstore インスタンス作成

```bash
# Redis インスタンスの作成
gcloud redis instances create recommendations-redis \
  --region=$REGION \
  --memory-size=1 \
  --redis-version=redis_7_0 \
  --display-name="Recommendations API Redis"

# 接続情報の取得
gcloud redis instances describe recommendations-redis \
  --region=$REGION \
  --format="get(host)"
```

### 2.2 VPCコネクタの設定

```bash
# VPC コネクタの作成（Cloud Run から Memstore に接続するため）
gcloud compute networks vpc-access connectors create recommendations-connector \
  --region=$REGION \
  --subnet=default \
  --subnet-project=$PROJECT_ID \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro

# Cloud Run サービスにVPCコネクタを設定
gcloud run services update recommendations-api \
  --region=$REGION \
  --vpc-connector=recommendations-connector \
  --vpc-egress=private-ranges-only
```

## ⏰ 3. Cloud Scheduler 設定

### 3.1 定期実行スケジュール作成

```bash
# 基本的な定期実行ジョブ（毎時実行）
gcloud scheduler jobs create http recommendations-hourly \
  --location=$REGION \
  --schedule="0 */1 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://recommendations-api-xxxxx-an.a.run.app/health" \
  --http-method=GET \
  --headers="Content-Type=application/json" \
  --description="Hourly health check"

# 推薦データ更新ジョブ（毎日午前2時）
gcloud scheduler jobs create http recommendations-daily-update \
  --location=$REGION \
  --schedule="0 2 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://recommendations-api-xxxxx-an.a.run.app/admin/refresh-cache" \
  --http-method=POST \
  --headers="Content-Type=application/json,X-API-Key=your-admin-api-key" \
  --description="Daily cache refresh"

# Cloud Tasks 経由での推薦実行（毎15分）
gcloud scheduler jobs create http recommendations-batch-process \
  --location=$REGION \
  --schedule="*/15 * * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://cloudtasks.googleapis.com/v2/projects/$PROJECT_ID/locations/$REGION/queues/recommendations-queue/tasks" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --oauth-service-account-email="scheduler-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --oauth-scope="https://www.googleapis.com/auth/cloud-platform" \
  --message-body='{
    "task": {
      "httpRequest": {
        "url": "https://recommendations-api-xxxxx-an.a.run.app/batch/process-recommendations",
        "httpMethod": "POST",
        "headers": {
          "Content-Type": "application/json",
          "X-API-Key": "your-api-key"
        },
        "body": "'$(echo '{"batch_size": 100, "priority": "normal"}' | base64 -w 0)'"
      }
    }
  }'
```

### 3.2 スケジューラー設定ファイル

**scheduler-config.yaml**
```yaml
# 複数のスケジューラージョブを一括管理
jobs:
  - name: "recommendations-health-check"
    schedule: "*/5 * * * *"  # 5分ごと
    timezone: "Asia/Tokyo"
    target:
      uri: "https://recommendations-api-xxxxx-an.a.run.app/health"
      httpMethod: "GET"
    
  - name: "recommendations-cache-refresh"
    schedule: "0 2 * * *"  # 毎日午前2時
    timezone: "Asia/Tokyo"
    target:
      uri: "https://recommendations-api-xxxxx-an.a.run.app/admin/refresh-cache"
      httpMethod: "POST"
      headers:
        Content-Type: "application/json"
        X-API-Key: "your-admin-api-key"
    
  - name: "recommendations-station-update"
    schedule: "0 3 * * 0"  # 毎週日曜日午前3時
    timezone: "Asia/Tokyo"
    target:
      uri: "https://recommendations-api-xxxxx-an.a.run.app/admin/update-stations"
      httpMethod: "POST"
      headers:
        Content-Type: "application/json"
        X-API-Key: "your-admin-api-key"
```

## 📋 4. Cloud Tasks 設定

### 4.1 タスクキューの作成

```bash
# タスクキューの作成
gcloud tasks queues create recommendations-queue \
  --location=$REGION \
  --max-concurrent-dispatches=10 \
  --max-rate=100 \
  --max-attempts=3 \
  --min-backoff=1s \
  --max-backoff=60s

# 高優先度キューの作成
gcloud tasks queues create recommendations-priority-queue \
  --location=$REGION \
  --max-concurrent-dispatches=5 \
  --max-rate=50 \
  --max-attempts=5 \
  --min-backoff=2s \
  --max-backoff=120s
```

### 4.2 タスク実行用のCloud Function

**cloud-function/main.py**
```python
import json
import logging
from google.cloud import tasks_v2
from flask import Flask, request

app = Flask(__name__)
client = tasks_v2.CloudTasksClient()

PROJECT_ID = "your-gcp-project-id"
LOCATION = "asia-northeast1"
QUEUE_NAME = "recommendations-queue"

@app.route('/enqueue-recommendations', methods=['POST'])
def enqueue_recommendations():
    """推薦タスクをキューに追加"""
    try:
        data = request.get_json()
        
        # タスクペイロードの準備
        task_payload = {
            "user_locations": data.get("user_locations", []),
            "batch_id": data.get("batch_id"),
            "priority": data.get("priority", "normal")
        }
        
        # タスクの作成
        parent = client.queue_path(PROJECT_ID, LOCATION, QUEUE_NAME)
        
        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": f"https://recommendations-api-xxxxx-an.a.run.app/batch/process",
                "headers": {
                    "Content-Type": "application/json",
                    "X-API-Key": "your-api-key"
                },
                "body": json.dumps(task_payload).encode()
            }
        }
        
        # 優先度に応じた遅延設定
        if task_payload["priority"] == "low":
            import datetime
            from google.protobuf import timestamp_pb2
            d = datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
            timestamp = timestamp_pb2.Timestamp()
            timestamp.FromDatetime(d)
            task["schedule_time"] = timestamp
        
        # タスクをキューに追加
        response = client.create_task(parent=parent, task=task)
        
        return {
            "status": "success",
            "task_name": response.name,
            "message": "Task enqueued successfully"
        }, 200
        
    except Exception as e:
        logging.error(f"Error enqueuing task: {e}")
        return {"status": "error", "message": str(e)}, 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
```

### 4.3 Cloud Function デプロイ

```bash
# Cloud Function のデプロイ
gcloud functions deploy enqueue-recommendations \
  --runtime python39 \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256MB \
  --timeout 60s \
  --region $REGION \
  --set-env-vars "PROJECT_ID=$PROJECT_ID,LOCATION=$REGION"
```

## 🔐 5. IAM・セキュリティ設定

### 5.1 サービスアカウント作成

```bash
# Scheduler用サービスアカウント
gcloud iam service-accounts create scheduler-sa \
  --display-name="Cloud Scheduler Service Account"

# Cloud Tasks用サービスアカウント
gcloud iam service-accounts create tasks-sa \
  --display-name="Cloud Tasks Service Account"

# Cloud Run用サービスアカウント
gcloud iam service-accounts create cloudrun-sa \
  --display-name="Cloud Run Service Account"
```

### 5.2 IAM権限設定

```bash
# Scheduler権限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:scheduler-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudtasks.enqueuer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:scheduler-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Tasks権限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:tasks-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Cloud Run権限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloudrun-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloudrun-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/redis.editor"
```

### 5.3 API キー管理

```bash
# Secret Manager にAPIキーを保存
echo -n "your-google-api-key" | gcloud secrets create google-api-key --data-file=-
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-

# バージョン管理
gcloud secrets versions add google-api-key --data-file=new-key.txt
```

## 📊 6. モニタリング・ログ設定

### 6.1 Cloud Logging 設定

**logging.yaml**
```yaml
# カスタムログシンク設定
name: "recommendations-api-logs"
destination: "logging.googleapis.com/projects/your-project/logs/recommendations-api"
filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="recommendations-api"
  OR
  resource.type="cloud_function"
  resource.labels.function_name="enqueue-recommendations"

# アラート設定
alertPolicy:
  displayName: "Recommendations API Error Rate"
  conditions:
    - displayName: "Error rate too high"
      conditionThreshold:
        filter: |
          resource.type="cloud_run_revision"
          resource.labels.service_name="recommendations-api"
          severity>=ERROR
        comparison: COMPARISON_GREATER_THAN
        thresholdValue: 0.1
        duration: "300s"
```

### 6.2 Cloud Monitoring 設定

```bash
# カスタムメトリクス作成
gcloud logging metrics create recommendations_errors \
  --description="Count of recommendation API errors" \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="recommendations-api" AND severity>=ERROR'

# アラートポリシー作成
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring-policy.yaml
```

### 6.3 ダッシュボード設定

**dashboard-config.json**
```json
{
  "displayName": "Recommendations API Dashboard",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "API Request Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"recommendations-api\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Response Latency",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
```

## 🚀 7. デプロイ手順

### 7.1 初回セットアップ

```bash
#!/bin/bash
# setup.sh - 初回デプロイスクリプト

set -e

PROJECT_ID="your-gcp-project-id"
REGION="asia-northeast1"

echo "🚀 GCP APIの有効化..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudtasks.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

echo "🔐 Secret Manager設定..."
echo -n "$GOOGLE_API_KEY" | gcloud secrets create google-api-key --data-file=-
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

echo "🗄️ Redis インスタンス作成..."
gcloud redis instances create recommendations-redis \
  --region=$REGION \
  --memory-size=1 \
  --redis-version=redis_7_0

echo "🌐 VPC コネクタ作成..."
gcloud compute networks vpc-access connectors create recommendations-connector \
  --region=$REGION \
  --subnet=default \
  --min-instances=2 \
  --max-instances=3

echo "🏗️ Cloud Build でビルド・デプロイ..."
gcloud builds submit --config cloudbuild.yaml

echo "📋 Cloud Tasks キュー作成..."
gcloud tasks queues create recommendations-queue --location=$REGION

echo "⏰ Cloud Scheduler ジョブ作成..."
gcloud scheduler jobs create http recommendations-health-check \
  --location=$REGION \
  --schedule="*/5 * * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://$(gcloud run services describe recommendations-api --region=$REGION --format='value(status.url)')/health" \
  --http-method=GET

echo "✅ デプロイ完了!"
```

### 7.2 継続的デプロイ

**cloudbuild-cd.yaml**
```yaml
# CI/CD用Cloud Build設定
trigger:
  github:
    owner: "your-username"
    name: "collect-friends-app"
    push:
      branch: "^main$"

steps:
  # テスト実行
  - name: 'python:3.11'
    entrypoint: 'python'
    args: ['-m', 'pip', 'install', '-r', 'python/requirements.txt']
    dir: 'python'
  
  - name: 'python:3.11'
    entrypoint: 'python'
    args: ['-m', 'pytest', 'tests/']
    dir: 'python'
  
  # Docker イメージビルド
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/recommendations-api:$COMMIT_SHA', 'python/']
  
  # Cloud Run デプロイ
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'recommendations-api'
      - '--image'
      - 'gcr.io/$PROJECT_ID/recommendations-api:$COMMIT_SHA'
      - '--region'
      - 'asia-northeast1'

substitutions:
  _REGION: 'asia-northeast1'
```

## 📈 8. 運用・監視

### 8.1 パフォーマンスチューニング

```bash
# Cloud Run インスタンス設定の最適化
gcloud run services update recommendations-api \
  --region=$REGION \
  --memory=4Gi \
  --cpu=2 \
  --concurrency=20 \
  --max-instances=10 \
  --min-instances=1

# オートスケーリング設定
gcloud run services update recommendations-api \
  --region=$REGION \
  --cpu-throttling \
  --execution-environment=gen2
```

### 8.2 コスト最適化

```bash
# 低トラフィック時の設定
gcloud run services update recommendations-api \
  --region=$REGION \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=100

# Cloud Scheduler の頻度調整
gcloud scheduler jobs update http recommendations-health-check \
  --location=$REGION \
  --schedule="*/10 * * * *"  # 5分から10分間隔に変更
```

## 🔧 9. トラブルシューティング

### 9.1 よくある問題と解決方法

**1. Cloud Run の起動が遅い**
```bash
# 最小インスタンス数を1に設定
gcloud run services update recommendations-api \
  --region=$REGION \
  --min-instances=1
```

**2. Redis接続エラー**
```bash
# VPCコネクタの確認
gcloud compute networks vpc-access connectors describe recommendations-connector \
  --region=$REGION

# Redis インスタンスの状態確認
gcloud redis instances describe recommendations-redis \
  --region=$REGION
```

**3. Cloud Tasks のタスクが実行されない**
```bash
# キューの状態確認
gcloud tasks queues describe recommendations-queue \
  --location=$REGION

# IAM権限の確認
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role,bindings.members)"
```

### 9.2 ログ確認コマンド

```bash
# Cloud Run ログ
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=recommendations-api" \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"

# Cloud Scheduler ログ
gcloud logs read "resource.type=cloud_scheduler_job" \
  --limit=20

# Cloud Tasks ログ
gcloud logs read "resource.type=cloud_tasks_queue" \
  --limit=20
```

## 📋 10. チェックリスト

### デプロイ前チェック

- [ ] Google Cloud Project作成・設定完了
- [ ] 必要なAPI有効化済み
- [ ] APIキーをSecret Managerに保存済み
- [ ] IAMサービスアカウント・権限設定済み
- [ ] Redis（Memstore）インスタンス作成済み
- [ ] VPCコネクタ設定済み

### デプロイ後チェック

- [ ] Cloud Run サービスが正常起動
- [ ] ヘルスチェックエンドポイントが応答
- [ ] Redis接続が正常
- [ ] Cloud Scheduler ジョブが実行中
- [ ] Cloud Tasks キューが動作中
- [ ] ログが正常に出力されている
- [ ] モニタリングダッシュボード設定済み

このガイドに従って設定することで、Google Cloud Platformを使用したスケーラブルで信頼性の高い定期実行システムを構築できます。