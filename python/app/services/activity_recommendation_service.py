import asyncio
import time
import uuid
from typing import List, Dict, Any, Optional, Tuple

from app.models import (
    ActivityRecommendationRequest,
    ActivityRecommendationResponse,
    LocationData,
    SpotInfo
)
from app.services.gemini_research import GeminiResearchAgent, GeminiAPIError
from app.services.google_places import GooglePlacesService, GooglePlacesAPIError
from app.config import get_settings


class ActivityRecommendationService:
    """アクティビティ推奨サービス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.places_service = GooglePlacesService()
        self.gemini_agent = GeminiResearchAgent()
    
    async def generate_recommendations(
        self,
        request: ActivityRecommendationRequest
    ) -> ActivityRecommendationResponse:
        """最適なスポット推奨を生成"""
        
        start_time = time.time()
        request_id = f"req_{uuid.uuid4().hex[:8]}"
        
        try:
            # 1. 周辺スポット・駅を検索
            spots = await self._search_nearby_spots(
                request.user_location,
                request.radius_km,
                request.max_results
            )
            
            if not spots:
                processing_time = int((time.time() - start_time) * 1000)
                
                # API キーチェック結果を含むエラーメッセージ
                error_msg = f"指定された範囲内（{request.radius_km}km）にスポットが見つかりませんでした。"
                if not self.places_service.api_key:
                    error_msg += " Google Places APIキーが設定されていません。"
                
                return ActivityRecommendationResponse(
                    success=False,
                    request_id=request_id,
                    processing_time_ms=processing_time,
                    user_location=request.user_location,
                    all_spots=[],
                    optimal_spot=None,
                    ai_reasoning=None,
                    error_message=error_msg
                )
            
            # 2. Gemini AIで最適なスポットを選択
            optimal_spot, ai_reasoning = await self._select_optimal_spot_with_ai(spots)
            
            # 3. レスポンスを構築
            processing_time = int((time.time() - start_time) * 1000)
            
            return ActivityRecommendationResponse(
                success=True,
                request_id=request_id,
                processing_time_ms=processing_time,
                user_location=request.user_location,
                all_spots=spots,
                optimal_spot=optimal_spot,
                ai_reasoning=ai_reasoning,
                error_message=None
            )
            
        except GooglePlacesAPIError as e:
            processing_time = int((time.time() - start_time) * 1000)
            return ActivityRecommendationResponse(
                success=False,
                request_id=request_id,
                processing_time_ms=processing_time,
                user_location=request.user_location,
                all_spots=[],
                optimal_spot=None,
                ai_reasoning=None,
                error_message=f"スポット検索エラー: {str(e)}"
            )
        
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            return ActivityRecommendationResponse(
                success=False,
                request_id=request_id,
                processing_time_ms=processing_time,
                user_location=request.user_location,
                all_spots=[],
                optimal_spot=None,
                ai_reasoning=None,
                error_message=f"予期しないエラー: {str(e)}"
            )
    
    async def _search_nearby_spots(
        self,
        user_location: LocationData,
        radius_km: float,
        max_results: int
    ) -> List[SpotInfo]:
        """周辺スポット・駅を検索"""
        
        print(f"🔍 Starting search at location: ({user_location.latitude}, {user_location.longitude}) within {radius_km}km")
        
        # APIキーチェック
        if not self.places_service.api_key:
            print("❌ Google Places API key not available")
            return []
        
        radius_m = int(radius_km * 1000)  # kmをmに変換
        print(f"📏 Search radius: {radius_m}m")
        
        # よりシンプルで一般的なタイプで検索
        included_types = [
            "train_station", "subway_station", "transit_station",
            "tourist_attraction", "shopping_mall", "park", 
            "museum", "restaurant"
        ]
        
        print(f"🏷️ Searching for types: {included_types}")
        
        try:
            # 直接Google Places APIを呼び出し
            places = self.places_service.search_nearby_spots(
                user_location, radius_m, included_types, max_results
            )
            
            print(f"📍 Found {len(places)} places from API")
            
            if not places:
                print("⚠️ No places returned from Google Places API")
                return []
            
            # StationSearchResultをSpotInfoに変換
            all_spots = []
            for place in places:
                print(f"  📌 Processing place: {place.station_name} ({place.distance_km}km)")
                
                spot = SpotInfo(
                    name=place.station_name,
                    type=self._get_japanese_spot_type(place.place_types),
                    address=place.formatted_address or "",
                    latitude=place.latitude,
                    longitude=place.longitude,
                    distance_km=place.distance_km,
                    rating=None,  # StationSearchResultには評価がない
                    user_ratings_total=None,
                    place_id=place.place_id or ""
                )
                all_spots.append(spot)
            
            print(f"✅ Successfully converted {len(all_spots)} spots")
            
            # 距離順でソート
            sorted_spots = sorted(all_spots, key=lambda x: x.distance_km)
            final_spots = sorted_spots[:max_results]
            
            print(f"🎯 Returning {len(final_spots)} spots")
            
            return final_spots
            
        except Exception as e:
            print(f"❌ Error during search: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _search_by_types(
        self,
        user_location: LocationData,
        radius_m: int,
        included_types: List[str],
        max_results: int
    ) -> List:
        """指定されたタイプのスポットを検索"""
        try:
            return self.places_service.search_nearby_spots(
                user_location, radius_m, included_types, max_results
            )
        except Exception as e:
            print(f"Places API search failed: {e}")
            return []
    
    def _get_japanese_spot_type(self, place_types: List[str]) -> str:
        """Place typesを日本語のスポットタイプに変換"""
        type_mapping = {
            "tourist_attraction": "観光スポット",
            "amusement_park": "遊園地",
            "zoo": "動物園", 
            "aquarium": "水族館",
            "shopping_mall": "ショッピングモール",
            "department_store": "デパート",
            "museum": "博物館",
            "art_gallery": "美術館",
            "library": "図書館",
            "university": "大学",
            "park": "公園",
            "natural_feature": "自然スポット",
            "train_station": "駅",
            "subway_station": "地下鉄駅", 
            "transit_station": "交通ハブ",
            "church": "教会",
            "hindu_temple": "寺院",
            "mosque": "モスク",
            "shrine": "神社",
            "synagogue": "シナゴーグ"
        }
        
        # 優先順位の高いタイプから検索
        priority_types = [
            "tourist_attraction", "amusement_park", "zoo", "aquarium",
            "shopping_mall", "museum", "art_gallery", "park",
            "train_station", "subway_station"
        ]
        
        # 優先タイプをチェック
        for ptype in priority_types:
            if ptype in place_types:
                return type_mapping.get(ptype, "スポット")
        
        # 優先タイプがない場合、その他のタイプをチェック
        for place_type in place_types:
            if place_type in type_mapping:
                return type_mapping[place_type]
        
        return "スポット"
    
    async def _select_optimal_spot_with_ai(self, spots: List[SpotInfo]) -> Tuple[Optional[SpotInfo], str]:
        """Gemini AIを使って最適なスポットを選択"""
        
        if not spots:
            return None, "選択可能なスポットがありません"
        
        if len(spots) == 1:
            return spots[0], f"{spots[0].name}が唯一の候補として選択されました"
        
        try:
            # Gemini APIが利用可能かチェック
            if not hasattr(self.gemini_agent, 'model') or not self.gemini_agent.model:
                print("Gemini AI not available. Using fallback selection.")
                fallback_spot = self._fallback_selection(spots)
                return fallback_spot, f"Gemini AIが利用できないため、距離と評価を考慮して{fallback_spot.name}を選択しました"
            
            # プロンプトを構築
            prompt = self._build_selection_prompt(spots)
            
            # Gemini AIに問い合わせ
            response = self.gemini_agent.model.generate_content(prompt)
            
            if not response.text:
                print("Gemini AI returned empty response")
                fallback_spot = self._fallback_selection(spots)
                return fallback_spot, f"AI応答が空だったため、距離を考慮して{fallback_spot.name}を選択しました"
            
            # レスポンスを解析
            selected_spot, reasoning = self._parse_selection_response(response.text, spots)
            
            return selected_spot, reasoning
            
        except Exception as e:
            print(f"Gemini API error: {e}")
            # フォールバック: 評価が高く、距離が近いスポットを選択
            fallback_spot = self._fallback_selection(spots)
            return fallback_spot, f"AIの推奨処理でエラーが発生したため、距離を考慮して{fallback_spot.name}を選択しました"
    
    def _build_selection_prompt(self, spots: List[SpotInfo]) -> str:
        """スポット選択用のプロンプトを構築"""
        spots_info = []
        
        for i, spot in enumerate(spots, 1):
            rating_text = f"評価: {spot.rating:.1f}/5.0 ({spot.user_ratings_total}件)" if spot.rating else "評価: なし"
            
            spot_text = f"""
{i}. {spot.name}
   - タイプ: {spot.type}
   - 住所: {spot.address}
   - 距離: {spot.distance_km}km
   - {rating_text}
