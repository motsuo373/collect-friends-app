from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.enums import ActivityType, BudgetRange
from app.utils.distance import normalize_coordinates


class UserLocation(BaseModel):
    """ユーザー位置情報"""
    latitude: float = Field(..., description="緯度（十進度数）", ge=-90, le=90)
    longitude: float = Field(..., description="経度（十進度数）", ge=-180, le=180)
    
    @field_validator('latitude', 'longitude')
    @classmethod
    def normalize_coords(cls, v):
        """座標を小数点以下6桁に正規化"""
        return round(v, 6)


class SearchParams(BaseModel):
    """検索パラメータ"""
    search_radius_km: int = Field(10, description="検索半径(km)", ge=1, le=50)
    max_stations: int = Field(20, description="最大候補駅数", ge=5, le=50)


class GroupInfo(BaseModel):
    """グループ情報"""
    member_count: int = Field(..., description="人数", ge=1)
    member_moods: List[ActivityType] = Field(..., description="希望アクティビティリスト")
    budget_range: Optional[BudgetRange] = Field(None, description="予算帯")
    
    @field_validator('member_moods')
    @classmethod
    def validate_member_moods(cls, v):
        """member_moodsが空でないことを確認"""
        if not v:
            raise ValueError("希望アクティビティは少なくとも1つ必要です")
        return v
    
    @field_validator('budget_range')
    @classmethod
    def validate_budget_range(cls, v):
        """予算帯が有効な値であることを確認"""
        if v is not None and v not in BudgetRange.values():
            raise ValueError(f"無効な予算帯: {v}")
        return v


class Context(BaseModel):
    """コンテキスト情報"""
    current_time: datetime = Field(..., description="現在時刻 (ISO 8601形式)")


class RecommendationRequest(BaseModel):
    """推薦リクエスト"""
    user_location: UserLocation = Field(..., description="ユーザーの現在位置")
    search_params: Optional[SearchParams] = Field(None, description="検索パラメータ")
    group_info: GroupInfo = Field(..., description="グループ情報")
    context: Context = Field(..., description="コンテキスト情報")
    
    class Config:
        schema_extra = {
            "example": {
                "user_location": {
                    "latitude": 35.676225,
                    "longitude": 139.650348
                },
                "search_params": {
                    "search_radius_km": 10,
                    "max_stations": 20
                },
                "group_info": {
                    "member_count": 2,
                    "member_moods": ["お茶・カフェ", "散歩・ぶらぶら"],
                    "budget_range": "¥1500-4500"
                },
                "context": {
                    "current_time": "2025-06-29T14:30:00+09:00"
                }
            }
        }
    
    def get_normalized_location(self) -> tuple[float, float]:
        """正規化された位置情報を取得"""
        return normalize_coordinates(
            self.user_location.latitude,
            self.user_location.longitude
        )
    
    def get_search_radius_km(self) -> int:
        """検索半径を取得（デフォルト値を考慮）"""
        if self.search_params:
            return self.search_params.search_radius_km
        return 10
    
    def get_max_stations(self) -> int:
        """最大駅数を取得（デフォルト値を考慮）"""
        if self.search_params:
            return self.search_params.max_stations
        return 20