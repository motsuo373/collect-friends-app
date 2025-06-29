import asyncio
from typing import List, Dict, Any
from app.schemas import (
    RecommendationRequest, SSEMessage, 
    StatusUpdateEvent, FinalReportEvent,
    ResearchUpdateEvent, ResearchCompleteEvent
)
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.enums import ResponseStatus, ResearchStatus
from app.services.station_search import StationSearchService
from app.utils.distance import calculate_travel_time_min

settings = get_settings()
logger = get_logger(__name__)


class Coordinator:
    """
    リクエストを受け取り、全体の処理フローを管理するコーディネーター
    """
    
    def __init__(self):
        self.settings = settings
        self.station_search = StationSearchService()
        self.semaphore = asyncio.Semaphore(settings.max_concurrent_research)
        
    async def process_request(
        self,
        request: RecommendationRequest,
        request_id: str,
        event_queue: asyncio.Queue
    ) -> None:
        """
        リクエストを処理し、結果をイベントキューに送信
        
        Args:
            request: 推薦リクエスト
            request_id: リクエストID
            event_queue: イベント送信用のキュー
        """
        
        try:
            # ステータス更新を送信
            await self._send_status_update(
                event_queue,
                "ユーザー情報から駅候補を検索中...",
                "STATION_SEARCH"
            )
            
            # 駅候補の検索
            stations = await self._search_station_candidates(request)
            
            station_names = [s["name"] for s in stations]
            await self._send_status_update(
                event_queue,
                f"候補駅を特定しました: {', '.join(station_names[:5])}{'...' if len(station_names) > 5 else ''}",
                "STATION_IDENTIFIED",
                stations=station_names
            )
            
            # 各駅の並列調査
            research_results = await self._conduct_parallel_research(
                request, stations, request_id, event_queue
            )
            
            # 成功した調査結果のみを抽出
            successful_results = [r for r in research_results if r is not None]
            
            # 調査品質の計算
            research_quality = len(successful_results) / len(stations) if stations else 0
            
            # 最終集約処理
            if successful_results:
                recommendations = await self._aggregate_results(
                    successful_results, request
                )
                status = ResponseStatus.COMPLETE if research_quality == 1.0 else ResponseStatus.PARTIAL
            else:
                recommendations = []
                status = ResponseStatus.FAILED
            
            # 最終レポートを送信
            final_report = FinalReportEvent(
                status=status,
                research_quality=research_quality,
                request_id=request_id,
                recommendations=recommendations
            )
            
            await event_queue.put(SSEMessage(
                event="final_report",
                data=final_report.dict()
            ))
            
            # ストリーム終了を送信
            await event_queue.put(SSEMessage(
                event="stream_end",
                data={"message": "処理が完了しました。"}
            ))
            
        except Exception as e:
            logger.error(
                f"Coordinator error: {str(e)}",
                extra={"request_id": request_id}
            )
            raise
    
    async def _send_status_update(
        self,
        event_queue: asyncio.Queue,
        message: str,
        step: str,
        stations: List[str] = None
    ) -> None:
        """ステータス更新イベントを送信"""
        
        status_update = StatusUpdateEvent(
            message=message,
            step=step,
            stations=stations
        )
        
        await event_queue.put(SSEMessage(
            event="status_update",
            data=status_update.dict()
        ))
    
    async def _search_station_candidates(
        self,
        request: RecommendationRequest
    ) -> List[Dict]:
        """駅候補を検索"""
        
        lat, lon = request.get_normalized_location()
        
        # 近傍駅検索
        nearby_stations = await self.station_search.search_nearby_stations(
            lat, lon,
            request.get_search_radius_km(),
            request.get_max_stations()
        )
        
        # 最寄りの大都市駅を検索
        major_station = self.station_search.find_nearest_major_station(lat, lon)
        
        # マージと重複排除
        stations = self.station_search.merge_and_deduplicate_stations(
            nearby_stations, major_station
        )
        
        # 移動時間を計算
        for station in stations:
            station["travel_time_min"] = calculate_travel_time_min(
                station["distance_m"], "train"
            )
        
        return stations
    
    async def _conduct_parallel_research(
        self,
        request: RecommendationRequest,
        stations: List[Dict],
        request_id: str,
        event_queue: asyncio.Queue
    ) -> List[Dict]:
        """各駅の並列調査を実行"""
        
        tasks = []
        for station in stations:
            task = asyncio.create_task(
                self._research_single_station(
                    station, request, request_id, event_queue
                )
            )
            tasks.append(task)
        
        # 全てのタスクの完了を待つ
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 例外が発生した場合はNoneに置き換え
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Station research failed: {str(result)}")
                processed_results.append(None)
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def _research_single_station(
        self,
        station: Dict,
        request: RecommendationRequest,
        request_id: str,
        event_queue: asyncio.Queue
    ) -> Dict:
        """単一駅の調査を実行"""
        
        async with self.semaphore:
            station_name = station["name"]
            
            # 調査開始イベント
            await self._send_research_update(
                event_queue,
                f"{station_name}の調査を開始...",
                station_name,
                ResearchStatus.IN_PROGRESS
            )
            
            try:
                # Station Research Graphを使用した実際の調査
                from research.graph import StationResearchGraph
                from research.state import ResearchState, Station
                
                # 研究状態を初期化
                research_state = ResearchState(
                    station=Station(
                        name=station["name"],
                        latitude=station["latitude"],
                        longitude=station["longitude"],
                        distance_from_user_km=station["distance_m"] / 1000
                    ),
                    user_location=(request.user_location.latitude, request.user_location.longitude),
                    activity_types=request.group_info.member_moods,
                    budget_range=request.group_info.budget_range,
                    member_count=request.group_info.member_count,
                    current_time=request.context.current_time
                )
                
                # LangGraphで駅を調査
                research_graph = StationResearchGraph()
                completed_state = await research_graph.research_station_with_timeout(
                    research_state,
                    timeout_seconds=self.settings.research_timeout_seconds,
                    thread_id=f"{request_id}_{station_name}"
                )
                
                # 結果を変換
                if completed_state.station_summary and completed_state.places_parsed:
                    # プレース情報を venues 形式に変換
                    venues = []
                    for place in completed_state.places_parsed[:5]:  # 上位5件
                        venues.append({
                            "name": place.name,
                            "rating": place.rating or 4.0,
                            "price_range": "¥" * (place.price_level or 2) if place.price_level else "価格情報なし",
                            "crowd_level": "medium",  # 仮実装
                            "operating_hours": "営業時間未確認",  # 仮実装
                            "walking_time_min": 5,  # 仮実装
                            "address": place.address,
                            "place_type": place.place_type
                        })
                    
                    research_result = {
                        "station": station,
                        "activities": [
                            {
                                "category": request.group_info.member_moods[0],
                                "venues": venues
                            }
                        ],
                        "summary": completed_state.station_summary,
                        "research_quality": 1.0 if not completed_state.errors else 0.7
                    }
                else:
                    # 調査失敗時のフォールバック
                    research_result = {
                        "station": station,
                        "activities": [],
                        "summary": f"{station_name}周辺の調査で十分な情報が取得できませんでした。",
                        "research_quality": 0.0,
                        "errors": completed_state.errors
                    }
                
                # 調査完了イベント
                await self._send_research_update(
                    event_queue,
                    f"{station_name}の調査が完了しました。",
                    station_name,
                    ResearchStatus.COMPLETED
                )
                
                return research_result
                
            except Exception as e:
                logger.error(
                    f"Station research failed for {station_name}: {str(e)}",
                    extra={"request_id": request_id}
                )
                
                # 調査失敗イベント
                await self._send_research_update(
                    event_queue,
                    f"{station_name}の調査に失敗しました。",
                    station_name,
                    ResearchStatus.FAILED
                )
                
                return None
    
    async def _aggregate_results(
        self,
        research_results: List[Dict],
        request: RecommendationRequest
    ) -> List[Dict]:
        """調査結果を集約してランキングを生成"""
        
        # Final Aggregator Agentを使用した実際の集約処理
        from app.services.aggregator import FinalAggregatorAgent
        
        aggregator = FinalAggregatorAgent()
        recommendations = await aggregator.aggregate_and_rank(research_results, request)
        
        return recommendations
    
    async def _send_research_update(
        self,
        event_queue: asyncio.Queue,
        message: str,
        station: str,
        status: ResearchStatus
    ) -> None:
        """調査更新イベントを送信"""
        
        research_update = ResearchUpdateEvent(
            message=message,
            station=station,
            status=status
        )
        
        await event_queue.put(SSEMessage(
            event="research_update",
            data=research_update.dict()
        ))