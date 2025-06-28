import json
import hashlib
from typing import Optional, Any
import redis.asyncio as redis
from datetime import timedelta

from app.config import get_settings


class CacheService:
    """Redisを使用したキャッシュサービス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.redis = None
    
    async def connect(self):
        """Redis接続を初期化"""
        try:
            self.redis = redis.from_url(
                self.settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis.ping()
            print("Redis connection established")
        except Exception as e:
            print(f"Redis connection failed: {str(e)}")
            self.redis = None
    
    async def disconnect(self):
        """Redis接続を閉じる"""
        if self.redis:
            await self.redis.aclose()
    
    def _generate_cache_key(self, prefix: str, params: dict) -> str:
        """キャッシュキーを生成"""
        # パラメータを正規化してJSON文字列に変換
        params_str = json.dumps(params, sort_keys=True, ensure_ascii=False)
        
        # ハッシュ値を生成
        hash_value = hashlib.md5(params_str.encode()).hexdigest()
        
        return f"{prefix}:{hash_value}"
    
    async def get(self, key: str) -> Optional[Any]:
        """キャッシュから値を取得"""
        if not self.redis:
            return None
        
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {str(e)}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """キャッシュに値を設定"""
        if not self.redis:
            return False
        
        try:
            value_str = json.dumps(value, ensure_ascii=False)
            
            if ttl_seconds:
                await self.redis.setex(key, ttl_seconds, value_str)
            else:
                await self.redis.set(key, value_str)
            
            return True
        except Exception as e:
            print(f"Cache set error: {str(e)}")
            return False
    
    async def delete(self, key: str) -> bool:
        """キャッシュから値を削除"""
        if not self.redis:
            return False
        
        try:
            await self.redis.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {str(e)}")
            return False
    
    async def get_station_research(
        self,
        station_name: str,
        group_info_hash: str,
        activity_types_hash: str
    ) -> Optional[dict]:
        """駅の研究結果をキャッシュから取得"""
        key = self._generate_cache_key(
            "station_research",
            {
                "station": station_name,
                "group": group_info_hash,
                "activities": activity_types_hash
            }
        )
        
        return await self.get(key)
    
    async def set_station_research(
        self,
        station_name: str,
        group_info_hash: str,
        activity_types_hash: str,
        research_data: dict
    ) -> bool:
        """駅の研究結果をキャッシュに保存"""
        key = self._generate_cache_key(
            "station_research",
            {
                "station": station_name,
                "group": group_info_hash,
                "activities": activity_types_hash
            }
        )
        
        # 駅の研究結果は1時間キャッシュ
        return await self.set(key, research_data, self.settings.CACHE_TTL_SECONDS)
    
    async def get_recommendation_result(
        self,
        request_hash: str
    ) -> Optional[dict]:
        """推奨結果全体をキャッシュから取得"""
        key = f"recommendation:{request_hash}"
        return await self.get(key)
    
    async def set_recommendation_result(
        self,
        request_hash: str,
        result: dict
    ) -> bool:
        """推奨結果全体をキャッシュに保存"""
        key = f"recommendation:{request_hash}"
        
        # 推奨結果は30分キャッシュ
        return await self.set(key, result, 1800)


# シングルトンインスタンス
cache_service = CacheService()