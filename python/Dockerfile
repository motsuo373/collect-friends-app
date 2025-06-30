FROM python:3.11-slim

# 作業ディレクトリの設定
WORKDIR /app

# 必要なシステムパッケージのインストール
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 依存関係のコピーとインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY app/ ./app/

# Cloud Run用の環境変数設定（デフォルト値）
ENV HOST=0.0.0.0

# ポート公開（Cloud Runが自動的にPORTを設定）
EXPOSE 8080

# ヘルスチェック（Cloud Run用に調整）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# アプリケーション起動（Cloud Run用に最適化）
CMD exec uvicorn app.main:app --host $HOST --port $PORT --workers 1