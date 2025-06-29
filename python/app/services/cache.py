import json
import asyncio
import logging
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

import redis.asyncio as redis
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis キャッシュサービス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.redis_client: Optional[redis.Redis] = None
        self._connection_lock = asyncio.Lock()
        
    async def _get_client(self) -> redis.Redis:
        """Redis クライアントを取得（遅延初期化）"""
        if self.redis_client is None:
            async with self._connection_lock:
                if self.redis_client is None:
                    try:
                        self.redis_client = redis.from_url(
                            self.settings.redis_url,
                            encoding="utf-8",
                            decode_responses=True,
                            retry_on_timeout=True,
                            socket_connect_timeout=5,
                            socket_timeout=5
                        )
                        # 接続テスト
                        await self.redis_client.ping()
                        logger.info("Redis connection established")
                    except Exception as e:
                        logger.error(f"Failed to connect to Redis: {e}")
                        # Redis接続失敗時はNoneのままにして、メモリキャッシュフォールバックを使用
                        pass
        
        return self.redis_client
    
    def _generate_cache_key(self, prefix: str, identifier: str) -> str:
        """キャッシュキーを生成"""
        # identifierをハッシュ化して一意なキーを作成
        hash_object = hashlib.md5(identifier.encode())
        hash_hex = hash_object.hexdigest()
        return f"recommendations:{prefix}:{hash_hex}"
    
    async def get_station_search_cache(
        self,
        lat: float,
        lon: float,
        radius_km: int,
        max_stations: int
    ) -> Optional[List[Dict[str, Any]]]:
        """駅検索結果のキャッシュを取得"""
        
        try:
            client = await self._get_client()
            if client is None:
                return None
            
            # キャッシュキー生成
            identifier = f"stations:{lat:.6f}:{lon:.6f}:{radius_km}:{max_stations}"
            cache_key = self._generate_cache_key("station_search", identifier)
            
            # キャッシュから取得
            cached_data = await client.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                logger.info(f"Station search cache hit: {cache_key}")
                return data.get("stations")
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting station search cache: {e}")
            return None
    
    async def set_station_search_cache(
        self,
        lat: float,
        lon: float,
        radius_km: int,
        max_stations: int,
        stations: List[Dict[str, Any]]
    ) -> None:
        """駅検索結果をキャッシュ"""
        
        try:
            client = await self._get_client()
            if client is None:
                return
            
            # キャッシュキー生成
            identifier = f"stations:{lat:.6f}:{lon:.6f}:{radius_km}:{max_stations}"
            cache_key = self._generate_cache_key("station_search", identifier)
            
            # データ準備
            cache_data = {
                "stations": stations,
                "cached_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(seconds=self.settings.station_cache_ttl)).isoformat()
            }
            
            # キャッシュに保存
            await client.setex(
                cache_key,
                self.settings.station_cache_ttl,
                json.dumps(cache_data, ensure_ascii=False)
            )
            
            logger.info(f"Station search cached: {cache_key}")
            
        except Exception as e:
            logger.error(f"Error setting station search cache: {e}")
    
    async def get_research_cache(
        self,
        station_name: str,
        activity_types: List[str],
        member_count: int,
        budget_range: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """駅調査結果のキャッシュを取得"""
        
        try:
            client = await self._get_client()
            if client is None:
                return None
            
            # キャッシュキー生成
            identifier = f"research:{station_name}:{':'.join(sorted(activity_types))}:{member_count}:{budget_range or 'none'}"
            cache_key = self._generate_cache_key("station_research", identifier)
            
            # キャッシュから取得
            cached_data = await client.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                logger.info(f"Research cache hit: {cache_key}")
                return data.get("research_result")
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting research cache: {e}")
            return None
    
    async def set_research_cache(
        self,
        station_name: str,
        activity_types: List[str],
        member_count: int,
        budget_range: Optional[str],
        research_result: Dict[str, Any]
    ) -> None:
        """駅調査結果をキャッシュ"""
        
        try:
            client = await self._get_client()
            if client is None:
                return
            
            # キャッシュキー生成
            identifier = f"research:{station_name}:{':'.join(sorted(activity_types))}:{member_count}:{budget_range or 'none'}"
            cache_key = self._generate_cache_key("station_research", identifier)
            
            # データ準備
            cache_data = {
                "research_result": research_result,
                "cached_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(seconds=self.settings.station_cache_ttl)).isoformat()
            }
            
            # キャッシュに保存
            await client.setex(
                cache_key,
                self.settings.station_cache_ttl,
                json.dumps(cache_data, ensure_ascii=False)
            )
            
            logger.info(f"Research result cached: {cache_key}")
            
        except Exception as e:
            logger.error(f"Error setting research cache: {e}")
    
    async def get_final_recommendations_cache(
        self,
        request_hash: str
    ) -> Optional[List[Dict[str, Any]]]:
        """最終推薦結果のキャッシュを取得"""
        
        try:
            client = await self._get_client()
            if client is None:
                return None
            
            cache_key = self._generate_cache_key("final_recommendations", request_hash)
            
            # キャッシュから取得
            cached_data = await client.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                logger.info(f"Final recommendations cache hit: {cache_key}")
                return data.get("recommendations")
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting final recommendations cache: {e}")
            return None
    
    async def set_final_recommendations_cache(
        self,
        request_hash: str,
        recommendations: List[Dict[str, Any]]
    ) -> None:
        """最終推薦結果をキャッシュ"""
        
        try:
            client = await self._get_client()
            if client is None:
                return
            
            cache_key = self._generate_cache_key("final_recommendations", request_hash)
            
            # データ準備
            cache_data = {
                "recommendations": recommendations,
                "cached_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(seconds=self.settings.final_result_cache_ttl)).isoformat()
            }
            
            # キャッシュに保存
            await client.setex(
                cache_key,
                self.settings.final_result_cache_ttl,
                json.dumps(cache_data, ensure_ascii=False)
            )
            
            logger.info(f"Final recommendations cached: {cache_key}")
            
        except Exception as e:
            logger.error(f"Error setting final recommendations cache: {e}")
    
    async def invalidate_cache_pattern(self, pattern: str) -> int:
        """パターンマッチングでキャッシュを無効化"""
        
        try:
            client = await self._get_client()
            if client is None:
                return 0
            
            # パターンマッチングでキーを検索
            keys = await client.keys(f"recommendations:{pattern}*")
            
            if keys:
                # 一括削除
                deleted_count = await client.delete(*keys)
                logger.info(f"Invalidated {deleted_count} cache entries with pattern: {pattern}")
                return deleted_count
            
            return 0
            
        except Exception as e:
            logger.error(f"Error invalidating cache pattern {pattern}: {e}")
            return 0
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """キャッシュ統計情報を取得"""
        
        try:
            client = await self._get_client()
            if client is None:
                return {"status": "disconnected", "error": "Redis not available"}
            
            # Redis情報を取得
            info = await client.info()
            
            # 関連するキーの数を取得
            station_keys = await client.keys("recommendations:station_search:*")
            research_keys = await client.keys("recommendations:station_research:*")
            final_keys = await client.keys("recommendations:final_recommendations:*")
            
            stats = {
                "status": "connected",
                "memory_usage": info.get("used_memory_human", "N/A"),
                "total_keys": info.get("db0", {}).get("keys", 0),
                "cache_keys": {
                    "station_search": len(station_keys),
                    "station_research": len(research_keys),
                    "final_recommendations": len(final_keys)
                },
                "uptime_seconds": info.get("uptime_in_seconds", 0)
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"status": "error", "error": str(e)}
    
    async def health_check(self) -> bool:
        """キャッシュサービスのヘルスチェック"""
        
        try:
            client = await self._get_client()
            if client is None:
                return False
            
            # ping テスト
            response = await client.ping()
            return response == True
            
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return False
    
    async def close(self) -> None:
        """接続を閉じる"""
        
        if self.redis_client:
            try:
                await self.redis_client.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.error(f"Error closing Redis connection: {e}")
            finally:
                self.redis_client = None


# グローバルインスタンス
_cache_service: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    """キャッシュサービスのシングルトンインスタンスを取得"""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service