#!/bin/bash

# 設定値（実際の値に変更してください）
PROJECT_ID="collect-friends-app-463813"
REGION="asia-northeast1"
SERVICE_NAME="activity-recommendation-api"
REPOSITORY_NAME="activity-api"
IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME/$SERVICE_NAME"

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
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable redis.googleapis.com

# 3. Artifact Registryリポジトリの作成
echo -e "${YELLOW}📦 Artifact Registryリポジトリを作成中...${NC}"
gcloud artifacts repositories create $REPOSITORY_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Activity Recommendation API Docker images" || true

# 4. Docker認証設定
echo -e "${YELLOW}🔐 Docker認証を設定中...${NC}"
gcloud auth configure-docker $REGION-docker.pkg.dev

# 5. Secretの作成（環境変数が設定されている場合のみ）
echo -e "${YELLOW}🔑 Secretsを設定中...${NC}"
if [ ! -z "$GOOGLE_PLACES_API_KEY" ]; then
    echo -n "$GOOGLE_PLACES_API_KEY" | gcloud secrets create google-places-api-key --data-file=- || \
    echo -n "$GOOGLE_PLACES_API_KEY" | gcloud secrets versions add google-places-api-key --data-file=-
fi

if [ ! -z "$GEMINI_API_KEY" ]; then
    echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- || \
    echo -n "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
fi

# 6. サービスアカウントの作成と権限設定
echo -e "${YELLOW}👤 サービスアカウントを設定中...${NC}"
gcloud iam service-accounts create activity-api-sa \
    --display-name="Activity API Service Account" \
    --description="Service account for Activity Recommendation API" || true

# 必要な権限の付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:activity-api-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.invoker"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:activity-api-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/redis.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:activity-api-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:activity-api-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

# 7. RedisインスタンスのIPアドレスを取得
echo -e "${YELLOW}📍 Redis IPアドレスを取得中...${NC}"
REDIS_IP=$(gcloud redis instances describe collect-friends-redis --region=$REGION --format='value(host)')
echo -e "${GREEN}🔍 Redis IP: $REDIS_IP${NC}"

# 8. Cloud Buildでイメージをビルドして push
echo -e "${YELLOW}🏗️ Cloud Buildでイメージをビルド中...${NC}"
gcloud builds submit --tag $IMAGE_NAME

# 9. Cloud Run にデプロイ
echo -e "${YELLOW}🚀 Cloud Runにデプロイ中...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image=$IMAGE_NAME \
    --platform=managed \
    --region=$REGION \
    --allow-unauthenticated \
    --service-account="activity-api-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --set-env-vars="REDIS_URL=redis://$REDIS_IP:6379" \
    --set-secrets="GOOGLE_PLACES_API_KEY=google-places-api-key:latest,GEMINI_API_KEY=gemini-api-key:latest" \
    --memory=2Gi \
    --cpu=1 \
    --timeout=300 \
    --concurrency=80 \
    --min-instances=0 \
    --max-instances=10 \
    --port=8080 \
    --vpc-egress=all \
    --network=projects/$PROJECT_ID/global/networks/default \
    --subnet=projects/$PROJECT_ID/regions/$REGION/subnetworks/default

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ デプロイが正常に完了しました！${NC}"
    
    # サービスURLを取得
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
    echo -e "${GREEN}🌍 サービスURL: $SERVICE_URL${NC}"
    echo -e "${GREEN}📖 API ドキュメント: $SERVICE_URL/docs${NC}"
    echo -e "${GREEN}🏥 ヘルスチェック: $SERVICE_URL/health${NC}"
    
    # URLをファイルに保存（スケジューラー設定で使用）
    echo $SERVICE_URL > service_url.txt
    echo -e "${YELLOW}💾 サービスURLを service_url.txt に保存しました${NC}"
else
    echo -e "${RED}❌ デプロイに失敗しました${NC}"
    exit 1
fi 