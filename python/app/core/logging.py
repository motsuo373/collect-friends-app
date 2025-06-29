import logging
import sys
from typing import Optional
import json
from datetime import datetime
from app.core.config import get_settings

settings = get_settings()


class JSONFormatter(logging.Formatter):
    """JSON形式でログを出力するフォーマッター"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "service": "recommendations-api"
        }
        
        # extra属性があれば追加
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id
        
        if hasattr(record, "error_code"):
            log_obj["error_code"] = record.error_code
            
        if hasattr(record, "status_code"):
            log_obj["status_code"] = record.status_code
            
        if hasattr(record, "user_id"):
            log_obj["user_id"] = record.user_id
            
        if hasattr(record, "station_name"):
            log_obj["station_name"] = record.station_name
            
        if hasattr(record, "research_step"):
            log_obj["research_step"] = record.research_step
            
        if hasattr(record, "cache_key"):
            log_obj["cache_key"] = record.cache_key
            
        if hasattr(record, "duration_ms"):
            log_obj["duration_ms"] = record.duration_ms
            
        if hasattr(record, "api_call"):
            log_obj["api_call"] = record.api_call
        
        # パフォーマンス情報
        if hasattr(record, "memory_usage"):
            log_obj["memory_usage"] = record.memory_usage
            
        if hasattr(record, "response_size"):
            log_obj["response_size"] = record.response_size
        
        # 例外情報があれば追加
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            log_obj["exception_type"] = record.exc_info[0].__name__ if record.exc_info[0] else None
        
        return json.dumps(log_obj, ensure_ascii=False)


def setup_logging(
    log_level: Optional[str] = None,
    json_logs: bool = True
) -> None:
    """
    ロギングの初期設定
    
    Args:
        log_level: ログレベル（デフォルトは設定ファイルから取得）
        json_logs: JSON形式でログを出力するか
    """
    log_level = log_level or settings.log_level
    
    # ルートロガーの設定
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # 既存のハンドラをクリア
    root_logger.handlers.clear()
    
    # コンソールハンドラの設定
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    if json_logs:
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # 外部ライブラリのログレベルを調整
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("redis").setLevel(logging.WARNING)
    logging.getLogger("aiohttp").setLevel(logging.WARNING)
    
    # 開発環境では詳細なログを出力
    if settings.log_level == "DEBUG":
        logging.getLogger("httpx").setLevel(logging.DEBUG)
        logging.getLogger("langchain").setLevel(logging.DEBUG)
        logging.getLogger("app").setLevel(logging.DEBUG)
        logging.getLogger("research").setLevel(logging.DEBUG)
    else:
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("langchain").setLevel(logging.INFO)
        logging.getLogger("app").setLevel(logging.INFO)
        logging.getLogger("research").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """
    ロガーインスタンスを取得
    
    Args:
        name: ロガー名（通常は__name__を指定）
    
    Returns:
        logging.Logger: ロガーインスタンス
    """
    return logging.getLogger(name)