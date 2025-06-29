# **位置情報ベース おすすめアクティビティ推薦API 詳細仕様書**

**バージョン**: 2.0
**作成日**: 2025年6月29日

## 1\. 概要

### 1.1. システム概要

本システムは、ユーザーの現在位置と人数、希望するアクティビティなどの条件に基づき、最適な駅周辺の店舗や施設、アクティビティを推薦するAPIである。ユーザーの入力情報から近隣の駅と主要な大都市の駅を候補としてリストアップし、LangGraphフレームワーク上で動作するLLM（大規模言語モデル）エージェントが詳細な調査（Deep Research）を実行。その結果を統合・分析し、ユーザーに最適なプランをストリーミング形式で提供する。

### 1.2. 目的

ユーザーが持つ「どこで何をしようか」という漠然としたニーズに対し、現在地、同行者の人数や気分、予算といった多様なコンテキストを考慮した、具体的かつ質の高い選択肢を迅速に提供することを目的とする。

### 1.3. システム構成図

*(注: 上図の「Deep Research」および「LLMで情報まとめる」の内部プロセスは、セクション4で詳述するLangGraphアーキテクチャによって実現される)*

## 2\. システムアーキテクチャ

### 2.1. 技術スタック

  - **アプリケーションフレームワーク**: FastAPI
  - **コンテナ環境**: Docker
  - **言語**: Python
  - **主要ライブラリ**:
      - **エージェント・オーケストレーション**: **LangGraph**
      - `geopy`: ユーザーと駅間の測地線距離計算
      - `asyncio`, `aiohttp`: 非同期処理、外部APIとのHTTP通信
      - **LLM連携**: `langchain_google_genai`
  - **外部サービス**:
      - **駅情報・施設検索**: Google Places API
      - **情報調査・推論・評価**: Google Gemini API
  - **キャッシュ**: Redis

## 3\. API仕様

### 3.1. エンドポイント

  - **URL**: `/recommendations/stream`
  - **HTTPメソッド**: `POST`

### 3.2. リクエスト仕様

#### 3.2.1. ヘッダー

| キー | 値 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `Content-Type` | `application/json` | はい | |
| `X-API-KEY` | `your_api_key` | はい | (任意) 認証用APIキー |

#### 3.2.2. ボディ (JSON)

```json
{
  "user_location": {
    "latitude": 35.676225,
    "longitude": 139.650348
  },
  "search_params": {
    "search_radius_km": 10,
    "max_stations": 20
  },
  "group_info": {
    "member_count": 2,
    "member_moods": ["お茶・カフェ", "散歩・ぶらぶら"],
    "budget_range": "¥1500-4500"
  },
  "context": {
    "current_time": "2025-06-29T14:30:00+09:00"
  }
}
```

#### 3.2.3. パラメータ詳細

| パラメータ名 | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `user_location` | Object | はい | ユーザーの現在位置情報。 |
| `user_location.latitude` | Number | はい | 緯度（十進度数）。小数点以下6桁に正規化。 |
| `user_location.longitude` | Number | はい | 経度（十進度数）。小数点以下6桁に正規化。 |
| `search_params` | Object | いいえ | 検索条件パラメータ。 |
| `search_params.search_radius_km`| Integer| いいえ | 検索半径(km)。範囲: 1-50、デフォルト: `10`。 |
| `search_params.max_stations` | Integer| いいえ | 近傍駅から取得する最大候補数。範囲: 5-50、デフォルト: `20`。 |
| `group_info` | Object | はい | ユーザーグループの情報。 |
| `group_info.member_count` | Integer| はい | 人数。 |
| `group_info.member_moods` | Array[String]| はい | 希望アクティビティのリスト。`ActivityType`列挙型に準拠。 |
| `group_info.budget_range` | String | いいえ | 予算帯。`BudgetRange`列挙型に準拠。指定がない場合、プロンプトから項目を削除。 |
| `context` | Object | はい | 状況に関する情報。 |
| `context.current_time` | String | はい | 現在時刻 (ISO 8601形式)。 |

**リクエストボディのバリデーション**:
必須項目が欠落している場合や、各パラメータが指定された型・範囲・列挙型に準拠していない場合は、HTTPステータスコード `400 Bad Request` と共に、エラー詳細を含むJSONを返却します。

### 3.3. レスポンス仕様

