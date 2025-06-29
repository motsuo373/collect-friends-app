from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.core.enums import ActivityType, BudgetRange


class Station(BaseModel):
    """駅情報"""
    name: str
    latitude: float
    longitude: float
    distance_from_user_km: float


class PlaceInfo(BaseModel):
    """場所情報"""
    name: str
    address: str
    rating: Optional[float] = None
    price_level: Optional[int] = None
    place_type: str
    google_place_id: str
    latitude: float
    longitude: float


class ResearchState(BaseModel):
    """LangGraphの研究状態を管理するstate"""
    
    # 入力情報
    station: Station
    user_location: tuple[float, float]
    activity_types: List[ActivityType]
    budget_range: Optional[BudgetRange]
    member_count: int
    current_time: datetime
    
    # 検索クエリ生成
    search_query: Optional[str] = None
    
    # Google Places検索結果
    places_raw: List[Dict[str, Any]] = Field(default_factory=list)
    places_parsed: List[PlaceInfo] = Field(default_factory=list)
    
    # 批評とフィードバック
    critique_feedback: Optional[str] = None
    needs_refinement: bool = False
    refinement_count: int = 0
    max_refinements: int = 2
    
    # 最終要約
    station_summary: Optional[str] = None
    
    # エラー処理
    errors: List[str] = Field(default_factory=list)
    
    # ステップ制御
    current_step: str = "query_generation"
    completed_steps: List[str] = Field(default_factory=list)
    
    class Config:
        arbitrary_types_allowed = True