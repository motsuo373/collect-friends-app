import time
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

from app.models import (
    RestaurantRecommendationRequest,
    RestaurantRecommendationResponse,
    RestaurantInfo,
    StationWithRestaurants,
    RestaurantRecommendation,
    MoodType,
    ActivityType,
    BudgetRange,
    LocationData,
    CuisineType,
    TimeOfDay,
    SceneType,
    SpecialRequirement,
    TransportMode,
    SearchInfo
)
from app.services.gemini_research import GeminiResearchAgent, GeminiAPIError
from app.services.google_places import GooglePlacesService, GooglePlacesAPIError
from app.config import get_settings


class RestaurantRecommendationService:
    """店舗推奨サービス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.places_service = GooglePlacesService()
        self.gemini_agent = GeminiResearchAgent()
    
    async def generate_restaurant_recommendations(
        self,
        request: RestaurantRecommendationRequest
    ) -> RestaurantRecommendationResponse:
        """店舗推奨を生成（拡張版）"""
        
        start_time = time.time()
        request_id = f"rest_req_{uuid.uuid4().hex[:8]}"
        
        try:
            print(f"🎯 Starting enhanced restaurant recommendation generation...")
            print(f"   Request ID: {request_id}")
            print(f"   User location: ({request.user_location.latitude}, {request.user_location.longitude})")
            print(f"   Activity type: {request.activity_type}")
            print(f"   Mood: {request.mood}")
            print(f"   Group size: {request.group_size}")
            print(f"   Time of day: {request.time_of_day}")
            print(f"   Scene type: {request.scene_type}")
            print(f"   Special requirements: {request.special_requirements}")
            print(f"   Preferred cuisines: {request.preferred_cuisine_types}")
            print(f"   Budget range: {request.budget_range}")
            print(f"   Min rating: {request.min_rating}")
            
            # 1. 近くの駅を検索
            print(f"🚉 Step 1: Searching for nearby stations...")
            stations = await self._search_nearby_stations(
                request.user_location,
                request.station_search_radius_km,
                request.max_stations
            )
            
            if not stations:
                processing_time = int((time.time() - start_time) * 1000)
                return RestaurantRecommendationResponse(
                    success=False,
                    request_id=request_id,
                    processing_time_ms=processing_time,
                    user_location=request.user_location,
                    searched_stations=[],
                    top_recommendations=[],
                    ai_analysis=None,
                    error_message=f"指定された範囲内（{request.station_search_radius_km}km）に駅が見つかりませんでした。"
                )
            
            print(f"✅ Found {len(stations)} stations")
            
            # 2. 各駅周辺の店舗を検索（拡張版）
            print(f"🍽️ Step 2: Enhanced restaurant search near each station...")
            stations_with_restaurants = await self._search_restaurants_near_stations_enhanced(
                stations,
                request
            )
            
            # 3. 全ての店舗を収集
            all_restaurants = []
            for station_data in stations_with_restaurants:
                for restaurant in station_data.restaurants:
                    all_restaurants.append((restaurant, station_data.station_info))
            
            if not all_restaurants:
                processing_time = int((time.time() - start_time) * 1000)
                return RestaurantRecommendationResponse(
                    success=False,
                    request_id=request_id,
                    processing_time_ms=processing_time,
                    user_location=request.user_location,
                    searched_stations=stations_with_restaurants,
                    top_recommendations=[],
                    ai_analysis=None,
                    error_message="検索された駅周辺に店舗が見つかりませんでした。"
                )
            
            print(f"✅ Found {len(all_restaurants)} restaurants across all stations")
            
            # 4. Gemini AIで最適な店舗を3つ選択（拡張版）
            print(f"🤖 Step 3: Enhanced AI analysis for top 3 recommendations...")
            top_recommendations, ai_analysis = await self._select_top_restaurants_with_ai_enhanced(
                all_restaurants,
                request
            )
            
            # 5. レスポンスを構築
            processing_time = int((time.time() - start_time) * 1000)
            
            print(f"🎉 Enhanced restaurant recommendation generation completed in {processing_time}ms")
            print(f"   Top recommendations: {len(top_recommendations)}")
            
            return RestaurantRecommendationResponse(
                success=True,
                request_id=request_id,
                processing_time_ms=processing_time,
                user_location=request.user_location,
                searched_stations=stations_with_restaurants,
                top_recommendations=top_recommendations,
                ai_analysis=ai_analysis,
                error_message=None
            )
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            print(f"❌ Error in enhanced restaurant recommendation generation: {e}")
            import traceback
            traceback.print_exc()
            
            return RestaurantRecommendationResponse(
                success=False,
                request_id=request_id,
                processing_time_ms=processing_time,
                user_location=request.user_location,
                searched_stations=[],
                top_recommendations=[],
                ai_analysis=None,
                error_message=f"予期しないエラーが発生しました: {str(e)}"
            )
    
    async def _search_nearby_stations(
        self,
        user_location: LocationData,
        radius_km: float,
        max_stations: int
    ) -> List:
        """近くの駅を検索"""
        
        radius_m = int(radius_km * 1000)
        
        # 駅タイプで検索
        station_types = [
            "train_station", "subway_station", "transit_station"
        ]
        
        try:
            stations = self.places_service.search_nearby_spots(
                user_location, radius_m, station_types, max_stations
            )
            
            print(f"📍 Found {len(stations)} stations within {radius_km}km")
            
            return stations[:max_stations]
            
        except Exception as e:
            print(f"❌ Error searching stations: {e}")
            return []
    
    async def _search_restaurants_near_stations_enhanced(
        self,
        stations: List,
        request: RestaurantRecommendationRequest
    ) -> List[StationWithRestaurants]:
        """各駅周辺の店舗を検索（拡張版）"""
        
        stations_with_restaurants = []
        radius_m = int(request.restaurant_search_radius_km * 1000)
        
        for station in stations:
            print(f"🔍 Enhanced search for restaurants near {station.station_name}...")
            
            station_location = LocationData(
                latitude=station.latitude,
                longitude=station.longitude
            )
            
            try:
                # 新しい拡張検索メソッドを使用
                restaurants = self.places_service.search_restaurants_near_location_enhanced(
                    location=station_location,
                    radius_m=radius_m,
                    max_results=request.max_restaurants_per_station,
                    activity_types=[act.value for act in request.activity_type],
                    time_of_day=request.time_of_day.value if request.time_of_day else None,
                    scene_type=request.scene_type.value if request.scene_type else None,
                    preferred_cuisine_types=[cuisine.value for cuisine in request.preferred_cuisine_types] if request.preferred_cuisine_types else None,
                    special_requirements=[req.value for req in request.special_requirements] if request.special_requirements else None,
                    min_rating=request.min_rating
                )
                
                print(f"   Found {len(restaurants)} restaurants near {station.station_name}")
                
                # StationWithRestaurantsオブジェクトを作成
                station_with_restaurants = StationWithRestaurants(
                    station_info=station,
                    restaurants=restaurants,
                    search_radius_km=request.restaurant_search_radius_km
                )
                
                stations_with_restaurants.append(station_with_restaurants)
                
            except Exception as e:
                print(f"❌ Error searching restaurants near {station.station_name}: {e}")
                # エラーが発生した場合でも空のリストで継続
                station_with_restaurants = StationWithRestaurants(
                    station_info=station,
                    restaurants=[],
                    search_radius_km=request.restaurant_search_radius_km
                )
                stations_with_restaurants.append(station_with_restaurants)
        
        return stations_with_restaurants
    
    def _map_cuisine_to_place_types(self, cuisine_types: List[str]) -> List[str]:
        """料理ジャンルをGoogle Places APIのタイプにマッピング"""
        cuisine_mapping = {
            "日本料理": ["japanese_restaurant", "sushi_restaurant"],
            "イタリア料理": ["italian_restaurant"],
            "中華料理": ["chinese_restaurant"],
            "韓国料理": ["korean_restaurant"],
            "アメリカ料理": ["american_restaurant"],
            "フランス料理": ["french_restaurant"],
            "カフェ": ["cafe"],
            "バー": ["bar"],
            "ファストフード": ["fast_food_restaurant"]
        }
        
        mapped_types = []
        for cuisine in cuisine_types:
            if cuisine in cuisine_mapping:
                mapped_types.extend(cuisine_mapping[cuisine])
        
        # デフォルトタイプも追加
        mapped_types.extend(["restaurant", "food"])
        
        return list(set(mapped_types))  # 重複を除去
    
    async def _select_top_restaurants_with_ai_enhanced(
        self,
        restaurant_station_pairs: List[Tuple[RestaurantInfo, any]],
        request: RestaurantRecommendationRequest
    ) -> Tuple[List[RestaurantRecommendation], str]:
        """Gemini AIを使って最適な店舗を3つ選択（拡張版）"""
        
        if len(restaurant_station_pairs) == 0:
            return [], "候補となる店舗が見つかりませんでした。"
        
        try:
            # 拡張プロンプトを生成
            prompt = self._build_restaurant_selection_prompt_enhanced(
                restaurant_station_pairs, request
            )
            
            print(f"🤖 Sending enhanced prompt to Gemini AI...")
            print(f"   Prompt length: {len(prompt)} characters")
            print(f"   Restaurant candidates: {len(restaurant_station_pairs)}")
            
            # Gemini APIに送信
            response_text = await self.gemini_agent.research_spots_info(prompt)
            
            print(f"✅ Received AI response: {len(response_text)} characters")
            
            # レスポンスをパース
            recommendations, analysis = self._parse_restaurant_selection_response_enhanced(
                response_text, restaurant_station_pairs, request
            )
            
            if recommendations:
                print(f"🎯 AI successfully selected {len(recommendations)} restaurants")
                return recommendations, analysis
            else:
                print("⚠️ AI selection failed, falling back to algorithm-based selection")
                fallback_recommendations = self._fallback_restaurant_selection_enhanced(
                    restaurant_station_pairs, request
                )
                return fallback_recommendations, "AI分析に失敗したため、アルゴリズムベースの推奨を使用しました。"
        
        except GeminiAPIError as e:
            print(f"❌ Gemini API Error: {e}")
            # フォールバック処理
            fallback_recommendations = self._fallback_restaurant_selection_enhanced(
                restaurant_station_pairs, request
            )
            return fallback_recommendations, f"AI分析でエラーが発生しました（{str(e)}）。アルゴリズムベースの推奨を使用しました。"
        
        except Exception as e:
            print(f"❌ Unexpected error in AI selection: {e}")
            import traceback
            traceback.print_exc()
            fallback_recommendations = self._fallback_restaurant_selection_enhanced(
                restaurant_station_pairs, request
            )
            return fallback_recommendations, f"予期しないエラーが発生しました（{str(e)}）。アルゴリズムベースの推奨を使用しました。"
    
    def _build_restaurant_selection_prompt_enhanced(
        self,
        restaurant_station_pairs: List[Tuple[RestaurantInfo, any]],
        request: RestaurantRecommendationRequest
    ) -> str:
        """拡張プロンプトを構築"""
        
        restaurants_info = []
        budget_text = {
            BudgetRange.LOW: "低価格（～¥1000/人）",
            BudgetRange.MEDIUM: "中価格（¥1000-3000/人）", 
            BudgetRange.HIGH: "高価格（¥3000～/人）"
        }.get(request.budget_range, "中価格")
        
        for i, (restaurant, station) in enumerate(restaurant_station_pairs, 1):
            rating_text = f"評価: {restaurant.rating:.1f}/5.0 ({restaurant.user_ratings_total}件)" if restaurant.rating else "評価: なし"
            price_text = f"価格レベル: {restaurant.price_level}/4" if restaurant.price_level else "価格レベル: 不明"
            cuisine_text = f"料理ジャンル: {restaurant.cuisine_type}" if restaurant.cuisine_type else "料理ジャンル: 不明"
            hours_text = f"営業時間: {restaurant.opening_hours}" if restaurant.opening_hours else "営業時間: 不明"
            
            restaurant_text = f"""
{i}. {restaurant.name}
   - タイプ: {restaurant.type}
   - {cuisine_text}
   - 住所: {restaurant.address}
   - 最寄り駅: {station.station_name} ({restaurant.distance_from_station_km}km)
   - {rating_text}
   - {price_text}
   - {hours_text}
"""
            restaurants_info.append(restaurant_text)
        
        activity_text = "、".join([act.value for act in request.activity_type])
        mood_text = "、".join([m.value for m in request.mood])
        cuisine_text = "、".join([cuisine.value for cuisine in request.preferred_cuisine_types]) if request.preferred_cuisine_types else "特になし"
        
        # 新しいパラメータのテキスト化
        time_text = request.time_of_day.value if request.time_of_day else "特になし"
        scene_text = request.scene_type.value if request.scene_type else "特になし"
        special_req_text = "、".join([req.value for req in request.special_requirements]) if request.special_requirements else "特になし"
        transport_text = request.transport_mode.value if request.transport_mode else "walking_only"
        
        # 時間帯説明の追加
        time_description = {
            "breakfast": "朝食時間帯（6:00-10:00）",
            "brunch": "ブランチ時間帯（10:00-14:00）",
            "lunch": "ランチ時間帯（11:00-15:00）",
            "afternoon": "午後時間帯（14:00-17:00）",
            "dinner": "ディナー時間帯（17:00-21:00）",
            "night": "夜時間帯（21:00-24:00）",
            "late_night": "深夜時間帯（24:00-6:00）"
        }.get(request.time_of_day.value if request.time_of_day else "", "")
        
        # シーン説明の追加
        scene_description = {
            "date": "デート",
            "first_date": "初回デート",
            "anniversary": "記念日",
            "birthday": "誕生日",
            "business": "ビジネス",
            "family": "家族",
            "friends": "友人",
            "colleagues": "同僚",
            "celebration": "お祝い",
            "casual_meetup": "カジュアルな会合",
            "group_party": "グループパーティー",
            "solo": "一人"
        }.get(request.scene_type.value if request.scene_type else "", "")
        
        prompt = f"""
あなたは日本の飲食店推奨の専門家です。以下の条件とリストから最適な店舗を3つ選択してください。

## 利用者条件:
- アクティビティ: {activity_text}
- 雰囲気・気分: {mood_text}
- 人数: {request.group_size}人
- 予算: {budget_text}
- 好みの料理ジャンル: {cuisine_text}
- 時間帯: {time_text} {time_description}
- シーン・場面: {scene_text} {scene_description}
- 特別要求: {special_req_text}
- 交通手段: {transport_text}
- 最低評価: {request.min_rating or "特になし"}

## 選択基準:
1. 上記の条件に最も適している
2. 時間帯とシーンに適している
3. グループサイズに適している
4. 評価が高く信頼できる
5. 特別要求を満たしている

## 候補店舗リスト:
{chr(10).join(restaurants_info)}

## 回答形式:
以下の形式で厳密に回答してください：

**1位**: [店舗番号] [店舗名]
**推奨理由**: 詳細な理由（時間帯、シーン、特別要求への対応含む）

**2位**: [店舗番号] [店舗名]  
**推奨理由**: 詳細な理由（時間帯、シーン、特別要求への対応含む）

**3位**: [店舗番号] [店舗名]
**推奨理由**: 詳細な理由（時間帯、シーン、特別要求への対応含む）

**総合分析**: 選択理由の総合的な分析（3-4行）
"""
        
        return prompt
    
    def _parse_restaurant_selection_response_enhanced(
        self,
        response_text: str,
        restaurant_station_pairs: List[Tuple[RestaurantInfo, any]],
        request: RestaurantRecommendationRequest
    ) -> Tuple[List[RestaurantRecommendation], str]:
        """Gemini AIの応答を解析（拡張版）"""
        
        lines = response_text.strip().split('\n')
        recommendations = []
        analysis = "AI推奨による選択"
        
        # 選択された店舗情報を解析
        selected_indices = []
        reasons = []
        mood_matches = []
        
        for line in lines:
            line = line.strip()
            
            # 選択行の解析
            if line.startswith('選択') and ':' in line:
                try:
                    import re
                    numbers = re.findall(r'\d+', line)
                    if numbers:
                        selected_indices.append(int(numbers[0]) - 1)  # 1-based to 0-based
                except:
                    continue
            
            # 理由行の解析
            elif line.startswith('理由') and ':' in line:
                reason = line.split(':', 1)[1].strip()
                reasons.append(reason)
            
            # 気分マッチ行の解析
            elif line.startswith('マッチする気分') and ':' in line:
                mood_text = line.split(':', 1)[1].strip()
                # 気分テキストから該当するMoodTypeを探す
                matched_moods = []
                for m in request.mood:
                    if m.value in mood_text:
                        matched_moods.append(m)
                mood_matches.append(matched_moods if matched_moods else [request.mood[0]])
            
            # 総合分析行の解析
            elif line.startswith('総合分析') and ':' in line:
                analysis = line.split(':', 1)[1].strip()
        
        # レコメンデーション作成
        for i, idx in enumerate(selected_indices):
            if 0 <= idx < len(restaurant_station_pairs):
                restaurant, station = restaurant_station_pairs[idx]
                
                reason = reasons[i] if i < len(reasons) else "AI推奨による選択"
                mood_match = mood_matches[i] if i < len(mood_matches) else [request.mood[0]]
                
                # スコア計算（1位が最高点）
                score = 10.0 - (i * 0.5)
                
                rec = RestaurantRecommendation(
                    restaurant=restaurant,
                    station_info=station,
                    recommendation_score=score,
                    reason=reason,
                    activity_match=request.activity_type[:1],  # 最初のアクティビティをマッチとする
                    mood_match=mood_match
                )
                recommendations.append(rec)
        
        # 3つ未満の場合はフォールバックで補完
        if len(recommendations) < 3:
            fallback_recommendations = self._fallback_restaurant_selection_enhanced(
                restaurant_station_pairs, request
            )
            
            # 既に選択済みの店舗を除外
            selected_restaurant_ids = {rec.restaurant.place_id for rec in recommendations}
            
            for fallback_rec in fallback_recommendations:
                if len(recommendations) >= 3:
                    break
                if fallback_rec.restaurant.place_id not in selected_restaurant_ids:
                    recommendations.append(fallback_rec)
        
        return recommendations[:3], analysis
    
    def _fallback_restaurant_selection_enhanced(
        self,
        restaurant_station_pairs: List[Tuple[RestaurantInfo, any]],
        request: RestaurantRecommendationRequest
    ) -> List[RestaurantRecommendation]:
        """フォールバック選択（拡張版）"""
        
        def calculate_restaurant_score(restaurant: RestaurantInfo) -> float:
            score = 5.0
            
            # 評価による加点（最大3点追加）
            if restaurant.rating:
                rating_bonus = min((restaurant.rating - 3.0) * 1, 3.0)  # 3.0以上で評価、最大3点
                score += rating_bonus
                
                if restaurant.user_ratings_total:
                    if restaurant.user_ratings_total >= 100:
                        score += 1.0  # 1.5→1.0に調整
                    elif restaurant.user_ratings_total >= 50:
                        score += 0.5  # 1.0→0.5に調整
            
            # 距離による調整（最大1点追加、最小1点減算）
            if restaurant.distance_from_station_km <= 0.3:
                score += 1.0  # 2.0→1.0に調整
            elif restaurant.distance_from_station_km <= 0.5:
                score += 0.5  # 1.0→0.5に調整
            elif restaurant.distance_from_station_km <= 1.0:
                pass  # 減点なし
            else:
                distance_penalty = min((restaurant.distance_from_station_km - 1.0) * 0.3, 1.0)
                score -= distance_penalty
            
            # 価格レベルによる調整（最大0.5点追加）
            if restaurant.price_level:
                if request.budget_range == BudgetRange.LOW and restaurant.price_level <= 2:
                    score += 0.5  # 1.0→0.5に調整
                elif request.budget_range == BudgetRange.MEDIUM and restaurant.price_level in [2, 3]:
                    score += 0.5  # 1.0→0.5に調整
                elif request.budget_range == BudgetRange.HIGH and restaurant.price_level >= 3:
                    score += 0.5  # 1.0→0.5に調整
            
            # スコアを10点満点以下に制限
            return min(max(score, 0.0), 10.0)
        
        # スコア計算してソート
        scored_pairs = []
        for restaurant, station in restaurant_station_pairs:
            score = calculate_restaurant_score(restaurant)
            scored_pairs.append((restaurant, station, score))
        
        scored_pairs.sort(key=lambda x: x[2], reverse=True)
        
        # 上位3つを選択
        recommendations = []
        for i, (restaurant, station, score) in enumerate(scored_pairs[:3]):
            rec = RestaurantRecommendation(
                restaurant=restaurant,
                station_info=station,
                recommendation_score=score,
                reason=f"高評価・アクセス良好な{restaurant.type}として選択",
                activity_match=request.activity_type[:1],  # 最初のアクティビティをマッチとする
                mood_match=request.mood[:1]  # 最初の気分をマッチとする
            )
            recommendations.append(rec)
        
        return recommendations
    
    # 後方互換性のための古いメソッド
    async def _search_restaurants_near_stations(
        self,
        stations: List,
        radius_km: float,
        max_restaurants_per_station: int,
        preferred_cuisine_types: Optional[List[str]] = None
    ) -> List[StationWithRestaurants]:
        """各駅周辺の店舗を検索（後方互換性）"""
        # 古いスタイルのリクエストを新しいスタイルに変換
        from app.models import (
            RestaurantRecommendationRequest, LocationData, ActivityType, MoodType
        )
        
        # デフォルトの値でリクエストを作成
        dummy_request = RestaurantRecommendationRequest(
            user_location=LocationData(latitude=0, longitude=0),
            activity_type=[ActivityType.FOOD],
            mood=[MoodType.CASUAL],
            group_size=2,
            restaurant_search_radius_km=radius_km,
            max_restaurants_per_station=max_restaurants_per_station,
            preferred_cuisine_types=[CuisineType(cuisine.lower()) for cuisine in preferred_cuisine_types if cuisine.lower() in [c.value for c in CuisineType]] if preferred_cuisine_types else None
        )
        
        return await self._search_restaurants_near_stations_enhanced(stations, dummy_request)
    
    async def _select_top_restaurants_with_ai(
        self,
        restaurant_station_pairs: List[Tuple[RestaurantInfo, any]],
        activity_type: List[ActivityType],
        mood: List[MoodType],
        group_size: int,
        budget_range: BudgetRange,
        preferred_cuisine_types: Optional[List[str]] = None
    ) -> Tuple[List[RestaurantRecommendation], str]:
        """Gemini AIで最適な店舗を3つ選択（後方互換性）"""
        from app.models import RestaurantRecommendationRequest, LocationData
        
        # 古いスタイルのパラメータを新しいスタイルに変換
        dummy_request = RestaurantRecommendationRequest(
            user_location=LocationData(latitude=0, longitude=0),
            activity_type=activity_type,
            mood=mood,
            group_size=group_size,
            budget_range=budget_range,
            preferred_cuisine_types=[CuisineType(cuisine.lower()) for cuisine in preferred_cuisine_types if cuisine.lower() in [c.value for c in CuisineType]] if preferred_cuisine_types else None
        )
        
        return await self._select_top_restaurants_with_ai_enhanced(restaurant_station_pairs, dummy_request)
    
    async def recommend_restaurants_async(
        self,
        user_location: LocationData,
        activity_type: List[ActivityType],
        mood: List[MoodType],
        group_size: int = 2,
        time_of_day: Optional[TimeOfDay] = None,
        scene_type: Optional[SceneType] = None,
        casual_level: Optional[str] = "casual",
        max_price_per_person: Optional[int] = 3000,
        prefer_chain_stores: bool = True,
        exclude_high_end: bool = True,
        **kwargs
    ) -> RestaurantRecommendationResponse:
        """
        友人向けカジュアル店舗推奨（2店舗）
        """
        try:
            start_time = time.time()
            logger.info(f"🍻 Starting CASUAL restaurant recommendation for {group_size} people")
            logger.info(f"   Activities: {[a.value for a in activity_type]}")
            logger.info(f"   Moods: {[m.value for m in mood]}")
            logger.info(f"   Casual level: {casual_level}")
            logger.info(f"   Max price: ¥{max_price_per_person}/person")
            logger.info(f"   Prefer chains: {prefer_chain_stores}")

            # 1. 近くの駅を検索（範囲を狭める）
            logger.info("🚉 Searching nearby stations...")
            nearby_stations = self.places_service.search_nearby_spots(
                user_location=user_location,
                radius_m=int(kwargs.get('station_search_radius_km', 3.0) * 1000),
                included_types=["train_station"],
                max_results=kwargs.get('max_stations', 3)  # 3駅に削減
            )

            if not nearby_stations:
                logger.warning("No nearby stations found")
                return RestaurantRecommendationResponse(
                    success=False,
                    recommendations=[],
                    search_info=SearchInfo(
                        search_radius_km=3.0,
                        stations_searched=0,
                        total_restaurants_found=0,
                        processing_time_ms=int((time.time() - start_time) * 1000)
                    ),
                    error_message="近くに駅が見つかりませんでした"
                )

            logger.info(f"Found {len(nearby_stations)} nearby stations")

            # 2. カジュアル向け駅周辺店舗検索
            all_restaurants = []
            total_restaurants_found = 0

            for station in nearby_stations[:3]:  # 最大3駅
                logger.info(f"🔍 Searching around {station.station_name}...")
                
                # カジュアル志向の新しい検索メソッドを使用
                station_restaurants = self.places_service.search_casual_restaurants_near_location(
                    location=LocationData(
                        latitude=station.latitude,
                        longitude=station.longitude
                    ),
                    radius_m=int(kwargs.get('restaurant_search_radius_km', 0.8) * 1000),
                    max_results=kwargs.get('max_restaurants_per_station', 6),  # 6件に削減
                    activity_types=[a.value for a in activity_type],
                    time_of_day=time_of_day.value if time_of_day else None,
                    scene_type=scene_type.value if scene_type else "friends",
                    casual_level=casual_level,
                    max_price_per_person=max_price_per_person,
                    prefer_chain_stores=prefer_chain_stores,
                    exclude_high_end=exclude_high_end,
                    min_rating=kwargs.get('min_rating', 3.5)
                )

                # 駅情報を各レストランに追加
                for restaurant in station_restaurants:
                    restaurant.station_info = station

                all_restaurants.extend(station_restaurants)
                total_restaurants_found += len(station_restaurants)
                
                logger.info(f"Found {len(station_restaurants)} casual restaurants near {station.station_name}")

            if not all_restaurants:
                logger.warning("No restaurants found around any station")
                return RestaurantRecommendationResponse(
                    success=False,
                    recommendations=[],
                    search_info=SearchInfo(
                        search_radius_km=3.0,
                        stations_searched=len(nearby_stations),
                        total_restaurants_found=0,
                        processing_time_ms=int((time.time() - start_time) * 1000)
                    ),
                    error_message="条件に合う店舗が見つかりませんでした"
                )

            # 3. カジュアル向けAI選定（2店舗に削減）
            logger.info(f"🤖 AI selecting best 2 casual restaurants from {len(all_restaurants)} candidates...")
            
            selected_restaurants = await self._select_casual_restaurants_with_ai(
                restaurants=all_restaurants,
                activity_types=[a.value for a in activity_type],
                moods=[m.value for m in mood],
                group_size=group_size,
                time_of_day=time_of_day.value if time_of_day else None,
                scene_type=scene_type.value if scene_type else "friends",
                casual_level=casual_level,
                max_price_per_person=max_price_per_person,
                prefer_chain_stores=prefer_chain_stores
            )

            processing_time = int((time.time() - start_time) * 1000)
            logger.info(f"✅ Casual recommendation completed in {processing_time}ms")
            logger.info(f"   Selected {len(selected_restaurants)} casual restaurants")

            return RestaurantRecommendationResponse(
                success=True,
                recommendations=selected_restaurants,
                search_info=SearchInfo(
                    search_radius_km=kwargs.get('station_search_radius_km', 3.0),
                    stations_searched=len(nearby_stations),
                    total_restaurants_found=total_restaurants_found,
                    processing_time_ms=processing_time
                ),
                error_message=None
            )

        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            logger.error(f"Error in casual restaurant recommendation: {str(e)}")
            return RestaurantRecommendationResponse(
                success=False,
                recommendations=[],
                search_info=SearchInfo(
                    search_radius_km=0,
                    stations_searched=0,
                    total_restaurants_found=0,
                    processing_time_ms=processing_time
                ),
                error_message=f"推奨処理中にエラーが発生しました: {str(e)}"
            )

    async def _select_casual_restaurants_with_ai(
        self,
        restaurants: List[RestaurantInfo],
        activity_types: List[str],
        moods: List[str],
        group_size: int,
        time_of_day: Optional[str] = None,
        scene_type: str = "friends",
        casual_level: str = "casual",
        max_price_per_person: Optional[int] = 3000,
        prefer_chain_stores: bool = True
    ) -> List[RestaurantRecommendation]:
        """
        カジュアル志向のAI選定（2店舗限定）
        """
        if not restaurants:
            return []

        # カジュアル志向のプロンプト作成
        casual_prompt = self._create_casual_selection_prompt(
            restaurants, activity_types, moods, group_size,
            time_of_day, scene_type, casual_level, max_price_per_person, prefer_chain_stores
        )

        try:
            # Gemini 1.5 Flash 8b を使用（高速＋低コスト）
            response = await self.gemini_agent.generate_content_async(
                prompt=casual_prompt,
                model_name="gemini-1.5-flash-8b"
            )

            logger.info(f"🤖 Gemini casual selection response length: {len(response)}")

            # レスポンス解析（2店舗限定）
            selected_restaurants = self._parse_casual_selection_response(
                response, restaurants
            )

            # カジュアルスコアとprice_estimateを追加
            for recommendation in selected_restaurants:
                if hasattr(recommendation.restaurant, 'casual_score'):
                    recommendation.casual_score = recommendation.restaurant.casual_score
                else:
                    recommendation.casual_score = 5.0

                # 価格推定（簡単なロジック）
                if recommendation.restaurant.price_level:
                    if recommendation.restaurant.price_level <= 2:
                        recommendation.estimated_price_per_person = 2000
                    elif recommendation.restaurant.price_level == 3:
                        recommendation.estimated_price_per_person = 3000
                    else:
                        recommendation.estimated_price_per_person = 4000
                else:
                    recommendation.estimated_price_per_person = max_price_per_person or 3000

            logger.info(f"✅ Selected {len(selected_restaurants)} casual restaurants with AI")
            return selected_restaurants[:2]  # 確実に2店舗以下

        except Exception as e:
            logger.error(f"Error in AI casual selection: {str(e)}")
            # フォールバック：スコア順で上位2店舗を選択
            fallback_restaurants = sorted(
                restaurants, 
                key=lambda x: getattr(x, 'composite_score', x.rating or 0), 
                reverse=True
            )[:2]

            recommendations = []
            for i, restaurant in enumerate(fallback_restaurants):
                recommendation = RestaurantRecommendation(
                    restaurant=restaurant,
                    station_info=getattr(restaurant, 'station_info', None),
                    recommendation_score=8.0 - i * 0.5,
                    reason=f"カジュアルな{restaurant.type}として、評価{restaurant.rating}で友人との時間に適しています",
                    activity_match=[ActivityType(a) for a in activity_types if a in [at.value for at in ActivityType]],
                    mood_match=[MoodType(m) for m in moods if m in [mt.value for mt in MoodType]],
                    casual_score=getattr(restaurant, 'casual_score', 5.0),
                    estimated_price_per_person=max_price_per_person or 3000
                )
                recommendations.append(recommendation)

            return recommendations

    def _create_casual_selection_prompt(
        self,
        restaurants: List[RestaurantInfo],
        activity_types: List[str],
        moods: List[str],
        group_size: int,
        time_of_day: Optional[str],
        scene_type: str,
        casual_level: str,
        max_price_per_person: Optional[int],
        prefer_chain_stores: bool
    ) -> str:
        """カジュアル志向の選定プロンプト作成"""
        
        # レストラン情報をコンパクトに整理
        restaurant_info = ""
        for i, restaurant in enumerate(restaurants):
            casual_score = getattr(restaurant, 'casual_score', 5.0)
            price_level = restaurant.price_level or 2
            price_indicator = "￥" * min(price_level, 4)
            
            restaurant_info += f"""
{i+1}. {restaurant.name}
   - タイプ: {restaurant.type} | 料理: {restaurant.cuisine_type or '一般'}
   - 評価: {restaurant.rating or 'N/A'}★ ({restaurant.user_ratings_total or 0}件)
   - 価格: {price_indicator} | カジュアル度: {casual_score:.1f}/10
   - 住所: {restaurant.address}
   - 駅から: {restaurant.distance_from_station_km:.1f}km
"""

        scene_description = {
            "friends": "友人と気軽に遊びに行く",
            "casual_meetup": "カジュアルな集まり",
            "group_party": "仲間でワイワイ楽しむ",
            "date": "カジュアルなデート"
        }.get(scene_type, "友人と気軽に")

        time_context = f"（{time_of_day}）" if time_of_day else ""

        # アクティビティに応じた具体的なアドバイス
        activity_advice = ""
        if "drink" in activity_types:
            activity_advice += "\n**飲みに関する重要なポイント**:\n"
            activity_advice += "- 居酒屋、飲み屋、バー、立ち飲み、ビアガーデンなどの店舗を優先\n"
            activity_advice += "- 「レストラン」でも居酒屋風の雰囲気があれば積極的に選択\n"
            activity_advice += "- 飲み放題やハッピーアワーがある店舗を優遇\n"
            activity_advice += "- 友人同士で気軽に乾杯できる雰囲気を重視\n"

        return f"""あなたは友人同士で気軽に遊びに行ける店舗を推奨するエキスパートです。

## 今回のシーン
- 目的: {scene_description}{time_context}
- 人数: {group_size}人
- アクティビティ: {', '.join(activity_types)}
- 気分: {', '.join(moods)}
- 予算: 1人{max_price_per_person or 3000}円程度
- カジュアル度: {casual_level}

