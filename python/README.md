# 位置情報ベース おすすめアクティビティ推薦API

LangGraphとLLMエージェントを使用した、位置情報ベースのアクティビティ推薦システムです。

## 🚀 機能

- **リアルタイム推薦**: Server-Sent Events (SSE)によるストリーミング応答
- **駅周辺検索**: Google Places APIを使用した駅周辺の施設検索
- **LLMエージェント**: Gemini APIを使用したインテリジェントな推薦
- **並列処理**: 複数駅の同時調査による高速化
- **キャッシュ機能**: Redisを使用した効率的なキャッシュ戦略
- **モニタリング**: 構造化ログとヘルスチェック

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI       │    │   LangGraph     │    │   Google APIs   │
│   (SSE Stream)  │───▶│   (Research)    │───▶│   (Places/LLM)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│     Redis       │    │   Coordinator   │
│   (Cache)       │◀───│   (Parallel)    │
└─────────────────┘    └─────────────────┘
```

## 🛠️ セットアップ

### 前提条件

- Docker & Docker Compose
- Google API キー (Places API)
- Google Gemini API キー

### 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集してAPIキーを設定
```

必要な環境変数:
```env
GOOGLE_API_KEY=your_google_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 開発環境での起動

```bash
# Docker環境を構築・起動
make build
make run

# ログの確認
make logs

# ヘルスチェック
make health
```

### 開発ツール付きで起動

```bash
# Redis Commanderも含めて起動
make dev
```

アクセス先:
- API: http://localhost:8080
- API ドキュメント: http://localhost:8080/docs
- Redis Commander: http://localhost:8081

## 📡 API使用方法

### ストリーミング推薦リクエスト

```bash
curl -X POST http://localhost:8080/recommendations/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "user_location": {
      "latitude": 35.676225,
      "longitude": 139.650348
    },
    "group_info": {
      "member_count": 2,
      "member_moods": ["お茶・カフェ", "散歩・ぶらぶら"],
      "budget_range": "¥1500-4500"
    },
    "context": {
      "current_time": "2025-06-29T14:30:00+09:00"
    }
  }'
```

### レスポンス例

```
event: status_update
data: {"message": "ユーザー情報から駅候補を検索中...", "step": "STATION_SEARCH"}

event: research_update  
data: {"message": "新宿駅の調査を開始...", "station": "新宿", "status": "IN_PROGRESS"}

event: final_report
data: {
  "status": "COMPLETE",
  "recommendations": [
    {
      "rank": 1,
      "station_info": {
        "name": "新宿駅",
        "distance_from_user_m": 1200,
        "travel_time_min": 15
      },
      "activities": [...],
      "overall_score": 8.7,
      "recommendation_reason": "新宿駅周辺は多様なカフェと散歩スポットが充実しています。"
    }
  ]
}
```

## 🧪 テスト

```bash
# テスト実行
make test

# リンティング
make lint

# フォーマット
make format

# 型チェック
make type-check
```

## 📊 モニタリング

### ヘルスチェック

```bash
# 基本ヘルスチェック
curl http://localhost:8080/health

# 詳細ヘルスチェック
curl http://localhost:8080/health/detailed

# メトリクス
curl http://localhost:8080/metrics
```

### ログ確認

```bash
# アプリケーションログ
make logs

# Redisログ
make logs-redis

# 全サービスログ
make logs-all
```

## 🚀 本番環境デプロイ

### 本番環境での起動

```bash
# デプロイ前チェック
make deploy-check

# 本番環境ビルド・起動
make prod-build
make prod-run
```

### 本番環境設定

```bash
# 本番用docker-compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🔧 開発ガイド

### プロジェクト構造

```
python/
├── app/                    # メインアプリケーション
│   ├── api/               # API エンドポイント
│   ├── core/              # 設定・共通機能
│   ├── schemas/           # Pydantic スキーマ
│   ├── services/          # ビジネスロジック
│   └── utils/             # ユーティリティ
├── research/              # LangGraph 研究エージェント
│   ├── graph.py           # LangGraph 定義
│   ├── nodes.py           # 各ノード実装
│   └── state.py           # 状態管理
├── tests/                 # テストファイル
└── resources/             # リソースファイル
```

### 新機能の追加

1. スキーマ定義 (`app/schemas/`)
2. サービス実装 (`app/services/`)
3. API エンドポイント (`app/api/`)
4. テスト作成 (`tests/`)

### LangGraphエージェントの拡張

1. 新ノード追加 (`research/nodes.py`)
2. 状態更新 (`research/state.py`)
3. グラフ構造更新 (`research/graph.py`)

## 🔨 利用可能なコマンド

```bash
make help                  # ヘルプ表示
make build                 # Dockerイメージビルド
make run                   # 開発環境起動
make stop                  # サービス停止
make clean                 # 環境クリーンアップ
make test                  # テスト実行
make logs                  # ログ表示
make shell                 # コンテナシェル
make redis-cli             # Redis CLI接続
make health                # ヘルスチェック
make backup-redis          # Redisバックアップ
```

## 📝 トラブルシューティング

### よくある問題

1. **APIキーエラー**
   ```bash
   # .envファイルの確認
   cat .env
   ```

2. **Redis接続エラー**
   ```bash
   # Redisコンテナの状態確認
   make status
   docker-compose logs redis
   ```

3. **ポート競合**
   ```bash
   # ポート使用状況確認
   lsof -i :8080
   lsof -i :6379
   ```

### ログレベル調整

```env
# 開発時
LOG_LEVEL=DEBUG

# 本番時
LOG_LEVEL=WARNING
```

## 📄 ドキュメント

- API仕様書: http://localhost:8080/docs
- ReDoc: http://localhost:8080/redoc
- 詳細仕様: [FastAPI仕様書.md](./FastAPI仕様書.md)
- 実装手順: [実装手順書.md](./実装手順書.md)