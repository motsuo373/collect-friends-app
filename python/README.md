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

## テスト

```bash
pytest tests/
```

## ライセンス

MIT License