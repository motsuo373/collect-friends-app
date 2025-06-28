import os
from functools import lru_cache
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # API設定
    API_VERSION: str = os.getenv("API_VERSION", "v1")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Vertex AI Gemini API
    GOOGLE_GENAI_USE_VERTEXAI: bool = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    GOOGLE_CLOUD_LOCATION: str = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    
    # 旧Gemini API（レガシーサポート）
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # 検索設定
    DEFAULT_SEARCH_RADIUS_KM: float = float(os.getenv("DEFAULT_SEARCH_RADIUS_KM", "10"))
    MAX_STATIONS_PER_REQUEST: int = int(os.getenv("MAX_STATIONS_PER_REQUEST", "20"))
    MAX_RESEARCH_LOOPS: int = int(os.getenv("MAX_RESEARCH_LOOPS", "3"))
    
    # 外部API
    GOOGLE_PLACES_API_KEY: str = os.getenv("GOOGLE_PLACES_API_KEY", "")
    
    # Redis設定
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
    
    # 並列処理
    MAX_CONCURRENT_RESEARCH: int = int(os.getenv("MAX_CONCURRENT_RESEARCH", "4"))
    RESEARCH_TIMEOUT_SECONDS: int = int(os.getenv("RESEARCH_TIMEOUT_SECONDS", "30"))
    
    # 大都市リスト
    MAJOR_CITIES: Dict[str, List[str]] = {
        "関東": ["新宿", "渋谷", "池袋", "品川", "東京", "上野", "浅草", "横浜", "川崎", "大宮"],
        "関西": ["大阪", "梅田", "難波", "天王寺", "京都", "神戸", "三宮"],
        "中部": ["名古屋", "栄", "金山", "静岡", "浜松"],
        "九州": ["博多", "天神", "小倉", "熊本", "鹿児島"]
    }
    
    # 研究プロンプトテンプレート
    RESEARCH_PROMPT_TEMPLATE: str = """
駅名: {station_name}
人数: {member_count}名
希望活動: {activity_types}
予算: {budget_range}
時間: {current_time}

以下の情報を詳細に調査してください：

1. 営業時間・定休日情報
2. 価格帯・コストパフォーマンス
3. 現在の混雑状況・待ち時間
4. アクセス方法・徒歩時間
5. {member_count}名グループに適した店舗・施設
6. 雨天時の対応可能性
7. リアルタイムの特別情報（イベント、セール等）

調査対象カテゴリ: {activity_types}
重点調査項目: グループサイズ{member_count}名に最適な選択肢

JSONフォーマットで回答してください。各店舗に以下の情報を含めてください：
- name: 店舗名
- rating: 評価（0-5）
- price_range: 価格帯
- crowd_level: 混雑度（low/medium/high）
- operating_hours: 営業時間
- walking_time_min: 駅からの徒歩時間（分）
- special_features: 特徴リスト
- real_time_info: リアルタイム情報
"""
    
    @property
    def all_major_cities(self) -> List[str]:
        """全ての大都市駅名を取得"""
        all_cities = []
        for region_cities in self.MAJOR_CITIES.values():
            all_cities.extend(region_cities)
        return all_cities


@lru_cache()
def get_settings() -> Settings:
    return Settings()