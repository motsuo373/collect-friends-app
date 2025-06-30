from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class ActivityType(str, Enum):
    """アクティビティの種類"""
    CAFE = "cafe"           # お茶・カフェ
    DRINK = "drink"         # 軽く飲み
    WALK = "walk"           # 散歩・ぶらぶら
    SHOPPING = "shopping"   # 買い物・ショッピング
    MOVIE = "movie"         # 映画
    FOOD = "food"           # 軽食・ランチ


class MoodType(str, Enum):
    """ユーザーの気分・雰囲気"""
    STYLISH = "stylish"     # おしゃれ
    ROMANTIC = "romantic"   # ロマンチック
    CASUAL = "casual"       # カジュアル
    FORMAL = "formal"       # フォーマル
    SOCIAL = "social"       # 社交的
    QUIET = "quiet"         # 静か


class TimeOfDay(str, Enum):
    """時間帯"""
    BREAKFAST = "breakfast"     # 朝食（6:00-10:00）
    BRUNCH = "brunch"          # ブランチ（10:00-14:00）
    LUNCH = "lunch"            # ランチ（11:00-15:00）
    AFTERNOON = "afternoon"    # 午後（14:00-17:00）
    DINNER = "dinner"          # ディナー（17:00-21:00）
    NIGHT = "night"            # 夜（21:00-24:00）
    LATE_NIGHT = "late_night"  # 深夜（24:00-6:00）


class SceneType(str, Enum):
    """シーン・場面"""
    DATE = "date"                    # デート
    FIRST_DATE = "first_date"        # 初回デート
    ANNIVERSARY = "anniversary"      # 記念日
    BIRTHDAY = "birthday"            # 誕生日
    BUSINESS = "business"            # ビジネス
    FAMILY = "family"                # 家族
    FRIENDS = "friends"              # 友人
    COLLEAGUES = "colleagues"        # 同僚
    CELEBRATION = "celebration"      # お祝い
    CASUAL_MEETUP = "casual_meetup"  # カジュアルな会合
    GROUP_PARTY = "group_party"      # グループパーティー
    SOLO = "solo"                    # 一人


class SpecialRequirement(str, Enum):
    """特別要求"""
    PRIVATE_ROOM = "private_room"      # 個室
    TERRACE_SEAT = "terrace_seat"      # テラス席
    NON_SMOKING = "non_smoking"        # 禁煙
    SMOKING_OK = "smoking_ok"          # 喫煙可
    WIFI = "wifi"                      # WiFi
    PARKING = "parking"                # 駐車場
    CHILD_FRIENDLY = "child_friendly"  # 子連れOK
    PET_FRIENDLY = "pet_friendly"      # ペットOK
    WHEELCHAIR_ACCESS = "wheelchair_access"  # 車椅子対応
    RESERVATION = "reservation"        # 予約可能
    TAKEOUT = "takeout"               # テイクアウト
    DELIVERY = "delivery"             # デリバリー
    VEGETARIAN = "vegetarian"         # ベジタリアン対応
    HALAL = "halal"                   # ハラル対応
    ALL_YOU_CAN_DRINK = "all_you_can_drink"  # 飲み放題
    HAPPY_HOUR = "happy_hour"         # ハッピーアワー


class TransportMode(str, Enum):
    """交通手段"""
    WALKING_ONLY = "walking_only"     # 徒歩のみ
    TRAIN_OK = "train_ok"            # 電車利用可
    CAR_OK = "car_ok"                # 車利用可
    BICYCLE_OK = "bicycle_ok"        # 自転車利用可
    TAXI_OK = "taxi_ok"              # タクシー利用可


class CuisineType(str, Enum):
    """詳細料理ジャンル"""
    # 日本料理
    JAPANESE = "japanese"
    SUSHI = "sushi"
    RAMEN = "ramen"
    YAKITORI = "yakitori"
    TEMPURA = "tempura"
    SOBA_UDON = "soba_udon"
    IZAKAYA = "izakaya"
    KAISEKI = "kaiseki"
    
    # アジア料理
    CHINESE = "chinese"
    KOREAN = "korean"
    THAI = "thai"
    VIETNAMESE = "vietnamese"
    INDIAN = "indian"
    
    # 西洋料理
    ITALIAN = "italian"
    FRENCH = "french"
    AMERICAN = "american"
    SPANISH = "spanish"
    GERMAN = "german"
    
    # その他
    CAFE = "cafe"
    BAR = "bar"
    FAST_FOOD = "fast_food"
    SEAFOOD = "seafood"
    BARBECUE = "barbecue"
    VEGETARIAN = "vegetarian"
    DESSERT = "dessert"


