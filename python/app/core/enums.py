from enum import Enum


class ActivityType(str, Enum):
    """アクティビティタイプの列挙型"""
    TEA_CAFE = "お茶・カフェ"
    LIGHT_DRINK = "軽く飲み"
    WALKING = "散歩・ぶらぶら"
    SHOPPING = "ショッピング"
    MOVIE = "映画"
    LIGHT_MEAL = "軽食・ランチ"
    
    @classmethod
    def values(cls):
        return [item.value for item in cls]


class BudgetRange(str, Enum):
    """予算帯の列挙型"""
    RANGE_0_1500 = "¥0-1500"
    RANGE_1500_4500 = "¥1500-4500"
    RANGE_4500_8000 = "¥4500-8000"
    RANGE_8000_PLUS = "¥8000+"
    
    @classmethod
    def values(cls):
        return [item.value for item in cls]


class CrowdLevel(str, Enum):
    """混雑度の列挙型"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ResponseStatus(str, Enum):
    """レスポンスステータスの列挙型"""
    COMPLETE = "complete"
    PARTIAL = "partial"
    FAILED = "failed"


class ResearchStatus(str, Enum):
    """調査ステータスの列挙型"""
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ErrorCode(str, Enum):
    """エラーコードの列挙型"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    GATEWAY_TIMEOUT = "GATEWAY_TIMEOUT"
    UNAUTHORIZED = "UNAUTHORIZED"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"