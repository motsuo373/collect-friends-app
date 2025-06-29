import time
import uuid
import logging
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.status import HTTP_429_TOO_MANY_REQUESTS, HTTP_401_UNAUTHORIZED

from app.core.config import get_settings
from app.core.exceptions import RateLimitExceeded, APIKeyRequired

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """リクエスト・レスポンスロギングミドルウェア"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # リクエストIDを生成
        request_id = str(uuid.uuid4())
        
        # リクエスト開始時刻
        start_time = time.time()
        
        # リクエスト情報をログ
        logger.info(
            f"Request started: {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "user_agent": request.headers.get("user-agent"),
                "client_host": request.client.host if request.client else None,
            }
        )
        
        try:
            # リクエストIDをstate に設定
            request.state.request_id = request_id
            
            # 次のミドルウェア/エンドポイントを呼び出し
            response = await call_next(request)
            
            # 処理時間を計算
            duration_ms = (time.time() - start_time) * 1000
            
            # レスポンス情報をログ
            logger.info(
                f"Request completed: {request.method} {request.url.path}",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "response_size": len(response.body) if hasattr(response, 'body') else None,
                }
            )
            
            # レスポンスヘッダーにリクエストIDを追加
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # エラー時の処理時間を計算
            duration_ms = (time.time() - start_time) * 1000
            
            # エラーログ
            logger.error(
                f"Request failed: {request.method} {request.url.path}",
                extra={
                    "request_id": request_id,
                    "duration_ms": round(duration_ms, 2),
                    "error_type": type(e).__name__,
                },
                exc_info=True
            )
            
            # エラーレスポンスを返す
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "request_id": request_id,
                    "message": "予期しないエラーが発生しました"
                },
                headers={"X-Request-ID": request_id}
            )


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """API キー認証ミドルウェア"""
    
    def __init__(self, app, required_paths: list = None):
        super().__init__(app)
        self.settings = get_settings()
        self.required_paths = required_paths or ["/recommendations"]
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 認証が必要なパスかチェック
        path = request.url.path
        requires_auth = any(path.startswith(required_path) for required_path in self.required_paths)
        
        if not requires_auth:
            return await call_next(request)
        
        # ヘルスチェックエンドポイントは除外
        if path in ["/health", "/metrics"]:
            return await call_next(request)
        
        # API キーをヘッダーから取得
        api_key_header = self.settings.api_key_header
        provided_key = request.headers.get(api_key_header)
        
        if not provided_key:
            logger.warning(
                f"API key missing for {path}",
                extra={
                    "request_id": getattr(request.state, "request_id", None),
                    "client_host": request.client.host if request.client else None,
                }
            )
            return JSONResponse(
                status_code=HTTP_401_UNAUTHORIZED,
                content={
                    "error": "API Key Required",
                    "message": f"APIキーが必要です。{api_key_header}ヘッダーにAPIキーを設定してください。"
                }
            )
        
        # TODO: 実際のAPIキー検証ロジックを実装
        # 現在は環境変数のAPIキーと比較
        expected_key = self.settings.google_api_key  # 仮実装
        
        if provided_key != expected_key:
            logger.warning(
                f"Invalid API key for {path}",
                extra={
                    "request_id": getattr(request.state, "request_id", None),
                    "client_host": request.client.host if request.client else None,
                    "provided_key_prefix": provided_key[:8] + "..." if len(provided_key) > 8 else provided_key,
                }
            )
            return JSONResponse(
                status_code=HTTP_401_UNAUTHORIZED,
                content={
                    "error": "Invalid API Key",
                    "message": "無効なAPIキーです。"
                }
            )
        
        # 認証成功
        logger.debug(
            f"API key authentication successful for {path}",
            extra={
                "request_id": getattr(request.state, "request_id", None),
            }
        )
        
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """レートリミットミドルウェア"""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_timestamps = {}  # {client_ip: [timestamps]}
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # クライアントIPを取得
        client_ip = request.client.host if request.client else "unknown"
        
        # 現在時刻
        current_time = time.time()
        
        # クライアントのリクエスト履歴を取得
        if client_ip not in self.request_timestamps:
            self.request_timestamps[client_ip] = []
        
        timestamps = self.request_timestamps[client_ip]
        
        # 1分以内のリクエストのみを保持
        one_minute_ago = current_time - 60
        timestamps[:] = [t for t in timestamps if t > one_minute_ago]
        
        # レートリミットチェック
        if len(timestamps) >= self.requests_per_minute:
            logger.warning(
                f"Rate limit exceeded for {client_ip}",
                extra={
                    "request_id": getattr(request.state, "request_id", None),
                    "client_host": client_ip,
                    "requests_in_minute": len(timestamps),
                    "rate_limit": self.requests_per_minute,
                }
            )
            
            return JSONResponse(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate Limit Exceeded",
                    "message": f"リクエスト制限を超過しました。1分間に{self.requests_per_minute}リクエストまでです。",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        # 現在のリクエストを記録
        timestamps.append(current_time)
        
        return await call_next(request)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """エラーハンドリングミドルウェア"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except RateLimitExceeded as e:
            return JSONResponse(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate Limit Exceeded",
                    "message": str(e),
                    "retry_after": 60
                }
            )
        except APIKeyRequired as e:
            return JSONResponse(
                status_code=HTTP_401_UNAUTHORIZED,
                content={
                    "error": "API Key Required",
                    "message": str(e)
                }
            )
        except Exception as e:
            request_id = getattr(request.state, "request_id", "unknown")
            
            logger.error(
                f"Unhandled exception in {request.method} {request.url.path}",
                extra={
                    "request_id": request_id,
                    "error_type": type(e).__name__,
                },
                exc_info=True
            )
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "message": "サーバー内部エラーが発生しました",
                    "request_id": request_id
                }
            )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """セキュリティヘッダーを追加するミドルウェア"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # セキュリティヘッダーを追加
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response