class BudgetRange(str, Enum):
    LOW = "low"      # ～¥1500/人（カジュアル飲み会向け）
    MEDIUM = "medium"  # ¥1500-3000/人（標準的な友人との食事）
    HIGH = "high"    # ¥3000～/人（特別な場合のみ）


class CasualLevel(str, Enum):
    """カジュアル度レベル"""
    VERY_CASUAL = "very_casual"    # チェーン店、ファミレス、ファストカジュアル
    CASUAL = "casual"              # 一般的なカジュアル店舗
    SEMI_FORMAL = "semi_formal"    # やや正式な店舗
    FORMAL = "formal"              # 高級店、要予約店（基本的に除外）


class PriceConstraint(BaseModel):
    """価格制約設定"""
    max_price_per_person: Optional[int] = Field(None, description="1人あたりの最大予算（円）")
    prefer_chain_stores: bool = Field(True, description="チェーン店を優遇するか")
    exclude_reservation_required: bool = Field(True, description="予約必須店を除外するか")
    casual_level: CasualLevel = Field(CasualLevel.CASUAL, description="希望するカジュアル度")


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
    radius_km: Optional[float] = Field(10.0, ge=0.5, le=50, description="検索半径（km）")
    max_results: Optional[int] = Field(10, ge=1, le=20, description="最大結果数")


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


class SpotInfo(BaseModel):
    name: str = Field(..., description="スポット名")
    type: str = Field(..., description="スポットタイプ") 
    address: str = Field(..., description="住所")
    latitude: float = Field(..., description="緯度")
    longitude: float = Field(..., description="経度")
    distance_km: float = Field(..., description="指定位置からの距離（km）")
    rating: Optional[float] = Field(None, description="評価（1-5）")
    user_ratings_total: Optional[int] = Field(None, description="評価数")
    place_id: str = Field(..., description="Google PlaceID")


class ActivityRecommendationResponse(BaseModel):
    success: bool
    request_id: str
    processing_time_ms: int
    user_location: LocationData
    all_spots: List[SpotInfo] = Field(..., description="検索された全スポット")
    optimal_spot: Optional[SpotInfo] = Field(None, description="AI推奨の最適スポット")
    ai_reasoning: Optional[str] = Field(None, description="AI推奨理由")
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


class RestaurantInfo(BaseModel):
    """店舗情報"""
    name: str = Field(..., description="店舗名")
    type: str = Field(..., description="店舗タイプ（例：レストラン、カフェ、バー）")
    cuisine_type: Optional[str] = Field(None, description="料理ジャンル")
    address: str = Field(..., description="住所")
    latitude: float = Field(..., description="緯度")
    longitude: float = Field(..., description="経度")
    distance_from_station_km: float = Field(..., description="駅からの距離（km）")
    rating: Optional[float] = Field(None, description="評価（1-5）")
    user_ratings_total: Optional[int] = Field(None, description="評価数")
    price_level: Optional[int] = Field(None, description="価格レベル（1-4）")
    opening_hours: Optional[str] = Field(None, description="営業時間")
    place_id: str = Field(..., description="Google PlaceID")
    phone_number: Optional[str] = Field(None, description="電話番号")
    website: Optional[str] = Field(None, description="ウェブサイト")
    # カジュアル機能用の追加フィールド
    casual_score: Optional[float] = Field(None, description="カジュアル度スコア（0-10）")
    composite_score: Optional[float] = Field(None, description="総合スコア（0-10）")
    station_info: Optional[Any] = Field(None, description="最寄り駅情報")


class StationWithRestaurants(BaseModel):
    """駅とその周辺店舗情報"""
    station_info: StationSearchResult = Field(..., description="駅情報")
    restaurants: List[RestaurantInfo] = Field(..., description="周辺店舗リスト")
    search_radius_km: float = Field(..., description="検索半径（km）")


