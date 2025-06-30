#!/bin/bash

# 設定値（実際の値に変更してください）
PROJECT_ID="collect-friends-app-463813"
REGION="asia-northeast1"
SERVICE_NAME="activity-recommendation-api"
SERVICE_ACCOUNT_EMAIL="activity-api-sa@$PROJECT_ID.iam.gserviceaccount.com"

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

# 3. Cloud Run URLを取得
echo -e "${YELLOW}🔍 Cloud Run URLを取得中...${NC}"
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

if [ -z "$CLOUD_RUN_URL" ]; then
    if [ -f "service_url.txt" ]; then
        CLOUD_RUN_URL=$(cat service_url.txt)
        echo -e "${YELLOW}📄 service_url.txt からURLを読み込みました: $CLOUD_RUN_URL${NC}"
    else
        echo -e "${RED}❌ Cloud Run URLが見つかりません。先にデプロイを実行してください。${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Cloud Run URL: $CLOUD_RUN_URL${NC}"
fi

# 4. サービスアカウントの権限確認・設定
echo -e "${YELLOW}🔐 サービスアカウントの権限を確認・設定中...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/run.invoker" --quiet

# 5. Cloud Scheduler の App Engine アプリケーションを作成（必要に応じて）
echo -e "${YELLOW}⚙️ App Engine アプリケーションを確認中...${NC}"
gcloud app describe --project=$PROJECT_ID > /dev/null 2>&1 || {
    echo -e "${YELLOW}📱 App Engine アプリケーションを作成中...${NC}"
    gcloud app create --region=$REGION --project=$PROJECT_ID
}

# 6. 既存のジョブを削除（再作成のため）
echo -e "${YELLOW}🗑️ 既存のスケジューラージョブを削除中...${NC}"
gcloud scheduler jobs delete ai-proposal-generation-evening --location=$REGION --quiet || true
gcloud scheduler jobs delete cache-cleanup-daily --location=$REGION --quiet || true

# 7. Cloud Scheduler ジョブの作成
echo -e "${YELLOW}⏰ スケジューラージョブを作成中...${NC}"

# AI提案生成ジョブ（夕方17時）
gcloud scheduler jobs create http ai-proposal-generation-evening \
    --location=$REGION \
    --schedule="0 17 * * *" \
    --time-zone="Asia/Tokyo" \
    --uri="$CLOUD_RUN_URL/api/v1/generate-ai-proposals" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body='{"max_proposals_per_user": 3, "force_generation": false}' \
    --oidc-service-account-email=$SERVICE_ACCOUNT_EMAIL \
    --oidc-token-audience=$CLOUD_RUN_URL \
    --max-retry-attempts=2 \
    --max-retry-duration=1200s \
    --description="夕方のAI提案生成ジョブ（17時）"

# 毎日のキャッシュクリアジョブ（深夜2時）
gcloud scheduler jobs create http cache-cleanup-daily \
    --location=$REGION \
    --schedule="0 2 * * *" \
    --time-zone="Asia/Tokyo" \
    --uri="$CLOUD_RUN_URL/admin/cache/clear" \
    --http-method=POST \
    --oidc-service-account-email=$SERVICE_ACCOUNT_EMAIL \
    --oidc-token-audience=$CLOUD_RUN_URL \
    --max-retry-attempts=1 \
    --description="毎日のキャッシュクリーンアップ（2時）"

echo -e "${GREEN}✅ Cloud Scheduler セットアップが完了しました！${NC}"

# 8. 作成されたジョブの確認
echo -e "${YELLOW}📋 作成されたスケジューラージョブ:${NC}"
gcloud scheduler jobs list --location=$REGION

# 9. テスト実行（オプション）
echo -e "${YELLOW}🧪 テスト実行を行いますか？ (y/n)${NC}"
read -r response
if [[ $response =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔬 ヘルスチェックを実行中...${NC}"
    gcloud scheduler jobs run cache-cleanup-daily --location=$REGION
    
    echo -e "${YELLOW}⏳ ジョブの実行状態を確認中...${NC}"
    sleep 10
    gcloud scheduler jobs describe cache-cleanup-daily --location=$REGION --format='value(status.lastAttemptTime,status.state)'
fi

echo -e "${GREEN}🎯 スケジューラーの設定が完了しました！${NC}"
echo -e "${YELLOW}⚠️  重要な確認事項:${NC}"
echo -e "  • サービスアカウント: $SERVICE_ACCOUNT_EMAIL"
echo -e "  • Cloud Run URL: $CLOUD_RUN_URL"
echo -e "  • 作成されたジョブ数: 2個"
echo -e "  • 次回実行時間: 今日 17:00 PM (JST) または明日 2:00 AM (JST)"
echo -e "${GREEN}📊 ジョブの監視: https://console.cloud.google.com/cloudscheduler?project=$PROJECT_ID${NC}" 