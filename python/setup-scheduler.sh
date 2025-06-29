#!/bin/bash

# 設定値（実際の値に変更してください）
PROJECT_ID="your-gcp-project-id"
REGION="asia-northeast1"
SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
CLOUD_RUN_URL="https://your-cloud-run-url"

# 色付きの出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📅 Cloud Scheduler セットアップを開始します...${NC}"

# 1. プロジェクトを設定
echo -e "${YELLOW}📝 Google Cloud プロジェクトを設定中...${NC}"
gcloud config set project $PROJECT_ID

# 2. 必要なAPIを有効化
echo -e "${YELLOW}🔧 Cloud Scheduler APIを有効化中...${NC}"
gcloud services enable cloudscheduler.googleapis.com

# 3. サービスアカウントの権限設定
echo -e "${YELLOW}🔐 サービスアカウントの権限を設定中...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/run.invoker"

# 4. Cloud Scheduler ジョブの作成
echo -e "${YELLOW}⏰ スケジューラージョブを作成中...${NC}"

# 毎時レコメンデーション更新ジョブ
gcloud scheduler jobs create http recommendation-update-hourly \
    --location=$REGION \
    --schedule="0 * * * *" \
    --time-zone="Asia/Tokyo" \
    --uri="$CLOUD_RUN_URL/api/v1/activity-recommendations" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body='{
        "user_location": {
            "latitude": 35.6762,
            "longitude": 139.6503,
            "accuracy": 10
        },
        "group_info": {
            "member_count": 2,
            "member_moods": ["お茶・カフェ"],
            "budget_range": "medium",
            "duration_hours": 2.0
        },
        "preferences": {
            "search_radius_km": 10,
            "max_stations": 20,
            "activity_types": ["お茶・カフェ", "散歩・ぶらぶら"],
            "exclude_crowded": false
        },
        "context": {
            "current_time": "2025-01-01T12:00:00+09:00",
            "weather_consideration": true,
            "accessibility_needs": []
        }
    }' \
    --oidc-service-account-email=$SERVICE_ACCOUNT_EMAIL \
    --oidc-token-audience=$CLOUD_RUN_URL

# 毎日のキャッシュクリアジョブ
gcloud scheduler jobs create http cache-cleanup-daily \
    --location=$REGION \
    --schedule="0 2 * * *" \
    --time-zone="Asia/Tokyo" \
    --uri="$CLOUD_RUN_URL/admin/cache/clear" \
    --http-method=POST \
    --oidc-service-account-email=$SERVICE_ACCOUNT_EMAIL \
    --oidc-token-audience=$CLOUD_RUN_URL

echo -e "${GREEN}✅ Cloud Scheduler セットアップが完了しました！${NC}"

# 5. 作成されたジョブの確認
echo -e "${YELLOW}📋 作成されたスケジューラージョブ:${NC}"
gcloud scheduler jobs list --location=$REGION

echo -e "${GREEN}🎯 スケジューラーの設定が完了しました！${NC}"
echo -e "${YELLOW}⚠️  注意: 実際の本番運用前に、以下を確認してください:${NC}"
echo -e "  • サービスアカウントの権限"
echo -e "  • Cloud Run URLの設定"
echo -e "  • スケジュールの頻度"
echo -e "  • リクエストボディの内容" 