class RestaurantRecommendationRequest(BaseModel):
    """店舗推奨リクエスト（カジュアル志向版）"""
    # 基本情報
    user_location: LocationData = Field(..., description="ユーザーの位置情報")
    activity_type: List[ActivityType] = Field(..., description="アクティビティの種類")
    mood: List[MoodType] = Field(..., description="気分・雰囲気")
    group_size: int = Field(..., ge=1, le=10, description="グループの人数（1-10人）")
    
    # 時間帯とシーン情報
    time_of_day: Optional[TimeOfDay] = Field(None, description="時間帯（朝食、ランチ、ディナーなど）")
    scene_type: Optional[SceneType] = Field(SceneType.FRIENDS, description="シーン・場面（デフォルト：友人）")
    
    # カジュアル志向の新機能
    casual_level: Optional[CasualLevel] = Field(CasualLevel.CASUAL, description="希望するカジュアル度")
    price_constraint: Optional[PriceConstraint] = Field(None, description="価格制約設定")
    
    # 特別要求（簡素化）
    special_requirements: Optional[List[SpecialRequirement]] = Field(None, description="特別要求（WiFi、禁煙など）")
    transport_mode: Optional[TransportMode] = Field(TransportMode.WALKING_ONLY, description="交通手段")
    
    # 料理詳細
    preferred_cuisine_types: Optional[List[CuisineType]] = Field(None, description="優先料理ジャンル（詳細）")
    excluded_cuisine_types: Optional[List[CuisineType]] = Field(None, description="除外する料理ジャンル")
    
    # 予算と価格（カジュアル志向）
    budget_range: Optional[BudgetRange] = Field(BudgetRange.LOW, description="予算範囲（デフォルト：低価格）")
    max_price_per_person: Optional[int] = Field(3000, ge=500, le=10000, description="1人当たり最大予算（円）")
    min_rating: Optional[float] = Field(3.5, ge=1.0, le=5.0, description="最低評価（カジュアル店を考慮）")
    
    # 検索設定（効率化）
    station_search_radius_km: Optional[float] = Field(3.0, ge=0.5, le=10, description="駅検索半径（km）")
    restaurant_search_radius_km: Optional[float] = Field(0.8, ge=0.1, le=3, description="各駅周辺の店舗検索半径（km）")
    max_stations: Optional[int] = Field(3, ge=1, le=5, description="検索対象駅数")
    max_restaurants_per_station: Optional[int] = Field(8, ge=3, le=15, description="駅毎の最大店舗数")
    
    # カジュアル向け設定
    max_walking_minutes: Optional[int] = Field(10, ge=3, le=20, description="最大徒歩時間（分）")
    prefer_chain_stores: Optional[bool] = Field(True, description="チェーン店を優遇")
    exclude_high_end: Optional[bool] = Field(True, description="高級店を除外")
    
    # バリデーション
    @field_validator('activity_type')
    @classmethod
    def validate_activity_type(cls, v):
        if not v:
            raise ValueError("少なくとも1つのアクティビティタイプを指定してください")
        return v
    
    @field_validator('mood')
    @classmethod
    def validate_mood(cls, v):
        if not v:
            raise ValueError("少なくとも1つの気分を指定してください")
        return v
    
    @field_validator('max_price_per_person')
    @classmethod
    def validate_price_constraint(cls, v, info):
        # 飲み会の場合は3000円程度を推奨
        if info.data and 'activity_type' in info.data:
            if any(act.value == 'drink' for act in info.data['activity_type']) and v and v > 3500:
                raise ValueError("飲み会の場合は1人3500円以下を推奨します")
        return v


class RestaurantRecommendation(BaseModel):
    """AI推奨店舗（カジュアル志向）"""
    restaurant: RestaurantInfo = Field(..., description="推奨店舗")
    station_info: StationSearchResult = Field(..., description="最寄り駅情報")
    recommendation_score: float = Field(..., ge=0, le=10, description="推奨スコア")
    reason: str = Field(..., description="推奨理由")
    activity_match: List[ActivityType] = Field(..., description="マッチするアクティビティ")
    mood_match: List[MoodType] = Field(..., description="マッチする気分")
    casual_score: float = Field(..., ge=0, le=10, description="カジュアル度スコア")
    estimated_price_per_person: Optional[int] = Field(None, description="1人当たり予想価格（円）")


class SearchInfo(BaseModel):
    """検索情報サマリー"""
    search_radius_km: float = Field(..., description="検索半径（km）")
    stations_searched: int = Field(..., description="検索した駅数")
    total_restaurants_found: int = Field(..., description="発見した総店舗数")
    processing_time_ms: int = Field(..., description="処理時間（ミリ秒）")


