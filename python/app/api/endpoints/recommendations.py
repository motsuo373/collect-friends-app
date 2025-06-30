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
    LocationData,
    ProposalGenerationRequest,
    ProposalGenerationResponse,
    UserResponseStatus
)
from app.services.activity_recommendation_service import ActivityRecommendationService
from app.services.restaurant_recommendation_service import RestaurantRecommendationService
from app.services.gemini_research import GeminiResearchAgent
from app.services.google_places import GooglePlacesService
from app.services.proposal_generation_service import get_proposal_generation_service
from app.services.firestore_service import get_firestore_service
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


@router.get("/debug/japanese-keyword-test")
async def test_japanese_keyword_search():
    """日本語キーワード検索のテスト用エンドポイント"""
    try:
        places_service = GooglePlacesService()
        
        # テスト位置（渋谷駅周辺）
        test_location = LocationData(latitude=35.6580, longitude=139.7016)
        
        # drinkアクティビティの日本語キーワードを取得
        keywords = places_service.get_japanese_keywords_for_activity(
            activity_types=["drink"],
            time_of_day="night",
            scene_type="friends"
        )
        
        # 各キーワードでテスト検索
        search_results = {}
        for keyword in keywords[:3]:  # 上位3キーワードのみテスト
            print(f"🔍 Testing keyword: '{keyword}'")
            results = places_service._search_with_japanese_text_query(
                location=test_location,
                radius_m=1000,
                text_query=keyword + " 近く",
                max_results=5
            )
            
            search_results[keyword] = [
                {
                    "name": r.name,
                    "type": r.type,
                    "cuisine_type": r.cuisine_type,
                    "rating": r.rating,
                    "price_level": r.price_level,
                    "distance_km": r.distance_from_station_km,
                    "address": r.address
                } for r in results
            ]
        
        # 従来の英語タイプ検索との比較
        traditional_types = places_service.get_search_types_for_scene(["drink"])
        traditional_results = places_service._search_with_types(
            location=test_location,
            radius_m=1000,
            search_types=traditional_types,
            max_results=5
        )
        
        return {
            "test_location": {
                "latitude": test_location.latitude,
                "longitude": test_location.longitude,
                "description": "Shibuya Station area"
            },
            "japanese_keywords": keywords,
            "japanese_keyword_results": search_results,
            "traditional_search_types": traditional_types,
            "traditional_results": [
                {
                    "name": r.name,
                    "type": r.type,
                    "cuisine_type": r.cuisine_type,
                    "rating": r.rating,
                    "price_level": r.price_level,
                    "distance_km": r.distance_from_station_km
                } for r in traditional_results
            ],
            "comparison": {
                "japanese_total": sum(len(results) for results in search_results.values()),
                "traditional_total": len(traditional_results),
                "improvement": "Japanese keyword search found more relevant drinking establishments" if sum(len(results) for results in search_results.values()) > len(traditional_results) else "Traditional search performed better"
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
            "restaurant_recommendation": "available",
            "proposal_generation": "available",
            "firestore": "available"
        }
    }


# ========== 提案システム関連エンドポイント ==========

@router.post(
    "/generate-ai-proposals",
    response_model=ProposalGenerationResponse,
    summary="AI提案を生成してFirestoreに保存",
    description="アクティブユーザーまたは指定ユーザーに対してAI提案を生成し、Firestoreに保存します"
)
async def generate_ai_proposals(
    request: ProposalGenerationRequest
) -> ProposalGenerationResponse:
    """AI提案生成エンドポイント"""
    
    try:
        print(f"🤖 AI proposal generation request received")
        print(f"   Target users: {request.target_user_ids if request.target_user_ids else 'All active users'}")
        print(f"   Max proposals per user: {request.max_proposals_per_user}")
        print(f"   Force generation: {request.force_generation}")
        
        proposal_service = get_proposal_generation_service()
        response = await proposal_service.generate_ai_proposals(request)
        
        print(f"🎯 AI proposal generation response: success={response.success}")
        if response.success:
            print(f"   Generated {len(response.generated_proposals)} proposals")
            print(f"   Target users: {response.target_users_count}")
            print(f"   Processing time: {response.processing_time_ms}ms")
        
        return response
        
    except Exception as e:
        print(f"❌ Error in AI proposal generation endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return ProposalGenerationResponse(
            success=False,
            generated_proposals=[],
            target_users_count=0,
            processing_time_ms=0,
            error_message=f"AI提案生成中にエラーが発生しました: {str(e)}"
        )


