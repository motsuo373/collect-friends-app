from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.core.enums import (
    ResponseStatus, ResearchStatus, ActivityType, 
    CrowdLevel, ErrorCode
)


# SSEイベント用のスキーマ
class StatusUpdateEvent(BaseModel):
    """ステータス更新イベント"""
    message: str
    step: str
    stations: Optional[List[str]] = None


class ResearchUpdateEvent(BaseModel):
    """調査更新イベント"""
    message: str
    station: str
    status: ResearchStatus


class ResearchCompleteEvent(BaseModel):
    """調査完了イベント"""
    message: str
    station: str
    status: ResearchStatus


class StreamEndEvent(BaseModel):
    """ストリーム終了イベント"""
    message: str = "処理が完了しました。"


# 最終レスポンス用のスキーマ
class StationInfo(BaseModel):
    """駅情報"""
    name: str = Field(..., description="駅名")
    distance_from_user_m: int = Field(..., description="ユーザーからの距離（メートル）")
    travel_time_min: int = Field(..., description="移動時間（分）")


class VenueInfo(BaseModel):
    """施設情報"""
    name: str = Field(..., description="施設名")
    rating: Optional[float] = Field(None, description="評価", ge=0, le=5)
    price_range: Optional[str] = Field(None, description="価格帯")
    crowd_level: Optional[CrowdLevel] = Field(None, description="混雑度")
    operating_hours: Optional[str] = Field(None, description="営業時間")
    walking_time_min: Optional[int] = Field(None, description="駅からの徒歩時間（分）")
    description: Optional[str] = Field(None, description="施設の説明")
    address: Optional[str] = Field(None, description="住所")
    phone: Optional[str] = Field(None, description="電話番号")


class ActivityInfo(BaseModel):
    """アクティビティ情報"""
    category: ActivityType = Field(..., description="アクティビティカテゴリ")
    venues: List[VenueInfo] = Field(..., description="施設リスト")


class RecommendationInfo(BaseModel):
    """推薦情報"""
    rank: int = Field(..., description="ランク", ge=1)
    station_info: StationInfo = Field(..., description="駅情報")
    activities: List[ActivityInfo] = Field(..., description="アクティビティリスト")
    overall_score: float = Field(..., description="総合スコア", ge=0, le=10)
    recommendation_reason: str = Field(..., description="推薦理由")
    estimated_total_cost: Optional[str] = Field(None, description="予想総額")


class FinalReportEvent(BaseModel):
    """最終レポートイベント"""
    status: ResponseStatus = Field(..., description="処理ステータス")
    research_quality: float = Field(..., description="調査品質スコア", ge=0, le=1)
    request_id: str = Field(..., description="リクエストID")
    recommendations: List[RecommendationInfo] = Field(..., description="推薦リスト")
    processing_time_seconds: Optional[float] = Field(None, description="処理時間（秒）")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "complete",
                "research_quality": 1.0,
                "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "recommendations": [{
                    "rank": 1,
                    "station_info": {
                        "name": "渋谷駅",
                        "distance_from_user_m": 2300,
                        "travel_time_min": 8
                    },
                    "activities": [{
                        "category": "お茶・カフェ",
                        "venues": [{
                            "name": "スターバックス SHIBUYA TSUTAYA店",
                            "rating": 4.2,
                            "price_range": "¥500-1500",
                            "crowd_level": "high",
                            "operating_hours": "07:00-23:00",
                            "walking_time_min": 1
                        }]
                    }],
                    "overall_score": 8.7,
                    "recommendation_reason": "ご希望のカフェやショッピングの選択肢が豊富で、ユーザーの現在地からのアクセスも良好です。",
                    "estimated_total_cost": "¥1500-4500"
                }]
            }
        }


# エラーレスポンス用のスキーマ
class ErrorResponse(BaseModel):
    """エラーレスポンス"""
    success: bool = Field(False, description="成功フラグ")
    error_code: ErrorCode = Field(..., description="エラーコード")
    message: str = Field(..., description="エラーメッセージ")
    detail: Optional[str] = Field(None, description="詳細情報")
    request_id: Optional[str] = Field(None, description="リクエストID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="タイムスタンプ")
    
    class Config:
        schema_extra = {
            "example": {
                "success": False,
                "error_code": "VALIDATION_ERROR",
                "message": "リクエストの形式が不正です。",
                "detail": "Field 'latitude' must be between -90 and 90.",
                "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "timestamp": "2025-06-29T14:35:00Z"
            }
        }


# SSEイベントのラッパー
class SSEMessage(BaseModel):
    """SSEメッセージ"""
    event: str
    data: Dict[str, Any]
    
    def to_sse_format(self) -> str:
        """SSE形式の文字列に変換"""
        import json
        data_str = json.dumps(self.data, ensure_ascii=False)
        return f"event: {self.event}\ndata: {data_str}\n\n"