class RestaurantRecommendationResponse(BaseModel):
    """カジュアル志向店舗推奨レスポンス"""
    success: bool = Field(..., description="成功フラグ")
    recommendations: List[RestaurantRecommendation] = Field(..., description="推奨店舗リスト（最大2店舗）")
    search_info: SearchInfo = Field(..., description="検索情報")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")


# ========== Firestore用提案システムモデル ==========

class ProposalSource(str, Enum):
    """提案元"""
    USER = "user"
    AI = "ai"
    FRIEND_INVITE = "friend_invite"


class ProposalType(str, Enum):
    """提案種類"""
    GROUP_MEETUP = "group_meetup"
    VENUE_RECOMMENDATION = "venue_recommendation"
    ACTIVITY_SUGGESTION = "activity_suggestion"


class ProposalStatus(str, Enum):
    """提案状態"""
    ACTIVE = "active"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    COMPLETED = "completed"


class UserResponseStatus(str, Enum):
    """ユーザー応答状況"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    MAYBE = "maybe"


class Priority(str, Enum):
    """優先度"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class ProposalLocation(BaseModel):
    """提案場所情報"""
    name: str = Field(..., description="場所名")
    address: str = Field(..., description="住所")
    coordinates: Dict[str, float] = Field(..., description="座標 {lat: float, lng: float}")
    place_id: Optional[str] = Field(None, description="Google Places ID")
    category: str = Field(..., description="カテゴリー")
    phone: Optional[str] = Field(None, description="電話番号")
    website: Optional[str] = Field(None, description="ウェブサイト")
    price_level: Optional[int] = Field(None, description="価格レベル（1-4）")
    rating: Optional[float] = Field(None, description="評価")
    photos: Optional[List[str]] = Field(None, description="写真URL配列")


class InvitedUser(BaseModel):
    """招待ユーザー情報"""
    uid: str = Field(..., description="ユーザーUID")
    display_name: str = Field(..., description="表示名")
    profile_image: Optional[str] = Field(None, description="プロフィール画像URL")
    role: str = Field("participant", description="役割")
    invited_at: datetime = Field(..., description="招待日時")
    invited_by: Optional[str] = Field(None, description="招待者のUID")


class ProposalBudget(BaseModel):
    """予算情報"""
    min: int = Field(..., description="最小金額")
    max: int = Field(..., description="最大金額")
    currency: str = Field("JPY", description="通貨")
    per_person: bool = Field(True, description="一人当たりかどうか")
    includes_food: bool = Field(True, description="食事込みかどうか")
    includes_drinks: bool = Field(True, description="飲み物込みかどうか")
    notes: Optional[str] = Field(None, description="備考")


class ProposalCapacity(BaseModel):
    """参加人数情報"""
    min: int = Field(..., description="最少人数")
    max: int = Field(..., description="最大人数")
    current: int = Field(0, description="現在の応答済み人数")
    waiting_list: int = Field(0, description="待機リスト人数")


class AIAnalysis(BaseModel):
    """AI分析データ"""
    confidence: float = Field(..., ge=0, le=1, description="信頼度")
    matching_score: float = Field(..., ge=0, le=1, description="マッチングスコア")
    reasons: List[str] = Field(..., description="推薦理由")
    recommendation_basis: List[str] = Field(..., description="推薦根拠")
    success_probability: float = Field(..., ge=0, le=1, description="成功確率")
    alternative_venues: Optional[List[str]] = Field(None, description="代替候補")
    suggested_time: Optional[datetime] = Field(None, description="推奨時間")
    factors_considered: Dict[str, bool] = Field(..., description="考慮された要因")


class UserResponse(BaseModel):
    """ユーザー応答情報"""
    status: UserResponseStatus = Field(..., description="応答状況")
    responded_at: Optional[datetime] = Field(None, description="応答日時")


class ResponseCount(BaseModel):
    """応答集計"""
    accepted: int = Field(0, description="参加希望者数")
    declined: int = Field(0, description="参加拒否者数")
    pending: int = Field(0, description="未回答者数")
    maybe: int = Field(0, description="検討中者数")


