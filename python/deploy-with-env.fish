#!/usr/bin/env fish

# .envファイルから環境変数を読み込み
echo "🔧 .envファイルから環境変数を読み込み中..."

if not test -f .env
    echo "❌ .envファイルが見つかりません"
    exit 1
end

# .envファイルの各行を処理
for line in (cat .env | grep -v '^#' | grep -v '^$')
    # KEY=VALUE形式をパース
    set key_value (string split -m 1 '=' $line)
    if test (count $key_value) -eq 2
        set key $key_value[1]
        set value (string trim -c '"' $key_value[2])  # クォートを除去
        set -gx $key $value
        echo "  ✅ $key を設定しました"
    end
end

echo "🚀 deploy.shを実行中..."
./deploy.sh

echo "📅 setup-scheduler.shを実行中..."
./setup-scheduler.sh 