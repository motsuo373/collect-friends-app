import json
import hashlib
import asyncio
from typing import Optional, Any
import redis.asyncio as redis
from datetime import timedelta

from app.config import get_settings


class CacheService:
    """Redisを使用したキャッシュサービス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.redis = None
        self.connection_retries = 0
        self.max_retries = 3
    
    async def connect(self):
        """Redis接続を初期化（失敗してもアプリケーション起動を停止しない）"""
        for attempt in range(self.max_retries):
            try:
                print(f"Attempting Redis connection (attempt {attempt + 1}/{self.max_retries})...")
                
                # 短いタイムアウトでRedis接続を試行
                self.redis = redis.from_url(
                    self.settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=5,  # 接続タイムアウト5秒
                    socket_timeout=3,          # 操作タイムアウト3秒
                    retry_on_timeout=True,
                    retry_on_error=[redis.ConnectionError, redis.TimeoutError],
                    max_connections=10
                )
                
                # 接続テスト（短いタイムアウトで）
                await asyncio.wait_for(self.redis.ping(), timeout=3)
                print(f"✅ Redis connection established successfully!")
                self.connection_retries = 0
                return
                
            except asyncio.TimeoutError:
                print(f"⏰ Redis connection timeout on attempt {attempt + 1}")
            except redis.ConnectionError as e:
                print(f"🔌 Redis connection error on attempt {attempt + 1}: {str(e)}")
            except Exception as e:
                print(f"❌ Redis connection failed on attempt {attempt + 1}: {str(e)}")
            
            # 失敗した場合はRedisをNoneに設定
            self.redis = None
            
            # 最後の試行でない場合は少し待つ
            if attempt < self.max_retries - 1:
                await asyncio.sleep(1)
        
        print(f"⚠️  Redis connection failed after {self.max_retries} attempts. Continuing without cache.")
        self.redis = None
    
    async def disconnect(self):
        """Redis接続を閉じる"""
        if self.redis:
            try:
                await self.redis.aclose()
                print("Redis connection closed")
            except Exception as e:
                print(f"Error closing Redis connection: {e}")
    
    async def health_check(self) -> dict:
        """Redis接続の健全性チェック"""
        if not self.redis:
            return {"status": "disconnected", "error": "No Redis connection"}
        
        try:
            await asyncio.wait_for(self.redis.ping(), timeout=1)
            return {"status": "connected", "latency": "healthy"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
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
            value = await asyncio.wait_for(self.redis.get(key), timeout=2)
            if value:
                return json.loads(value)
            return None
        except asyncio.TimeoutError:
            print(f"Cache get timeout for key: {key}")
            return None
        except Exception as e:
            print(f"Cache get error for key {key}: {str(e)}")
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
                await asyncio.wait_for(
                    self.redis.setex(key, ttl_seconds, value_str), 
                    timeout=2
                )
            else:
                await asyncio.wait_for(
                    self.redis.set(key, value_str), 
                    timeout=2
                )
            
            return True
        except asyncio.TimeoutError:
            print(f"Cache set timeout for key: {key}")
            return False
        except Exception as e:
            print(f"Cache set error for key {key}: {str(e)}")
            return False
    
    async def delete(self, key: str) -> bool:
        """キャッシュから値を削除"""
        if not self.redis:
            return False
        
        try:
            await asyncio.wait_for(self.redis.delete(key), timeout=2)
            return True
        except asyncio.TimeoutError:
            print(f"Cache delete timeout for key: {key}")
            return False
        except Exception as e:
            print(f"Cache delete error for key {key}: {str(e)}")
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