class Proposal(BaseModel):
    """提案データ（Firestore proposals コレクション用）"""
    proposal_id: str = Field(..., description="提案ID")
    title: str = Field(..., description="提案タイトル")
    description: str = Field(..., description="提案詳細")
    type: ProposalType = Field(..., description="提案種類")
    proposal_source: ProposalSource = Field(..., description="提案元")
    creator_ref: Optional[str] = Field(None, description="作成者UID（ユーザー提案の場合）")
    creator_display_name: Optional[str] = Field(None, description="作成者表示名")
    target_users: List[str] = Field(..., description="対象ユーザーUID配列")
    invited_users: List[InvitedUser] = Field(..., description="招待ユーザー詳細")
    scheduled_at: datetime = Field(..., description="予定日時")
    end_time: Optional[datetime] = Field(None, description="終了予定時間")
    location: ProposalLocation = Field(..., description="場所情報")
    category: str = Field(..., description="カテゴリー")
    budget: ProposalBudget = Field(..., description="予算情報")
    capacity: ProposalCapacity = Field(..., description="参加人数情報")
    requirements: Optional[List[str]] = Field(None, description="参加条件")
    tags: Optional[List[str]] = Field(None, description="タグ")
    ai_analysis: Optional[AIAnalysis] = Field(None, description="AI分析データ")
    responses: Dict[str, UserResponse] = Field(default_factory=dict, description="ユーザー応答状況")
    response_count: ResponseCount = Field(default_factory=ResponseCount, description="応答集計")
    status: ProposalStatus = Field(ProposalStatus.ACTIVE, description="提案状態")
    priority: Priority = Field(Priority.NORMAL, description="優先度")
    is_public: bool = Field(False, description="公開提案かどうか")
    allow_invites: bool = Field(True, description="参加者が他の人を招待できるか")
    auto_confirm: bool = Field(False, description="自動確定するか")
    confirmation_deadline: Optional[datetime] = Field(None, description="確定期限")
    expires_at: datetime = Field(..., description="提案有効期限")
    related_event_ref: Optional[str] = Field(None, description="関連イベント参照")
    related_chat_ref: Optional[str] = Field(None, description="関連チャット参照")
    created_at: datetime = Field(default_factory=datetime.now, description="作成日時")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新日時")


class UserProposal(BaseModel):
    """ユーザー個別提案（Firestore userProposal サブコレクション用）"""
    proposal_id: str = Field(..., description="提案ID")
    proposal_ref: str = Field(..., description="proposals コレクションへの参照パス")
    status: UserResponseStatus = Field(UserResponseStatus.PENDING, description="応答状況")
    is_read: bool = Field(False, description="既読フラグ")
    responded_at: Optional[datetime] = Field(None, description="応答日時")
    notification_sent: bool = Field(False, description="通知送信済みフラグ")
    personal_note: Optional[str] = Field(None, description="個人メモ")
    priority: float = Field(0.0, description="このユーザーにとっての優先度")
    received_at: datetime = Field(default_factory=datetime.now, description="受信日時")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新日時")
    
    # 提案内容の複製（フロントエンド取得用）
    title: str = Field(..., description="提案タイトル")
    description: str = Field(..., description="提案の詳細説明")
    type: ProposalType = Field(..., description="提案種類")
    proposal_source: ProposalSource = Field(..., description="提案元")
    creator_display_name: Optional[str] = Field(None, description="提案作成者の表示名")
    target_users: List[str] = Field(..., description="対象ユーザーUID配列")
    scheduled_at: datetime = Field(..., description="予定日時")
    end_time: Optional[datetime] = Field(None, description="終了予定時間")
    location: ProposalLocation = Field(..., description="場所情報")
    category: str = Field(..., description="カテゴリー")
    budget: ProposalBudget = Field(..., description="予算情報")
    capacity: ProposalCapacity = Field(..., description="参加人数情報")
    response_count: ResponseCount = Field(default_factory=ResponseCount, description="応答集計")
    expires_at: datetime = Field(..., description="提案有効期限")
    created_at: datetime = Field(..., description="作成日時")


class ProposalGenerationRequest(BaseModel):
    """AI提案生成リクエスト"""
    target_user_ids: Optional[List[str]] = Field(None, description="対象ユーザーID（未指定の場合は全アクティブユーザー）")
    location_filter: Optional[Dict[str, Any]] = Field(None, description="位置フィルター")
    force_generation: bool = Field(False, description="強制生成フラグ")
    max_proposals_per_user: int = Field(3, ge=1, le=10, description="ユーザーあたり最大提案数")


class ProposalGenerationResponse(BaseModel):
    """AI提案生成レスポンス"""
    success: bool = Field(..., description="成功フラグ")
    generated_proposals: List[str] = Field(..., description="生成された提案ID配列")
    target_users_count: int = Field(..., description="対象ユーザー数")
    processing_time_ms: int = Field(..., description="処理時間（ミリ秒）")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")