@router.post(
    "/respond-to-proposal/{proposal_id}/{user_id}",
    summary="提案に応答",
    description="ユーザーが提案に対して応答（参加/辞退/未定）します"
)
async def respond_to_proposal(
    proposal_id: str,
    user_id: str,
    response_status: UserResponseStatus
):
    """提案応答エンドポイント"""
    
    try:
        print(f"💬 Proposal response received: {user_id} -> {proposal_id} ({response_status.value})")
        
        firestore_service = get_firestore_service()
        success = await firestore_service.update_proposal_response(
            user_id, proposal_id, response_status
        )
        
        if success:
            return {
                "success": True,
                "message": f"応答を更新しました: {response_status.value}",
                "proposal_id": proposal_id,
                "user_id": user_id,
                "status": response_status.value,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "success": False,
                "message": "応答の更新に失敗しました",
                "error": "Database update failed"
            }
        
    except Exception as e:
        print(f"❌ Error in proposal response endpoint: {str(e)}")
        return {
            "success": False,
            "message": f"提案応答中にエラーが発生しました: {str(e)}",
            "error": str(e)
        }


@router.get(
    "/user-proposals/{user_id}",
    summary="ユーザーの提案一覧を取得",
    description="指定ユーザーに届いた提案を取得します"
)
async def get_user_proposals(
    user_id: str,
    limit: int = Query(10, ge=1, le=50, description="取得件数")
):
    """ユーザー提案取得エンドポイント"""
    
    try:
        print(f"📋 Getting proposals for user: {user_id} (limit: {limit})")
        
        firestore_service = get_firestore_service()
        proposals = await firestore_service.get_user_proposals(user_id, limit)
        
        return {
            "success": True,
            "user_id": user_id,
            "proposals": proposals,
            "count": len(proposals),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error getting user proposals: {str(e)}")
        return {
            "success": False,
            "user_id": user_id,
            "proposals": [],
            "count": 0,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@router.get(
    "/proposal-details/{proposal_id}",
    summary="提案の詳細を取得",
    description="指定提案の詳細情報を取得します"
)
async def get_proposal_details(proposal_id: str):
    """提案詳細取得エンドポイント"""
    
    try:
        print(f"📄 Getting proposal details: {proposal_id}")
        
        firestore_service = get_firestore_service()
        proposal = await firestore_service.get_proposal_details(proposal_id)
        
        if proposal:
            return {
                "success": True,
                "proposal": proposal,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "success": False,
                "message": "提案が見つかりませんでした",
                "proposal_id": proposal_id
            }
        
    except Exception as e:
        print(f"❌ Error getting proposal details: {str(e)}")
        return {
            "success": False,
            "message": f"提案詳細取得中にエラーが発生しました: {str(e)}",
            "error": str(e)
        }


@router.post(
    "/cleanup-expired-proposals",
    summary="期限切れ提案をクリーンアップ",
    description="期限切れの提案をクリーンアップします（定期実行用）"
)
async def cleanup_expired_proposals():
    """期限切れ提案クリーンアップエンドポイント"""
    
    try:
        print(f"🧹 Starting expired proposals cleanup...")
        
        firestore_service = get_firestore_service()
        cleanup_count = await firestore_service.cleanup_expired_proposals()
        
        return {
            "success": True,
            "message": f"{cleanup_count}件の期限切れ提案をクリーンアップしました",
            "cleanup_count": cleanup_count,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error in cleanup expired proposals: {str(e)}")
        return {
            "success": False,
            "message": f"クリーンアップ中にエラーが発生しました: {str(e)}",
            "error": str(e),
            "cleanup_count": 0
        }


