import asyncio
import time
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime

from app.models import (
    ActivityRecommendationRequest,
    ActivityRecommendationResponse,
    Recommendation,
    ResearchMetadata,
    StationInfo,
    ActivityCategory,
    LocationData
)
from app.services.station_search import StationSearchEngine
from app.services.gemini_research import GeminiResearchAgent, GeminiAPIError
from app.config import get_settings


router = APIRouter(prefix="/api/v1", tags=["recommendations"])


@router.get("/debug/station-search-status")
async def get_station_search_status():
    """駅検索サービスの状態をデバッグ用に確認"""
    try:
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


class RecommendationService:
    """推奨サービスのメインロジック"""
    
    def __init__(self):
        self.settings = get_settings()
        self.station_search = StationSearchEngine()
        self.gemini_agent = GeminiResearchAgent()
    
    async def generate_recommendations(
        self,
        request: ActivityRecommendationRequest
    ) -> ActivityRecommendationResponse:
        """アクティビティ推奨を生成"""
        
        start_time = time.time()
        request_id = f"req_{uuid.uuid4().hex[:8]}"
        
        try:
            # 1. 駅検索
            stations = await self.station_search.get_stations_for_research(
                request.user_location,
                request.preferences.search_radius_km,
                request.preferences.max_stations
            )
            
            if not stations:
                raise HTTPException(
                    status_code=404,
                    detail="指定された範囲内に駅が見つかりませんでした"
                )
            
            # 2. 並列研究実行
            research_results = await self._parallel_research(
                stations,
                request.group_info,
                request.preferences.activity_types,
                request.context.current_time
            )
            
            # 3. 結果の統合とスコアリング
            recommendations = self._create_recommendations(
                research_results,
                request.group_info,
                request.context
            )
            
            # 4. レスポンスの構築
            processing_time = int((time.time() - start_time) * 1000)
            
            response = ActivityRecommendationResponse(
                success=True,
                request_id=request_id,
                processing_time_ms=processing_time,
                recommendations=recommendations[:10],  # 上位10件
                research_metadata=ResearchMetadata(
                    stations_analyzed=len(stations),
                    venues_researched=sum(
                        len(r["activities"]) 
                        for r in research_results 
                        if r["activities"]
                    ),
                    research_loops_executed=min(
                        self.settings.MAX_RESEARCH_LOOPS,
                        len(stations)
                    ),
                    data_sources=["Gemini AI", "Station Database", "Real-time APIs"]
                )
            )
            
            return response
            
        except Exception as e:
            return ActivityRecommendationResponse(
                success=False,
                request_id=request_id,
                processing_time_ms=int((time.time() - start_time) * 1000),
                recommendations=[],
                research_metadata=ResearchMetadata(
                    stations_analyzed=0,
                    venues_researched=0,
                    research_loops_executed=0,
                    data_sources=[]
                ),
                error_message=str(e)
            )
    
    async def _parallel_research(
        self,
        stations,
        group_info,
        activity_types,
        current_time
    ) -> List[dict]:
        """並列で駅の研究を実行"""
        
        # セマフォで同時実行数を制限
        semaphore = asyncio.Semaphore(self.settings.MAX_CONCURRENT_RESEARCH)
        
        async def research_with_semaphore(station):
            async with semaphore:
                try:
                    activities = await asyncio.wait_for(
                        self.gemini_agent.research_station_activities(
                            station,
                            group_info,
                            activity_types,
                            current_time
                        ),
                        timeout=self.settings.RESEARCH_TIMEOUT_SECONDS
                    )
                    return {
                        "station": station,
                        "activities": activities,
                        "success": True,
                        "error": None
                    }
                except asyncio.TimeoutError:
                    error_msg = f"Research timeout for {station.station_name}"
                    print(error_msg)
                    return {
                        "station": station,
                        "activities": [],
                        "success": False,
                        "error": error_msg
                    }
                except GeminiAPIError as e:
                    error_msg = f"Gemini API error for {station.station_name}: {str(e)}"
                    print(error_msg)
                    return {
                        "station": station,
                        "activities": [],
                        "success": False,
                        "error": error_msg
                    }
                except Exception as e:
                    error_msg = f"Unexpected error for {station.station_name}: {str(e)}"
                    print(error_msg)
                    return {
                        "station": station,
                        "activities": [],
                        "success": False,
                        "error": error_msg
                    }
        
        # 全駅の研究を並列実行
        tasks = [research_with_semaphore(station) for station in stations]
        results = await asyncio.gather(*tasks)
        
        # 成功した結果のみ返す
        successful_results = [r for r in results if r["success"] and r["activities"]]
        
        # すべての駅で失敗した場合はエラーを発生
        if not successful_results:
            failed_errors = [r["error"] for r in results if not r["success"]]
            error_summary = "; ".join(failed_errors[:3])  # 最初の3つのエラーのみ表示
            raise HTTPException(
                status_code=503,
                detail=f"All station research failed. Errors: {error_summary}"
            )
        
        return successful_results
    
    def _create_recommendations(
        self,
        research_results: List[dict],
        group_info,
        context
    ) -> List[Recommendation]:
        """研究結果から推奨リストを作成"""
        
        recommendations = []
        
        for idx, result in enumerate(research_results):
            station = result["station"]
            activities = result["activities"]
            
            # スコア計算（簡略版）
            score = self._calculate_score(
                station,
                activities,
                group_info,
                context
            )
            
            # 推奨理由の生成
            reason = self._generate_reason(
                station,
                activities,
                group_info
            )
            
            # コスト見積もり
            estimated_cost = self._estimate_cost(
                activities,
                group_info
            )
            
            # 天候適合性
            weather_suitability = self._check_weather_suitability(
                activities,
                context
            )
            
            recommendation = Recommendation(
                rank=idx + 1,
                station_info=StationInfo(
                    name=station.station_name,
                    lines=station.lines,
                    distance_from_user_m=int(station.distance_km * 1000),
                    travel_time_min=int(station.distance_km * 3)  # 簡略計算
                ),
                activities=activities,
                overall_score=round(score, 1),
                recommendation_reason=reason,
                estimated_total_cost=estimated_cost,
                weather_suitability=weather_suitability
            )
            
            recommendations.append(recommendation)
        
        # スコアで並び替え
        recommendations.sort(key=lambda x: x.overall_score, reverse=True)
        
        # ランクを再設定
        for idx, rec in enumerate(recommendations):
            rec.rank = idx + 1
        
        return recommendations
    
    def _calculate_score(
        self,
        station,
        activities: List[ActivityCategory],
        group_info,
        context
    ) -> float:
        """推奨スコアを計算"""
        
        score = 5.0  # ベーススコア
        
        # 距離による減点（近いほど高スコア）
        if station.distance_km < 2:
            score += 2.0
        elif station.distance_km < 5:
            score += 1.0
        elif station.distance_km > 10:
            score -= 1.0
        
        # アクティビティの充実度
        total_venues = sum(len(cat.venues) for cat in activities)
        if total_venues > 10:
            score += 1.5
        elif total_venues > 5:
            score += 0.5
        
        # 希望アクティビティのカバー率
        requested_types = set(group_info.member_moods)
        available_types = set(cat.category for cat in activities)
        coverage = len(requested_types.intersection(available_types)) / len(requested_types)
        score += coverage * 2.0
        
        # 大都市駅ボーナス
        if station.is_major_city_station:
            score += 0.5
        
        # スコアを0-10の範囲に正規化
        return min(max(score, 0), 10)
    
    def _generate_reason(
        self,
        station,
        activities: List[ActivityCategory],
        group_info
    ) -> str:
        """推奨理由を生成"""
        
        reasons = []
        
        # アクティビティのマッチング
        matched_moods = []
        for mood in group_info.member_moods:
            if any(cat.category == mood for cat in activities):
                matched_moods.append(mood.value)
        
        if matched_moods:
            reasons.append(f"グループの気分「{'、'.join(matched_moods)}」に最適")
        
        # 駅の特徴
        if station.distance_km < 2:
            reasons.append("現在地から非常に近い")
        
        if station.is_major_city_station:
            reasons.append("多様な選択肢がある主要駅")
        
        # 人数への適合性
        total_venues = sum(len(cat.venues) for cat in activities)
        if total_venues > 10:
            reasons.append(f"{group_info.member_count}名のグループに適した店舗が豊富")
        
        return "。".join(reasons) + "。"
    
    def _estimate_cost(
        self,
        activities: List[ActivityCategory],
        group_info
    ) -> str:
        """総コストを見積もる"""
        
        # 予算範囲に基づく見積もり
        cost_ranges = {
            "low": (500, 1500),
            "medium": (1500, 4500),
            "high": (4500, 10000)
        }
        
        min_cost, max_cost = cost_ranges.get(
            group_info.budget_range.value,
            (1000, 5000)
        )
        
        total_min = min_cost * group_info.member_count
        total_max = max_cost * group_info.member_count
        
        return f"¥{total_min:,}-{total_max:,}"
    
    def _check_weather_suitability(
        self,
        activities: List[ActivityCategory],
        context
    ) -> str:
        """天候適合性をチェック"""
        
        # 屋内施設の割合を計算
        total_venues = 0
        indoor_venues = 0
        
        for cat in activities:
            for venue in cat.venues:
                total_venues += 1
                # 簡略化: カフェ、飲み、映画、ショッピングは屋内と仮定
                if cat.category in [
                    "お茶・カフェ", "軽く飲み", "映画", "買い物・ショッピング"
                ]:
                    indoor_venues += 1
        
        if total_venues == 0:
            return "情報不足"
        
        indoor_ratio = indoor_venues / total_venues
        
        if indoor_ratio > 0.8:
            return "雨天でも屋内施設充実"
        elif indoor_ratio > 0.5:
            return "天候に左右されにくい"
        else:
            return "晴天時推奨"


# サービスのシングルトンインスタンス
recommendation_service = RecommendationService()


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
    
    return await recommendation_service.generate_recommendations(request)