#### 3.3.1. ストリーミングレスポンス (`HTTP 200 OK`)

本APIは、`Server-Sent Events (SSE)` を用いたストリーミング形式でレスポンスを返却し、クライアントにリアルタイムで処理状況を伝達します。

**イベントストリームの例:**

```text
event: status_update
data: {"message": "ユーザー情報から駅候補を検索中...", "step": "STATION_SEARCH"}

event: status_update
data: {"message": "候補駅を特定しました: 渋谷駅, 新宿駅", "step": "STATION_IDENTIFIED", "stations": ["渋谷駅", "新宿駅"]}

event: research_update
data: {"message": "渋谷駅の調査を開始...", "station": "渋谷駅", "status": "IN_PROGRESS"}

# ... 中間イベント ...

event: research_complete
data: {"message": "渋谷駅の調査が完了しました。", "station": "渋谷駅", "status": "COMPLETED"}

event: final_report
data: { ... (最終的なJSONレスポンス) ... }

event: stream_end
data: {"message": "処理が完了しました。"}
```

#### 3.3.2. 最終データ構造 (`final_report`イベントの`data`)

```json
{
  "status": "complete",
  "research_quality": 1.0,
  "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "recommendations": [{
    "rank": 1,
    "station_info": {
      "name": "渋谷駅",
      "distance_from_user_m": 2300,
      "travel_time_min": 8
    },
    "activities": [{
      "category": "お茶・カフェ",
      "venues": [{
        "name": "スターバックス SHIBUYA TSUTAYA店",
        "rating": 4.2,
        "price_range": "¥500-1500",
        "crowd_level": "high",
        "operating_hours": "07:00-23:00",
        "walking_time_min": 1
      }]
    }],
    "overall_score": 8.7,
    "recommendation_reason": "ご希望のカフェやショッピングの選択肢が豊富で、ユーザーの現在地からのアクセスも良好です。",
    "estimated_total_cost": "¥1500-4500"
  }]
}
```

**`status`**: `"complete"` | `"partial"` | `"failed"`
**`research_quality`**: 調査対象駅のうち、正常に調査完了した駅の割合 (例: 10駅中9駅成功なら0.9)。

#### 3.3.3. エラーレスポンス

エラー発生時は、HTTPステータスコードで大別し、ボディに共通フォーマットのJSONを返します。

**共通エラーフォーマット**

```json
{
    "success": false,
    "error_code": "VALIDATION_ERROR",
    "message": "リクエストの形式が不正です。",
    "detail": "Field 'latitude' must be between -90 and 90.",
    "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "timestamp": "2025-06-29T14:35:00+09:00"
}
```

**HTTPステータスコード**
| コード | 説明 | エラーコード例 |
| :--- | :--- | :--- |
| `400 Bad Request` | バリデーションエラー | `VALIDATION_ERROR` |
| `502 Bad Gateway` | 外部API（Google Places, Gemini）の障害 | `EXTERNAL_API_ERROR` |
| `503 Service Unavailable` | システム内部エラー、または全駅調査失敗 | `SERVICE_UNAVAILABLE` |
| `504 Gateway Timeout` | 処理タイムアウト | `GATEWAY_TIMEOUT` |

## 4\. 機能仕様詳細

本システムの中核機能は、LangGraphを用いて構築された複数のエージェントが協調して動作するワークフローとして実現します。

### 4.1. 全体ワークフロー

**[APIリクエスト]** -\> **[Coordinator]** -\> **(並列実行)** -\> **[Station Research Graph (駅1)]**
\-\> **[Station Research Graph (駅2)]**
\-\> **...**
\-\> **[Final Aggregator Agent]** -\> **[ストリーミングレスポンス]**

### 4.2. Coordinator

リクエストを受け取り、全体の処理フローを管理します。

1.  **駅候補の特定**:
    1.  **近傍駅検索**: Google Places API (`type: "train_station"`)を使い、`user_location`と`search_radius_km`内の駅を`max_stations`件まで取得。
    2.  **大都市検索**: ハードコードされた主要49駅リストから、ユーザーに最も近い駅を特定。
    3.  **統合**: 上記2つのリストを統合し、重複を排除して最終的な調査対象駅リストを生成。
2.  **並列実行の開始**: 特定した各駅に対して、「Station Research Graph」を非同期かつ並列で起動します。

