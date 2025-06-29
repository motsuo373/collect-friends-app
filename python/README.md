# 位置情報ベースアクティビティ推奨システム

位置情報とユーザーの状況を基に、Gemini AIを活用して最適なアクティビティを推奨するFastAPIアプリケーション。

## 機能

- 🗺️ ユーザーの位置情報から近隣駅を検索
- 🌆 大都市の主要駅も含めた幅広い選択肢
- 🤖 Gemini AIによる深層調査
- ⚡ 並列処理による高速レスポンス
- 💾 Redisキャッシュによる効率化
- 👥 グループの人数・気分・予算に応じた最適化

## セットアップ

### 1. 環境変数の設定

`.env.example`をコピーして`.env`を作成し、必要なAPIキーを設定:

```bash
cp .env.example .env
```

### 2. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 3. Redisの起動

```bash
docker run -d -p 6379:6379 redis:latest
```

### 4. アプリケーションの起動

```bash
python -m app.main
```

または

```bash
uvicorn app.main:app --reload
```

## API使用例

### アクティビティ推奨の取得

```bash
curl -X POST "http://localhost:8000/api/v1/activity-recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "user_location": {
      "latitude": 35.6762,
      "longitude": 139.6503,
      "accuracy": 10
    },
    "group_info": {
      "member_count": 3,
      "member_moods": ["お茶・カフェ", "散歩・ぶらぶら"],
      "budget_range": "medium",
      "duration_hours": 2.5
    },
    "preferences": {
      "search_radius_km": 10,
      "max_stations": 20,
      "activity_types": ["お茶・カフェ", "散歩・ぶらぶら"],
      "exclude_crowded": false
    },
    "context": {
      "current_time": "2025-06-28T20:30:00+09:00",
      "weather_consideration": true,
      "accessibility_needs": []
    }
  }'
```

### 🍽️ 店舗推奨の取得（新機能）

```bash
curl -X POST "http://localhost:8000/api/v1/restaurant-recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "user_location": {
      "latitude": 35.6762,
      "longitude": 139.6503,
      "accuracy": 10
    },
    "activity_type": ["cafe", "drink"],
    "mood": ["casual", "social"],
    "group_size": 3,
    "station_search_radius_km": 5.0,
    "restaurant_search_radius_km": 1.0,
    "max_stations": 5,
    "max_restaurants_per_station": 10,
    "preferred_cuisine_types": ["Japanese", "Italian"],
    "budget_range": "medium"
  }'
```

#### 店舗推奨レスポンス例

```json
{
  "success": true,
  "request_id": "rest_req_a1b2c3d4",
  "processing_time_ms": 3200,
  "user_location": {
    "latitude": 35.6762,
    "longitude": 139.6503,
    "accuracy": 10
  },
  "searched_stations": [
    {
      "station_info": {
        "station_name": "東京駅",
        "distance_km": 0.8,
        "latitude": 35.6812,
        "longitude": 139.7671
      },
      "restaurants": [
        {
          "name": "銀座 久兵衛",
          "type": "日本料理店",
          "cuisine_type": "日本料理",
          "rating": 4.5,
          "price_level": 4,
          "distance_from_station_km": 0.3
        }
      ]
    }
  ],
  "top_recommendations": [
    {
      "restaurant": {
        "name": "銀座 久兵衛",
        "type": "日本料理店",
        "cuisine_type": "日本料理",
        "address": "東京都中央区銀座8-7-6",
        "rating": 4.5,
        "user_ratings_total": 1248,
        "price_level": 4,
        "opening_hours": "11:30-14:00"
      },
      "station_info": {
        "station_name": "東京駅",
        "distance_km": 0.8
      },
      "recommendation_score": 10.0,
      "reason": "高評価の老舗寿司店で、カジュアルな雰囲気で本格的な日本料理を楽しめます。",
      "activity_match": ["cafe"],
      "mood_match": ["casual"]
    }
  ],
  "ai_analysis": "3つの異なるタイプの店舗を選択し、様々な気分に対応。評価が高く、アクセスも良好で、予算内で楽しめる多様な選択肢を提供。"
}
```

#### 利用可能なパラメータ

