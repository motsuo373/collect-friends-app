from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # API設定
    api_title: str = "位置情報ベース おすすめアクティビティ推薦API"
    api_version: str = "2.0.0"
    api_description: str = "ユーザーの現在位置と条件に基づき、最適な駅周辺の店舗や施設を推薦"
    
    # Google API設定
    google_api_key: str
    gemini_api_key: str
    gemini_model: str = "gemini-1.5-pro"
    gemini_temperature: float = 0.7
    gemini_top_p: float = 0.95
    
    # Redis設定
    redis_url: str = "redis://localhost:6379/0"
    
    # 同時実行制御
    max_concurrent_research: int = 4
    research_timeout_seconds: int = 300
    
    # API認証
    api_key_header: str = "X-API-KEY"
    
    # CORS設定
    cors_origins: Union[str, List[str]] = ["*"]
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            # カンマ区切りの文字列の場合
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # ログ設定
    log_level: str = "INFO"
    
    # キャッシュTTL（秒）
    station_cache_ttl: int = 3600  # 1時間
    final_result_cache_ttl: int = 1800  # 30分
    
    # 検索設定デフォルト値
    default_search_radius_km: int = 10
    default_max_stations: int = 20
    
    # レート制限
    google_places_rate_limit: int = 50  # requests per second
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra='ignore'
    )


@lru_cache()
def get_settings() -> Settings:
    """
    設定のシングルトンインスタンスを返す
    """
    return Settings()