### 4.3. Station Research Graph

各駅の推薦情報を自律的に調査・生成するLangGraphステートマシンです。

#### 4.3.1. 状態 (State)

```python
from typing import List, Dict
from typing_extensions import TypedDict

class StationResearchState(TypedDict):
    station_name: str
    user_preferences: Dict # 人数、希望アクティビティ、予算など
    search_queries: List[str] # 生成された検索クエリ
    venue_results: List[Dict] # ツールが返した店舗・施設情報
    critique: str # 検索結果に対する評価
    summary: Dict # この駅に関する最終的な推薦情報
```

#### 4.3.2. ツール (Tools)

  - **`google_places_search_tool`**:
      - **入力**: 検索クエリ文字列 (例: "渋谷駅周辺 おしゃれなカフェ 2名")
      - **処理**: Google Places APIのText Searchを実行し、店舗情報をリストで返します。

#### 4.3.3. ノード (Nodes) とプロンプト例

各ノードは、Gemini APIを呼び出すエージェントとして機能します。

1.  **`query_generator_node` (検索クエリ生成)**: ユーザーの希望に基づき、検索クエリを生成します。

\<details\>
\<summary\>プロンプト例\</summary\>

```
あなたは優秀なアシスタントです。以下の条件に最も合致する店舗や施設を見つけるための、Google Places APIで有効な検索クエリを3つ生成してください。

# 条件
- 駅名: {station_name}
- 人数: {group_info.member_count}人
- 希望アクティビティ: {group_info.member_moods}
- 予算帯: {group_info.budget_range}
- 現在時刻: {context.current_time}

# 出力形式 (JSON配列)
["クエリ1", "クエリ2", "クエリ3"]
```

\</details\>

2.  **`search_executor_node` (検索実行)**: 生成されたクエリをツールに渡して実行します。

3.  **`critique_node` (結果評価)**: 検索結果が十分か評価し、追加調査が必要か判断します。

\<details\>
\<summary\>プロンプト例\</summary\>

```
あなたは鋭い批評家です。以下のユーザーの希望と検索結果を比較し、情報が十分か、それとも追加の調査が必要か判断してください。
追加調査が必要な場合は、どのような情報が不足しているか、次に行うべきアクションを具体的に指示してください。
情報が十分な場合は、「COMPLETE」とだけ応答してください。

# ユーザーの希望
- 人数: {group_info.member_count}人
- 希望アクティビティ: {group_info.member_moods}
- 予算帯: {group_info.budget_range}

# 検索結果
{venue_results}

# あなたの評価と指示
```

\</details\>

4.  **`summary_generator_node` (駅別サマリー生成)**: 十分な情報が集まった後、駅ごとのおすすめプランをJSONで生成します。

\<details\>
\<summary\>プロンプト例\</summary\>

```
あなたは旅行プランナーです。以下のユーザーの希望と、収集した店舗・施設情報に基づいて、この駅でのおすすめプランを提案してください。
提案は必ず指定のJSON形式で出力してください。

# ユーザーの希望
- 人数: {group_info.member_count}人
- 希望アクティビティ: {group_info.member_moods}

# 収集した情報
{venue_results}

# 出力形式 (JSON)
{
  "activities": [{
    "category": "お茶・カフェ|軽く飲み|...",
    "venues": [{
      "name": "店舗名",
      "rating": 4.2,
      "price_range": "¥500-1500",
      "crowd_level": "low|medium|high",
      "operating_hours": "07:00-23:00",
      "walking_time_min": 3
    }]
  }]
}
```

\</details\>

#### 4.3.4. エッジ (Edges)

  - **`should_continue_edge` (継続/終了判定)**:
      - `critique_node`の出力が「COMPLETE」以外の場合、`query_generator_node`に戻りサイクルを継続します。
      - 「COMPLETE」の場合、`summary_generator_node`に進みます。

### 4.4. Final Aggregator Agent (最終集約エージェント)

全ての駅の調査完了後、最終的なランキングと推薦理由を生成します。

\<details\>
\<summary\>プロンプト例\</summary\>

