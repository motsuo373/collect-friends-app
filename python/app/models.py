from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class ActivityType(str, Enum):
    CAFE = "お茶・カフェ"
    DRINK = "軽く飲み"
    WALK = "散歩・ぶらぶら"
    SHOPPING = "買い物・ショッピング"
    MOVIE = "映画"
    FOOD = "軽食・ランチ"


class BudgetRange(str, Enum):
    LOW = "low"      # ～¥1000/人
    MEDIUM = "medium"  # ¥1000-3000/人
    HIGH = "high"    # ¥3000～/人


class CrowdLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class LocationData(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = Field(None, ge=0)


class GroupInfo(BaseModel):
    member_count: int = Field(..., ge=1, le=50)
    member_moods: List[ActivityType]
    budget_range: BudgetRange
    duration_hours: float = Field(..., ge=0.5, le=24)
    
    @field_validator('member_moods')
    @classmethod
    def validate_member_moods(cls, v):
        if not v:
            raise ValueError("At least one mood must be specified")
        return v


class Preferences(BaseModel):
    search_radius_km: float = Field(10.0, ge=0.5, le=50)
    max_stations: int = Field(20, ge=1, le=50)
    activity_types: List[ActivityType]
    exclude_crowded: bool = False


class Context(BaseModel):
    current_time: datetime
    weather_consideration: bool = True
    accessibility_needs: List[str] = []


class ActivityRecommendationRequest(BaseModel):
    user_location: LocationData
    group_info: GroupInfo
    preferences: Preferences
    context: Context


class VenueInfo(BaseModel):
    name: str
    rating: Optional[float] = Field(None, ge=0, le=5)
    price_range: str
    crowd_level: CrowdLevel
    operating_hours: str
    walking_time_min: int
    special_features: List[str] = []
    real_time_info: Optional[str] = None


class ActivityCategory(BaseModel):
    category: ActivityType
    venues: List[VenueInfo]


class StationInfo(BaseModel):
    name: str
    lines: List[str]
    distance_from_user_m: float
    travel_time_min: int


class Recommendation(BaseModel):
    rank: int
    station_info: StationInfo
    activities: List[ActivityCategory]
    overall_score: float = Field(..., ge=0, le=10)
    recommendation_reason: str
    estimated_total_cost: str
    weather_suitability: str


class ResearchMetadata(BaseModel):
    stations_analyzed: int
    venues_researched: int
    research_loops_executed: int
    data_sources: List[str]


class ActivityRecommendationResponse(BaseModel):
    success: bool
    request_id: str
    processing_time_ms: int
    recommendations: List[Recommendation]
    research_metadata: ResearchMetadata
    error_message: Optional[str] = None


class StationSearchResult(BaseModel):
    station_name: str
    distance_km: float
    latitude: float
    longitude: float
    lines: List[str]
    is_major_city_station: bool = False
    # Google Places APIから取得した追加情報
    formatted_address: Optional[str] = None
    place_id: Optional[str] = None
    business_status: Optional[str] = None
    place_types: List[str] = []