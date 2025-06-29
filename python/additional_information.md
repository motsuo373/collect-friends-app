# 追加情報まとめ

本プロジェクトを円滑に実装・運用するために **仕様書** と **実装手順書** 以外で必要となる情報をすべて列挙しました。欠落がある場合は追記してください。

---

## 1. 外部サービス・資格情報

| サービス                  | 必要情報                                                                          | 格納場所 / 管理方法                        |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------------------- |
| **Google Places API** | ‑ プロジェクト ID  <br> ‑ API Key  <br> ‑ 有効エンドポイント (Text Search)  <br> ‑ 毎日/秒間クォータ | Secrets Manager (`GOOGLE_API_KEY`) |
| **Gemini API**        | ‑ API Key <br> ‑ モデル名 (e.g. `gemini-1.5-pro`) <br> ‑ 温度/Top‑p 既定値             | Secrets Manager (`GEMINI_API_KEY`) |
| **Redis**             | ‑ 接続 URI  <br> ‑ パスワード (任意)                                                   | `REDIS_URL` (環境変数)                 |
| **CI /CD**            | ‑ レジストリ URL  <br> ‑ デプロイ用トークン                                                 | GitHub Actions Secret              |

> 🔐 **備考**: Vault or AWS Secrets Manager など、KMS で暗号化されたストレージに限定し、直接環境変数を書かない運用を徹底してください。

---

## 2. 大都市 49 駅リスト (固定リソース)

* **形式**: `csv` もしくは `json`
* **必須カラム**: `station_name`, `latitude`, `longitude`
* **保存場所**: `app/resources/major_stations.csv`

---

## 3. API 利用制限 & コスト管理

* **Google Places**

  * *秒間* レートリミット: **50 req/s** (プロジェクト側で設定)
  * 月額予算アラート: **USD 300**
* **Gemini**

  * Model Token 上限: **8M token/月**
  * Slack 通知: 残 20 % 以下で通知

---

## 4. SSE イベント型詳細

| event 名             | data スキーマ                                    | 備考                       |
| ------------------- | -------------------------------------------- | ------------------------ |
| `status_update`     | `{ message:str, step:str, [stations:list] }` | 進捗汎用                     |
| `research_update`   | `{ message:str, station:str, status:str }`   | IN\_PROGRESS / COMPLETED |
| `research_complete` | 同上                                           |                          |
| `final_report`      | `FinalReport` (仕様参照)                         | JSON 本体                  |
| `stream_end`        | `{ message:str }`                            | 常に最後に送出                  |

---

## 5. Enum 定義ファイル

* **`enums.py`** に下記を保持

  * `ActivityType` : 仕様書 7.1.1
  * `BudgetRange`  : 仕様書 7.1.2

---

## 6. 環境別設定 & Secrets 管理手順

1. **`.env.example`** をコミットして公開変数のみ定義。
2. **本番 / ステージング** では IaC (e.g. Terraform) で Secrets Manager に注入。
3. **ローカル** は各自 `.env` を作成し、`pre‑commit` で Git への誤コミットをブロック。

---

## 7. インフラ構成図

* **必須要素**: ALB → ECS(Fargate) → Redis (ElastiCache) → CloudWatch Logs
* **形式**: `drawio` / `mermaid`
* **保存場所**: `docs/architecture.drawio`

---

## 8. モニタリング & アラート設計

| 指標              | しきい値              | 通知先           |
| --------------- | ----------------- | ------------- |
| 5xx Rate        | > 1 % / 5 min     | Slack #alerts |
| 平均応答時間          | > 1500 ms / 5 min | Slack #alerts |
| Places API エラー率 | > 5 % / 1 h       | PagerDuty     |
| Redis 接続失敗      | > 3 回連続           | Slack #infra  |

---

## 9. フロントエンド連携仕様

* **CORS**: `https://example.com`, `https://staging.example.com`
* **SSE**: `EventSource` 利用例を README に掲載
* **タイムアウト**: FE で `60 s` 以上で設定

---

## 10. キャッシュキー詳細

```text
station:{station_name}:{params_hash}   # Deep Research 結果 (TTL 3600)
req:{request_body_hash}                # Final Report (TTL 1800)
```

---

## 11. テストデータセット

| 種別       | ファイル                            | 内容                |
| -------- | ------------------------------- | ----------------- |
| 正常系リクエスト | `tests/data/request_valid.json` | 仕様準拠サンプル          |
| 境界値リクエスト | `tests/data/request_edge.json`  | 緯度経度境界・enum外値     |
| モック検索結果  | `tests/data/places_mock.json`   | Places API 応答サンプル |

---

## 12. LLM プロンプト管理

* `research/prompts/` に `*.md` として保管
* **Versioning**: 変更時はファイルヘッダに `## vX.Y` を追記し Git 履歴を残す

---

## 13. セキュリティ要件

* OWASP Top 10 に対する対策ドキュメント (`docs/security.md`)
* FastAPI の `SecurityHeadersMiddleware` で `X‑Frame‑Options`, `Content‑Security‑Policy` 付与

---

## 14. SLA & 障害対応フロー

| 項目     | 値                                                          |
| ------ | ---------------------------------------------------------- |
| 稼働率    | 99.5 % / 月                                                 |
| RTO    | 60 min                                                     |
| RPO    | 15 min                                                     |
| 障害連絡窓口 | on‑call ローテーション: [ops@example.com](mailto:ops@example.com) |

---

## 15. バージョニング & マイグレーション

* **API**: Semantic Versioning (`v2.0.x` → `v2.1.0` など)
* **データ構造**の後方互換が崩れる場合は `/v3/` パスを追加
* **DB** (将来利用時): Alembic でマイグレーションスクリプトを管理

---

## 16. 参考リンク集

* Google Places 公式: [https://developers.google.com/maps/documentation/places/web-service/search](https://developers.google.com/maps/documentation/places/web-service/search)
* Gemini Docs: [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)
* LangGraph Guide: [https://python.langchain.com/docs/langgraph](https://python.langchain.com/docs/langgraph)