```
あなたは最終意思決定者です。以下のユーザー情報と、各駅の調査結果を総合的に判断し、最もおすすめの駅をランキング形式で決定してください。
`overall_score`は10点満点、`recommendation_reason`は決定理由を簡潔に記述してください。
最終的な出力は指定されたJSON形式に厳密に従ってください。

# ユーザー情報
- 現在地からの距離と移動時間: {station_distances}
- 希望: {group_info}

# 各駅の調査結果
{all_station_summaries}

# 出力形式 (JSON)
{
  "recommendations": [{
    "rank": 1,
    "station_info": { ... },
    "activities": [ ... ],
    "overall_score": 8.7,
    "recommendation_reason": "理由...",
    "estimated_total_cost": "¥1500-4500"
  }, { ... }]
}
```

\</details\>

## 5\. データ仕様とバリデーション

| 項目 | データ型/フォーマット | バリデーションルール |
| :--- | :--- | :--- |
| `latitude` / `longitude` | Number (Float) | 小数点以下6桁に丸める。緯度は-90〜90, 経度は-180〜180の範囲内。 |
| `distance_from_user_m` | Integer | 整数値。 |
| `travel_time_min` | Integer | 整数値。 |
| `overall_score` | Number (Float) | 小数点以下1桁。 |
| `member_moods` | Array[`ActivityType`] | `ActivityType`列挙型に含まれる値のみ許可。 |
| `category` | `ActivityType` | `ActivityType`列挙型に含まれる値のみ許可。 |
| `budget_range` | `BudgetRange` | `BudgetRange`列挙型に準拠した文字列形式 "¥min-max"。 |
| `crowd_level` | String | `"low"`, `"medium"`, `"high"` のいずれか。 |

## 6\. 非機能要件

### 6.1. 距離計算

  - **手法**: `geopy`ライブラリの`geodesic`関数を使用。
  - **精度**: WGS-84測地系に基づいた高精度な測地線距離を計算します。

### 6.2. 障害耐性・フォールバック

| コンポーネント | 障害内容 | 対応方針 |
| :--- | :--- | :--- |
| **Google Places API** | タイムアウト、APIキーエラー、サービス停止 | 該当APIからの駅情報取得をスキップし、エラーログを出力。大都市リストのみで処理を継続、または`502 Bad Gateway`を返します。 |
| **Gemini API** | 一部の駅調査で失敗 | 失敗した駅を除外し、成功した駅の結果のみで最終推薦を生成。レスポンスの`status`を`"partial"`とし、`research_quality`スコアを低下させます。 |
| | 全ての駅調査で失敗 | 処理を中断し、`503 Service Unavailable`を返します。 |
| **Redis** | サービス停止 | キャッシュ機能なしで動作を継続します。性能は低下しますが、サービス提供は維持し、エラーログを出力します。 |

### 6.3. キャッシュ戦略

| キャッシュ対象 | キー | 有効期間 (TTL) | 説明 |
| :--- | :--- | :--- | :--- |
| **駅ごとのDeep Research結果** | `station_name` + `normalized_params_hash` | 1時間 | 特定の駅に対する調査結果をキャッシュし、同一条件での再調査を回避します。 |
| **最終推薦結果** | `request_body_hash` | 30分 | 全く同じリクエストに対する最終結果をキャッシュし、即時応答を可能にします。 |

### 6.4. 同時実行制御とタイムアウト

| パラメータ | 設定ファイル | デフォルト値 | 説明 |
| :--- | :--- | :--- | :--- |
| `MAX_CONCURRENT_RESEARCH` | `config.py` | 4 | Station Research Graphの最大同時実行数。セマフォで制御。 |
| `RESEARCH_TIMEOUT_SECONDS` | `config.py` | 300 | 駅ごとの調査処理全体のタイムアウト（秒）。 |

## 7\. 付録

### 7.1. 列挙型 (Enum) 定義

#### 7.1.1. `ActivityType`

  - お茶・カフェ
  - 軽く飲み
  - 散歩・ぶらぶら
  - ショッピング
  - 映画
  - 軽食・ランチ

#### 7.1.2. `BudgetRange`

  - ¥0-1500
  - ¥1500-4500
  - ¥4500-8000
  - ¥8000+

### 7.2. 大都市リスト

政令指定都市および東京23区の主要駅、計49駅をシステム内に固定リストとして保持します（駅名の具体例: 東京駅, 新宿駅, 渋谷駅, 横浜駅, 大阪駅, 名古屋駅, 札幌駅, 福岡駅など。詳細は別途リストで管理）。