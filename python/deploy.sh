#!/bin/bash

# 設定値
PROJECT_ID="your-gcp-project-id"
REGION="asia-northeast1"
SERVICE_NAME="activity-recommendation-api"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# 色付きの出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Cloud Run デプロイを開始します...${NC}"

# 1. プロジェクトを設定
echo -e "${YELLOW}📝 Google Cloud プロジェクトを設定中...${NC}"
gcloud config set project $PROJECT_ID

# 2. 必要なAPIを有効化
echo -e "${YELLOW}🔧 必要なAPIを有効化中...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# 3. Dockerイメージをビルドして push
echo -e "${YELLOW}🏗️ Dockerイメージをビルド中...${NC}"
docker build -t $IMAGE_NAME .

echo -e "${YELLOW}📤 Dockerイメージをプッシュ中...${NC}"
docker push $IMAGE_NAME

# 4. Cloud Run にデプロイ
echo -e "${YELLOW}🚀 Cloud Runにデプロイ中...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 300 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
  --set-env-vars "REDIS_URL=redis://your-redis-host:6379" \
  --set-env-vars "GOOGLE_PLACES_API_KEY=${GOOGLE_PLACES_API_KEY}" \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ デプロイが正常に完了しました！${NC}"
    
    # サービスURLを取得
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
    echo -e "${GREEN}🌍 サービスURL: $SERVICE_URL${NC}"
    echo -e "${GREEN}📖 API ドキュメント: $SERVICE_URL/docs${NC}"
    echo -e "${GREEN}🏥 ヘルスチェック: $SERVICE_URL/health${NC}"
else
    echo -e "${RED}❌ デプロイに失敗しました${NC}"
    exit 1
fi 