import asyncio
import json
import time
from typing import AsyncGenerator
from fastapi import APIRouter, Request, Response, Depends
from fastapi.responses import StreamingResponse
from app.schemas import RecommendationRequest, SSEMessage
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.exceptions import TimeoutError, ServiceUnavailableError
from app.services.coordinator import Coordinator

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)


async def generate_sse_stream(
    request: RecommendationRequest,
    request_id: str
) -> AsyncGenerator[str, None]:
    """SSEストリームを生成"""
    
    coordinator = Coordinator()
    event_queue = asyncio.Queue()
    
    try:
        # Coordinatorを非同期で実行
        task = asyncio.create_task(
            coordinator.process_request(request, request_id, event_queue)
        )
        
        # タイムアウトを設定
        timeout_task = asyncio.create_task(
            asyncio.sleep(settings.research_timeout_seconds)
        )
        
        # イベントキューからメッセージを取得してストリーム
        while True:
            # タイムアウトチェック
            if timeout_task.done():
                raise TimeoutError(
                    message="処理がタイムアウトしました",
                    request_id=request_id
                )
            
            try:
                # イベントを取得（1秒のタイムアウト）
                event = await asyncio.wait_for(
                    event_queue.get(),
                    timeout=1.0
                )
                
                # ストリーム終了の確認
                if event.event == "stream_end":
                    yield event.to_sse_format()
                    break
                
                # イベントをSSE形式で送信
                yield event.to_sse_format()
                
            except asyncio.TimeoutError:
                # キューが空の場合は継続
                if task.done():
                    # タスクが完了していれば終了
                    if task.exception():
                        raise task.exception()
                    break
                continue
                
    except Exception as e:
        logger.error(
            f"Stream generation error: {str(e)}",
            extra={"request_id": request_id}
        )
        
        # エラーイベントを送信
        error_event = SSEMessage(
            event="error",
            data={
                "message": "処理中にエラーが発生しました",
                "error": str(e)
            }
        )
        yield error_event.to_sse_format()
        
    finally:
        # クリーンアップ
        if not task.done():
            task.cancel()
        if not timeout_task.done():
            timeout_task.cancel()


@router.post("/stream", response_class=StreamingResponse)
async def stream_recommendations(
    request: RecommendationRequest,
    req: Request
) -> StreamingResponse:
    """
    位置情報ベースの推薦をストリーミング形式で返す
    
    - **user_location**: ユーザーの現在位置（緯度・経度）
    - **search_params**: 検索パラメータ（オプション）
    - **group_info**: グループ情報（人数、希望アクティビティなど）
    - **context**: コンテキスト情報（現在時刻など）
    
    レスポンスはServer-Sent Events (SSE)形式でストリーミングされます。
    """
    
    # リクエストIDを取得
    request_id = getattr(req.state, "request_id", "unknown")
    
    logger.info(
        f"Recommendation request received",
        extra={
            "request_id": request_id,
            "user_location": {
                "lat": request.user_location.latitude,
                "lon": request.user_location.longitude
            },
            "group_size": request.group_info.member_count,
            "activities": request.group_info.member_moods
        }
    )
    
    # SSEストリームを返す
    return StreamingResponse(
        generate_sse_stream(request, request_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Nginxのバッファリングを無効化
        }
    )