"""
推奨システムのAPIエンドポイント
"""
import asyncio
import time
import uuid
from typing import List, Dict, Any, Optional, Tuple
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from datetime import datetime

from app.models import (
    ActivityRecommendationRequest,
    ActivityRecommendationResponse,
    RestaurantRecommendationRequest,
    RestaurantRecommendationResponse,
    LocationData
)
from app.services.activity_recommendation_service import ActivityRecommendationService
from app.services.restaurant_recommendation_service import RestaurantRecommendationService
from app.services.gemini_research import GeminiResearchAgent
from app.services.google_places import GooglePlacesService
from app.config import get_settings


router = APIRouter(prefix="/api/v1", tags=["recommendations"])


# サービスのシングルトンインスタンス
activity_service = ActivityRecommendationService()
restaurant_service = RestaurantRecommendationService()


@router.get("/debug/station-search-status")
async def get_station_search_status():
    """駅検索サービスの状態をデバッグ用に確認"""
    try:
        from app.services.station_search import StationSearchEngine
        
        station_search = StationSearchEngine()
        status = station_search.get_service_status()
        
        # テスト実行
        test_location = LocationData(latitude=35.6762, longitude=139.6503)
        test_results = await station_search.test_station_search(test_location)
        
        return {
            "service_status": status,
            "test_results": test_results,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@router.get("/debug/restaurant-search-status")
async def get_restaurant_search_status():
    """店舗検索サービスの状態をデバッグ用に確認"""
    try:
        places_service = GooglePlacesService()
        
        # API キーの確認
        api_key_available = places_service.api_key is not None and places_service.api_key != ""
        
        # テスト位置（東京駅周辺）
        test_location = LocationData(latitude=35.6812, longitude=139.7671)
        
        # 駅検索テスト
        stations = places_service.search_nearby_spots(
            test_location, 
            radius_m=2000, 
            included_types=["train_station", "subway_station"], 
            max_results=3
        )
        
        # 店舗検索テスト
        restaurants = places_service.search_restaurants_near_location(
            test_location,
            radius_m=1000,
            max_results=5
        )
        
        return {
            "service_status": {
                "api_key_available": api_key_available,
                "google_places_service": "operational" if api_key_available else "api_key_missing"
            },
            "test_results": {
                "test_location": {
                    "latitude": test_location.latitude,
                    "longitude": test_location.longitude,
                    "description": "Tokyo Station area"
                },
                "stations_found": len(stations),
                "stations_sample": [
                    {
                        "name": s.station_name,
                        "distance_km": s.distance_km,
                        "types": s.lines
                    } for s in stations[:2]
                ],
                "restaurants_found": len(restaurants),
                "restaurants_sample": [
                    {
                        "name": r.name,
                        "type": r.type,
                        "cuisine_type": r.cuisine_type,
                        "rating": r.rating,
                        "distance_km": r.distance_from_station_km
                    } for r in restaurants[:2]
                ]
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "timestamp": datetime.now().isoformat()
        }


@router.post(
    "/activity-recommendations",
    response_model=ActivityRecommendationResponse,
    summary="アクティビティ推奨を取得",
    description="位置情報とグループ情報を基に最適なアクティビティを推奨します"
)
async def get_activity_recommendations(
    request: ActivityRecommendationRequest
) -> ActivityRecommendationResponse:
    """アクティビティ推奨エンドポイント"""
    
    return await activity_service.generate_recommendations(request)


@router.post(
    "/restaurant-recommendations",
    response_model=RestaurantRecommendationResponse,
    summary="友人向けカジュアル店舗推奨を取得",
    description="位置情報とユーザーの希望を基に気軽に行ける店舗を2つ推奨します"
)
async def get_restaurant_recommendations(
    request: RestaurantRecommendationRequest
) -> RestaurantRecommendationResponse:
    """カジュアル志向の友人向け店舗推奨エンドポイント"""
    
    try:
        print(f"🍻 Casual restaurant recommendation request received")
        print(f"   Location: ({request.user_location.latitude}, {request.user_location.longitude})")
        print(f"   Activities: {[a.value for a in request.activity_type]}")
        print(f"   Moods: {[m.value for m in request.mood]}")
        print(f"   Group size: {request.group_size}")
        print(f"   Casual level: {request.casual_level}")
        print(f"   Max price per person: ¥{request.max_price_per_person}")
        print(f"   Prefer chain stores: {request.prefer_chain_stores}")
        print(f"   Scene type: {request.scene_type}")
        
        # カジュアル志向の新メソッドを使用
        response = await restaurant_service.recommend_restaurants_async(
            user_location=request.user_location,
            activity_type=request.activity_type,
            mood=request.mood,
            group_size=request.group_size,
            time_of_day=request.time_of_day,
            scene_type=request.scene_type,
            casual_level=request.casual_level.value if request.casual_level else "casual",
            max_price_per_person=request.max_price_per_person,
            prefer_chain_stores=request.prefer_chain_stores,
            exclude_high_end=request.exclude_high_end,
            # その他のパラメータ
            station_search_radius_km=request.station_search_radius_km,
            restaurant_search_radius_km=request.restaurant_search_radius_km,
            max_stations=request.max_stations,
            max_restaurants_per_station=request.max_restaurants_per_station,
            min_rating=request.min_rating
        )
        
        print(f"🎯 Casual restaurant recommendation response: success={response.success}")
        if response.success:
            print(f"   Recommended {len(response.recommendations)} casual restaurants")
            print(f"   Processing time: {response.search_info.processing_time_ms}ms")
            for i, rec in enumerate(response.recommendations):
                print(f"   {i+1}. {rec.restaurant.name} (Score: {rec.recommendation_score}, Casual: {rec.casual_score}, Price: ¥{rec.estimated_price_per_person})")
        
        return response
        
    except Exception as e:
        print(f"❌ Error in casual restaurant recommendation endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        
        from app.models import SearchInfo
        return RestaurantRecommendationResponse(
            success=False,
            recommendations=[],
            search_info=SearchInfo(
                search_radius_km=0,
                stations_searched=0,
                total_restaurants_found=0,
                processing_time_ms=0
            ),
            error_message=f"カジュアル推奨処理中にエラーが発生しました: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "activity_recommendation": "available",
            "restaurant_recommendation": "available"
        }
    }


