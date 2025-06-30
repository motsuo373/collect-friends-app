from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from app.config import get_settings
from app.api.endpoints import recommendations
from app.services.cache import cache_service


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時
    print("Starting up...")
    # Redis接続を一時的に無効化してテスト
    # await cache_service.connect()
    print("Redis connection temporarily disabled for debugging")
    
    yield
    
    # 終了時
    print("Shutting down...")
    # await cache_service.disconnect()


# FastAPIアプリケーションの作成
app = FastAPI(
    title="位置情報ベースアクティビティ推奨システム",
    description="位置情報とユーザーの状況を基に最適なアクティビティを推奨するAPI",
    version="1.0.0",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限すること
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ルーターの登録
app.include_router(recommendations.router)


# ルートエンドポイント
@app.get("/")
async def root():
    """APIのルートエンドポイント"""
    return {
        "message": "位置情報ベースアクティビティ推奨システムAPI",
        "version": "1.0.0",
        "endpoints": {
            "recommendations": f"/api/{settings.API_VERSION}/activity-recommendations",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }


# ヘルスチェックエンドポイント
@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    # Redis依存を一時的に無効化してテスト
    # redis_health = await cache_service.health_check()
    
    return {
        "status": "healthy",
        "version": "1.0.0",
        "redis": {"status": "disabled_for_debug"},
        "message": "Application is running"
    }


# エラーハンドラー
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """404エラーハンドラー"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"Path {request.url.path} not found"
        }
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """500エラーハンドラー"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred"
        }
    )


if __name__ == "__main__":
    # 開発用サーバー起動
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )