import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import get_settings
from app.schemas.request import RecommendationRequest
from app.schemas.response import RecommendationInfo, StationInfo, ActivityInfo

logger = logging.getLogger(__name__)


class FinalAggregatorAgent:
    """最終集約エージェント - 複数の駅調査結果を統合してランキングを生成"""
    
    def __init__(self):
        self.settings = get_settings()
        self.llm = ChatGoogleGenerativeAI(
            model=self.settings.gemini_model,
            google_api_key=self.settings.gemini_api_key,
            temperature=self.settings.gemini_temperature,
            top_p=self.settings.gemini_top_p
        )
        
    async def aggregate_and_rank(
        self,
        research_results: List[Dict[str, Any]],
        request: RecommendationRequest
    ) -> List[RecommendationInfo]:
        """
        複数の駅調査結果を統合し、最適なランキングを生成
        
        Args:
            research_results: 各駅の調査結果リスト
            request: 元のリクエスト
            
        Returns:
            ランキング済みの推薦リスト
        """
        try:
            logger.info(f"Aggregating {len(research_results)} research results")
            
            if not research_results:
                return []
            
            # 1. 各駅にスコアを付与
            scored_results = await self._score_stations(research_results, request)
            
            # 2. スコア順にソート
            ranked_results = sorted(scored_results, key=lambda x: x["total_score"], reverse=True)
            
            # 3. 上位結果を推薦形式に変換
            recommendations = []
            for rank, result in enumerate(ranked_results[:5], 1):  # 上位5位まで
                recommendation = await self._create_recommendation(
                    result, rank, request
                )
                recommendations.append(recommendation)
            
            logger.info(f"Generated {len(recommendations)} recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in aggregation: {e}")
            return self._create_fallback_recommendations(research_results, request)
    
    async def _score_stations(
        self, 
        research_results: List[Dict[str, Any]], 
        request: RecommendationRequest
    ) -> List[Dict[str, Any]]:
        """各駅にスコアを付与"""
        
        scored_results = []
        
        for result in research_results:
            try:
                station = result["station"]
                activities = result.get("activities", [])
                summary = result.get("summary", "")
                research_quality = result.get("research_quality", 0.5)
                
                # 基本スコア計算
                scores = await self._calculate_station_scores(
                    station, activities, summary, request
                )
                
                # 調査品質によるスコア調整
                for key in scores:
                    scores[key] *= research_quality
                
                # 総合スコア計算
                total_score = (
                    scores["activity_match"] * 0.3 +
                    scores["accessibility"] * 0.25 +
                    scores["venue_quality"] * 0.25 +
                    scores["budget_match"] * 0.2
                )
                
                scored_result = {
                    **result,
                    "scores": scores,
                    "total_score": total_score
                }
                
                scored_results.append(scored_result)
                
            except Exception as e:
                logger.error(f"Error scoring station {result.get('station', {}).get('name', 'unknown')}: {e}")
                # エラー時は低スコアで追加
                scored_results.append({
                    **result,
                    "scores": {"activity_match": 0, "accessibility": 0, "venue_quality": 0, "budget_match": 0},
                    "total_score": 0.1
                })
        
        return scored_results
    
    async def _calculate_station_scores(
        self,
        station: Dict[str, Any],
        activities: List[Dict[str, Any]],
        summary: str,
        request: RecommendationRequest
    ) -> Dict[str, float]:
        """LLMを使用して駅の各項目スコアを計算"""
        
        try:
            # アクティビティ情報を整理
            venue_list = []
            for activity in activities:
                for venue in activity.get("venues", []):
                    venue_list.append(f"- {venue.get('name', 'N/A')} (評価: {venue.get('rating', 'N/A')})")
            
            venues_text = "\n".join(venue_list) if venue_list else "利用可能な施設情報が見つかりませんでした。"
            
            prompt = ChatPromptTemplate.from_template(
                """あなたは旅行専門家です。以下の駅の情報を評価し、指定された条件との適合度をスコア化してください。

駅情報:
- 駅名: {station_name}
- ユーザーからの距離: {distance_km}km
- 移動時間: {travel_time}分

利用可能な施設:
{venues_text}

調査要約:
{summary}

ユーザーの条件:
- 希望アクティビティ: {activities}
- 予算帯: {budget}
- 人数: {member_count}人

以下の4項目を0.0-1.0の範囲でスコア化してください（小数点2桁まで）:

1. activity_match: 希望アクティビティとの適合度
2. accessibility: アクセシビリティ（距離・移動時間）
3. venue_quality: 施設の質と多様性
4. budget_match: 予算帯との適合度

回答は以下の形式で出力してください:
activity_match: 0.XX
accessibility: 0.XX
venue_quality: 0.XX
budget_match: 0.XX"""
            )
            
            chain = prompt | self.llm | StrOutputParser()
            
            response = await chain.ainvoke({
                "station_name": station.get("name", "不明"),
                "distance_km": round(station.get("distance_m", 0) / 1000, 1),
                "travel_time": station.get("travel_time_min", "不明"),
                "venues_text": venues_text,
                "summary": summary or "調査情報が不足しています。",
                "activities": ", ".join(request.group_info.member_moods),
                "budget": request.group_info.budget_range.value if request.group_info.budget_range else "指定なし",
                "member_count": request.group_info.member_count
            })
            
            # スコアを抽出
            scores = self._parse_scores_from_response(response)
            return scores
            
        except Exception as e:
            logger.error(f"Error calculating scores: {e}")
            # エラー時はデフォルトスコア
            return {
                "activity_match": 0.5,
                "accessibility": 0.5,
                "venue_quality": 0.5,
                "budget_match": 0.5
            }
    
    def _parse_scores_from_response(self, response: str) -> Dict[str, float]:
        """LLMレスポンスからスコアを抽出"""
        scores = {
            "activity_match": 0.5,
            "accessibility": 0.5,
            "venue_quality": 0.5,
            "budget_match": 0.5
        }
        
        try:
            lines = response.strip().split('\n')
            for line in lines:
                line = line.strip()
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip()
                    value = value.strip()
                    
                    if key in scores:
                        try:
                            scores[key] = max(0.0, min(1.0, float(value)))
                        except ValueError:
                            continue
        except Exception as e:
            logger.warning(f"Error parsing scores: {e}")
        
        return scores
    
    async def _create_recommendation(
        self,
        result: Dict[str, Any],
        rank: int,
        request: RecommendationRequest
    ) -> RecommendationInfo:
        """結果を推薦形式に変換"""
        
        station = result["station"]
        activities = result.get("activities", [])
        summary = result.get("summary", "")
        total_score = result.get("total_score", 0.5)
        
        # StationInfo作成
        station_info = StationInfo(
            name=station.get("name", "不明な駅"),
            distance_from_user_m=station.get("distance_m", 0),
            travel_time_min=station.get("travel_time_min", 0)
        )
        
        # ActivityInfo作成
        activity_infos = []
        for activity in activities:
            activity_info = ActivityInfo(
                category=activity.get("category", "その他"),
                venues=activity.get("venues", [])
            )
            activity_infos.append(activity_info)
        
        # 推薦理由を生成
        recommendation_reason = await self._generate_recommendation_reason(
            station, summary, total_score, request
        )
        
        # 総コスト見積もり
        estimated_cost = self._estimate_total_cost(activities, request)
        
        return RecommendationInfo(
            rank=rank,
            station_info=station_info,
            activities=activity_infos,
            overall_score=round(total_score * 10, 1),  # 10点満点に変換
            recommendation_reason=recommendation_reason,
            estimated_total_cost=estimated_cost
        )
    
    async def _generate_recommendation_reason(
        self,
        station: Dict[str, Any],
        summary: str,
        score: float,
        request: RecommendationRequest
    ) -> str:
        """推薦理由を生成"""
        
        try:
            prompt = ChatPromptTemplate.from_template(
                """あなたは旅行コンサルタントです。以下の情報を基に、なぜこの駅がおすすめなのかを簡潔に説明してください。

駅名: {station_name}
ユーザーからの距離: {distance_km}km
総合スコア: {score}/10.0

調査要約:
{summary}

ユーザーの条件:
- 希望アクティビティ: {activities}
- 人数: {member_count}人

推薦理由を1-2文で簡潔に説明してください。駅の魅力と条件との適合性を中心に。"""
            )
            
            chain = prompt | self.llm | StrOutputParser()
            
            reason = await chain.ainvoke({
                "station_name": station.get("name", "この駅"),
                "distance_km": round(station.get("distance_m", 0) / 1000, 1),
                "score": round(score * 10, 1),
                "summary": summary or "多様な施設があります。",
                "activities": ", ".join(request.group_info.member_moods),
                "member_count": request.group_info.member_count
            })
            
            return reason.strip()
            
        except Exception as e:
            logger.error(f"Error generating recommendation reason: {e}")
            return f"{station.get('name', 'この駅')}は良い選択肢です。"
    
    def _estimate_total_cost(
        self, 
        activities: List[Dict[str, Any]], 
        request: RecommendationRequest
    ) -> str:
        """総コスト見積もり"""
        
        try:
            # 予算帯が指定されている場合はそれを使用
            if request.group_info.budget_range:
                return request.group_info.budget_range.value
            
            # アクティビティから価格帯を推定
            total_min = 0
            total_max = 0
            
            for activity in activities:
                for venue in activity.get("venues", []):
                    price_range = venue.get("price_range", "¥¥")
                    if "¥" in price_range:
                        level = len([c for c in price_range if c == "¥"])
                        min_cost = level * 500  # ¥1つあたり500円と仮定
                        max_cost = level * 1500  # ¥1つあたり1500円と仮定
                        total_min += min_cost
                        total_max += max_cost
            
            if total_min > 0 and total_max > 0:
                # 人数分で計算
                total_min *= request.group_info.member_count
                total_max *= request.group_info.member_count
                return f"¥{total_min:,}-{total_max:,}"
            
            # デフォルト見積もり
            base_cost = 2000 * request.group_info.member_count
            return f"¥{base_cost:,}-{base_cost * 2:,}"
            
        except Exception as e:
            logger.error(f"Error estimating cost: {e}")
            return "¥1,500-4,500"
    
    def _create_fallback_recommendations(
        self,
        research_results: List[Dict[str, Any]],
        request: RecommendationRequest
    ) -> List[RecommendationInfo]:
        """エラー時のフォールバック推薦"""
        
        logger.warning("Creating fallback recommendations due to aggregation error")
        
        recommendations = []
        
        for i, result in enumerate(research_results[:3], 1):
            station = result.get("station", {})
            
            recommendation = RecommendationInfo(
                rank=i,
                station_info=StationInfo(
                    name=station.get("name", f"候補駅{i}"),
                    distance_from_user_m=station.get("distance_m", 0),
                    travel_time_min=station.get("travel_time_min", 0)
                ),
                activities=[
                    ActivityInfo(
                        category=request.group_info.member_moods[0] if request.group_info.member_moods else "その他",
                        venues=[
                            {
                                "name": f"{station.get('name', '駅')}周辺の施設",
                                "rating": 4.0,
                                "price_range": "¥¥",
                                "crowd_level": "medium",
                                "operating_hours": "営業時間未確認",
                                "walking_time_min": 5
                            }
                        ]
                    )
                ],
                overall_score=8.0 - i * 0.5,
                recommendation_reason=f"{station.get('name', 'この駅')}は基本的な条件を満たしています。",
                estimated_total_cost="¥1,500-4,500"
            )
            recommendations.append(recommendation)
        
        return recommendations