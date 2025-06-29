from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.middleware import (
    RequestLoggingMiddleware, 
    APIKeyAuthMiddleware,
    RateLimitMiddleware,
    ErrorHandlingMiddleware,
    SecurityHeadersMiddleware
)
from app.core.exceptions import APIException, api_exception_handler, general_exception_handler
from app.api import recommendations, health
import logging

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時の処理
    setup_logging(json_logs=True)
    logger.info("Application startup")
    
    yield
    
    # 終了時の処理
    logger.info("Application shutdown")


# FastAPIアプリケーションの作成
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# ミドルウェアの追加（追加順序が重要 - 逆順で実行される）
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)
app.add_middleware(APIKeyAuthMiddleware, required_paths=["/recommendations"])
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 例外ハンドラの登録
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# ルーターの登録
app.include_router(
    recommendations.router,
    prefix="/recommendations",
    tags=["recommendations"]
)

app.include_router(
    health.router,
    tags=["health", "monitoring"]
)

# ルートエンドポイント
@app.get("/", tags=["root"])
async def root():
    """ルートエンドポイント"""
    return {
        "message": "位置情報ベース おすすめアクティビティ推薦API",
        "version": settings.api_version,
        "docs": "/docs"
    }