## 重要な選定基準（優先順）
1. **気軽さ**: 予約不要、敷居が低い、友人と行きやすい
2. **価格**: 1人{max_price_per_person or 3000}円以下、コスパが良い
3. **雰囲気**: 友人同士で楽しめる、堅苦しくない
4. **チェーン店優遇**: {'安心感があり利用しやすい' if prefer_chain_stores else '個性的な店も考慮'}
5. **アクセス**: 駅から近い、行きやすい
{activity_advice}

## 店舗候補
{restaurant_info}

## 指示
上記の候補から、友人と気軽に行けるおすすめの店舗を**2つだけ**選んでください。

各店舗について以下の形式で回答してください：

### おすすめ1: [店舗名]
- 推奨スコア: X/10
- 理由: （気軽さ、価格、雰囲気の観点から、なぜ友人との時間に最適か150文字以内で説明）
- マッチするアクティビティ: [該当するものを選択]
- マッチする気分: [該当するものを選択]

### おすすめ2: [店舗名]
- 推奨スコア: X/10  
- 理由: （1つ目とは違う魅力を、150文字以内で説明）
- マッチするアクティビティ: [該当するものを選択]
- マッチする気分: [該当するものを選択]

**注意**: 
- 推奨スコアは10点満点です
- 高級店や要予約店は避けてください
- 友人同士で気軽に楽しめることを最優先にしてください
- 日本では多くの居酒屋が「レストラン」カテゴリに分類されています
- 店舗名に「居酒屋」「飲み屋」「酒場」などが含まれていない場合でも、気軽に飲める店舗なら積極的に選択してください"""

    def _parse_casual_selection_response(
        self, response: str, restaurants: List[RestaurantInfo]
    ) -> List[RestaurantRecommendation]:
        """カジュアル選定レスポンスの解析"""
        recommendations = []
        
        try:
            # 店舗名から対象レストランを特定するマッピング
            restaurant_map = {restaurant.name: restaurant for restaurant in restaurants}
            
            # パターンマッチングで解析
            import re
            
            # おすすめ店舗のパターン
            pattern = r'### おすすめ\d+:\s*([^\n]+)\s*\n.*?推奨スコア:\s*(\d+(?:\.\d+)?)/10\s*\n.*?理由:\s*([^\n]+).*?マッチするアクティビティ:\s*([^\n]+).*?マッチする気分:\s*([^\n]+)'
            
            matches = re.findall(pattern, response, re.DOTALL)
            
            for match in matches[:2]:  # 最大2店舗
                restaurant_name = match[0].strip()
                score = float(match[1])
                reason = match[2].strip()
                activities_str = match[3].strip()
                moods_str = match[4].strip()
                
                # レストラン名の部分一致で検索
                target_restaurant = None
                for name, restaurant in restaurant_map.items():
                    if restaurant_name in name or name in restaurant_name:
                        target_restaurant = restaurant
                        break
                
                if target_restaurant:
                    # アクティビティとムードを解析
                    activity_matches = []
                    mood_matches = []
                    
                    for activity_type in ActivityType:
                        if activity_type.value in activities_str.lower():
                            activity_matches.append(activity_type)
                    
                    for mood_type in MoodType:
                        if mood_type.value in moods_str.lower():
                            mood_matches.append(mood_type)
                    
                    recommendation = RestaurantRecommendation(
                        restaurant=target_restaurant,
                        station_info=getattr(target_restaurant, 'station_info', None),
                        recommendation_score=min(score, 10.0),
                        reason=reason,
                        activity_match=activity_matches,
                        mood_match=mood_matches,
                        casual_score=getattr(target_restaurant, 'casual_score', 5.0),
                        estimated_price_per_person=3000  # デフォルト値
                    )
                    recommendations.append(recommendation)
            
        except Exception as e:
            logger.error(f"Error parsing casual selection response: {e}")
        
        return recommendations 