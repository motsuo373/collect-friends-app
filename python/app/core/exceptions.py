from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from app.core.enums import ErrorCode
import logging

logger = logging.getLogger(__name__)


class APIException(HTTPException):
    """API共通例外クラス"""
    
    def __init__(
        self,
        status_code: int,
        error_code: ErrorCode,
        message: str,
        detail: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        self.error_code = error_code
        self.message = message
        self.detail = detail
        self.request_id = request_id
        super().__init__(status_code=status_code, detail=message)


class ValidationError(APIException):
    """バリデーションエラー"""
    
    def __init__(self, message: str, detail: Optional[str] = None, request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code=ErrorCode.VALIDATION_ERROR,
            message=message,
            detail=detail,
            request_id=request_id
        )


class ExternalAPIError(APIException):
    """外部APIエラー"""
    
    def __init__(self, message: str, detail: Optional[str] = None, request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code=ErrorCode.EXTERNAL_API_ERROR,
            message=message,
            detail=detail,
            request_id=request_id
        )


class ServiceUnavailableError(APIException):
    """サービス利用不可エラー"""
    
    def __init__(self, message: str, detail: Optional[str] = None, request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code=ErrorCode.SERVICE_UNAVAILABLE,
            message=message,
            detail=detail,
            request_id=request_id
        )


class TimeoutError(APIException):
    """タイムアウトエラー"""
    
    def __init__(self, message: str, detail: Optional[str] = None, request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            error_code=ErrorCode.GATEWAY_TIMEOUT,
            message=message,
            detail=detail,
            request_id=request_id
        )


class UnauthorizedError(APIException):
    """認証エラー"""
    
    def __init__(self, message: str = "Unauthorized", detail: Optional[str] = None, request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=ErrorCode.UNAUTHORIZED,
            message=message,
            detail=detail,
            request_id=request_id
        )


class RateLimitExceededError(APIException):
    """レート制限エラー"""
    
    def __init__(self, message: str = "Rate limit exceeded", detail: Optional[str] = None, request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            message=message,
            detail=detail,
            request_id=request_id
        )


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """APIException用のカスタムエラーハンドラ"""
    
    error_response = {
        "success": False,
        "error_code": exc.error_code.value,
        "message": exc.message,
        "detail": exc.detail,
        "request_id": exc.request_id or getattr(request.state, "request_id", None),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    # エラーログを出力
    logger.error(
        f"API Error: {exc.error_code.value} - {exc.message}",
        extra={
            "request_id": error_response["request_id"],
            "error_code": exc.error_code.value,
            "status_code": exc.status_code,
            "detail": exc.detail
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """一般的な例外用のハンドラ"""
    
    request_id = getattr(request.state, "request_id", None)
    
    error_response = {
        "success": False,
        "error_code": ErrorCode.SERVICE_UNAVAILABLE.value,
        "message": "Internal server error occurred",
        "detail": str(exc) if request.app.debug else None,
        "request_id": request_id,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    # エラーログを出力
    logger.exception(
        "Unhandled exception occurred",
        extra={
            "request_id": request_id,
            "exception_type": type(exc).__name__
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response
    )