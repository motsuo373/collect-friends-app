from fastapi import APIRouter, Depends
from typing import Dict, Any
import asyncio
import logging

from app.core.config import get_settings
from app.services.cache import get_cache_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """基本ヘルスチェック"""
    settings = get_settings()
    return {
        "status": "healthy",
        "service": "recommendations-api",
        "version": settings.api_version
    }


@router.get("/health/detailed", tags=["health"])
async def detailed_health_check() -> Dict[str, Any]:
    """詳細ヘルスチェック"""
    settings = get_settings()
    cache_service = get_cache_service()
    
    # 各コンポーネントのヘルスチェック
    health_status = {
        "status": "healthy",
        "service": "recommendations-api",
        "version": settings.api_version,
        "components": {}
    }
    
    # Redis接続チェック
    try:
        redis_healthy = await cache_service.health_check()
        health_status["components"]["redis"] = {
            "status": "healthy" if redis_healthy else "unhealthy",
            "url": settings.redis_url
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        health_status["components"]["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Google API設定チェック
    health_status["components"]["google_api"] = {
        "status": "configured" if settings.google_api_key else "missing",
        "has_key": bool(settings.google_api_key)
    }
    
    # Gemini API設定チェック
    health_status["components"]["gemini_api"] = {
        "status": "configured" if settings.gemini_api_key else "missing",
        "has_key": bool(settings.gemini_api_key),
        "model": settings.gemini_model
    }
    
    # 全体ステータスの判定
    component_statuses = [comp.get("status") for comp in health_status["components"].values()]
    if any(status in ["unhealthy", "missing"] for status in component_statuses):
        health_status["status"] = "degraded"
    
    return health_status


@router.get("/metrics", tags=["monitoring"])
async def get_metrics() -> Dict[str, Any]:
    """メトリクス情報"""
    cache_service = get_cache_service()
    
    try:
        cache_stats = await cache_service.get_cache_stats()
        
        metrics = {
            "cache": cache_stats,
            "service": {
                "name": "recommendations-api",
                "uptime_check": "healthy"
            }
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        return {
            "error": "Failed to collect metrics",
            "message": str(e)
        }