"""
            spots_info.append(spot_text)
        
        prompt = f"""
あなたは日本の観光・お出かけエキスパートです。
以下のスポットリストから、集合場所として最も適切な1つのスポットを推奨してください。

選択基準:
1. アクセスしやすさ（駅や交通の便）
2. 知名度・わかりやすさ
3. 周辺の環境・安全性
4. 集合場所としての実用性
5. 評価の高さ

対象スポット:
{''.join(spots_info)}

以下の形式で回答してください:
選択: [スポット番号]
理由: [推奨理由を100文字以内で簡潔に説明]

例:
選択: 3
理由: 東京駅は日本最大の交通ハブで、全国からアクセスしやすく、集合場所として非常に分かりやすいため。
"""
        
        return prompt
    
    def _parse_selection_response(self, response_text: str, spots: List[SpotInfo]) -> Tuple[Optional[SpotInfo], str]:
        """Gemini AIの応答を解析して選択されたスポットと理由を抽出"""
        lines = response_text.strip().split('\n')
        selected_index = None
        reasoning = "AI推奨による選択"
        
        for line in lines:
            line = line.strip()
            
            # 選択行の解析
            if line.startswith('選択:') or line.startswith('選択：'):
                try:
                    # 数字を抽出
                    import re
                    numbers = re.findall(r'\d+', line)
                    if numbers:
                        selected_index = int(numbers[0]) - 1  # 1-based to 0-based
                except:
                    continue
            
            # 理由行の解析
            elif line.startswith('理由:') or line.startswith('理由：'):
                reasoning = line.split(':', 1)[1].strip() if ':' in line else line.split('：', 1)[1].strip()
        
        # 選択されたスポットを取得
        if selected_index is not None and 0 <= selected_index < len(spots):
            return spots[selected_index], reasoning
        else:
            # パースに失敗した場合はフォールバック
            fallback_spot = self._fallback_selection(spots)
            return fallback_spot, f"AI応答の解析に失敗したため、総合的に評価して{fallback_spot.name}を選択しました"
    
    def _fallback_selection(self, spots: List[SpotInfo]) -> SpotInfo:
        """フォールバック選択: 距離を考慮したスコアリング"""
        def calculate_score(spot: SpotInfo) -> float:
            # 基本スコア
            score = 5.0
            
            # 評価による加点
            if spot.rating:
                score += (spot.rating - 3.0) * 2
                
                if spot.user_ratings_total:
                    if spot.user_ratings_total >= 100:
                        score += 1.0
                    elif spot.user_ratings_total >= 50:
                        score += 0.5
            
            # 距離による減点（遠いほど減点）
            if spot.distance_km <= 1.0:
                score += 2.0
            elif spot.distance_km <= 3.0:
                score += 1.0
            elif spot.distance_km <= 5.0:
                pass  # 減点なし
            else:
                score -= (spot.distance_km - 5.0) * 0.2
            
            # 駅・交通ハブには加点
            if spot.type in ["駅", "地下鉄駅", "交通ハブ"]:
                score += 3.0
            
            # 観光スポットには加点
            if spot.type in ["観光スポット", "博物館", "美術館", "公園"]:
                score += 1.0
            
            return max(score, 0.0)
        
        # スコア計算してソート
        scored_spots = [(spot, calculate_score(spot)) for spot in spots]
        scored_spots.sort(key=lambda x: x[1], reverse=True)
        
        return scored_spots[0][0] 