##### アクティビティタイプ (activity_type)
- `cafe`: お茶・カフェ
- `drink`: 軽く飲み
- `walk`: 散歩・ぶらぶら
- `shopping`: 買い物・ショッピング
- `movie`: 映画
- `food`: 軽食・ランチ

##### 気分・雰囲気タイプ (mood)
- `stylish`: おしゃれ
- `romantic`: ロマンチック
- `casual`: カジュアル
- `formal`: フォーマル
- `social`: 社交的
- `quiet`: 静か

##### グループサイズ (group_size)
- 2～6人まで指定可能

#### 使用例

**カジュアルな飲み会（3人）**
```bash
curl -X POST "http://localhost:8000/api/v1/restaurant-recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "user_location": {"latitude": 35.534825, "longitude": 139.694074},
    "activity_type": ["drink"],
    "mood": ["casual"],
    "group_size": 3
  }'
```

**おしゃれなデート（2人）**
```bash
curl -X POST "http://localhost:8000/api/v1/restaurant-recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "user_location": {"latitude": 35.6812, "longitude": 139.7671},
    "activity_type": ["cafe", "food"],
    "mood": ["stylish", "romantic"],
    "group_size": 2
  }'
```

**グループでのショッピング後（4人）**
```bash
curl -X POST "http://localhost:8000/api/v1/restaurant-recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "user_location": {"latitude": 35.6593, "longitude": 139.7006},
    "activity_type": ["shopping", "cafe"],
    "mood": ["social"],
    "group_size": 4,
    "preferred_cuisine_types": ["Italian", "Japanese"]
  }'
```

## APIドキュメント

アプリケーション起動後、以下のURLでAPIドキュメントを確認できます:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## アーキテクチャ

```
app/
├── main.py              # FastAPIアプリケーション
├── models.py            # Pydanticモデル
├── config.py            # 設定管理
├── api/
│   └── endpoints/
│       └── recommendations.py  # 推奨エンドポイント
└── services/
    ├── station_search.py      # 駅検索エンジン
    ├── gemini_research.py     # Gemini AI統合
    └── cache.py              # Redisキャッシュ
```

## Docker実行

```bash
docker build -t activity-recommendation .
docker run -p 8000:8000 --env-file .env activity-recommendation
```

## 🚀 Cloud Run デプロイメント

### 簡単デプロイ

```bash
# 1. 設定ファイルを編集
cp .env.example .env
# .env ファイルの設定を編集

# 2. deploy.sh の設定を更新
# PROJECT_ID, REGION などを実際の値に変更

# 3. デプロイ実行
chmod +x deploy.sh
./deploy.sh
```

### Cloud Scheduler 設定

```bash
# スケジューラーをセットアップ
chmod +x setup-scheduler.sh
./setup-scheduler.sh
```

詳細なデプロイメント手順は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### 必要な環境変数

```bash
# Google Places API キー（必須）
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# Gemini AI API キー（必須）
GEMINI_API_KEY=your-gemini-api-key

# Redis設定（Dockerコンテナ内の場合）
REDIS_URL=redis://redis:6379

# Google Cloud設定（Cloud Run用）
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
REDIS_HOST=your-redis-ip-address
REDIS_PORT=6379
```

### APIキーの取得方法

#### Google Places API キー
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. 「API とサービス」 > 「ライブラリ」から「**Places API (NEW)**」を有効化
4. 「認証情報」でAPIキーを作成
5. 作成したAPIキーを`GOOGLE_PLACES_API_KEY`に設定

#### Gemini API キー
1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. 「Create API key」でAPIキーを作成
3. 作成したAPIキーを`GEMINI_API_KEY`に設定

### .env ファイルの例

```bash
# .env ファイル作成例
GOOGLE_PLACES_API_KEY=AIzaSyC-ABC123...
GEMINI_API_KEY=AIzaSyD-XYZ789...
REDIS_URL=redis://redis:6379
LOG_LEVEL=INFO
```

**注意**: Places API (NEW) を使用しているため、従来のPlaces APIとは異なるAPIキーが必要です。

## テスト

```bash
pytest tests/
```

## ライセンス

MIT License