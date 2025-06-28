import json
import asyncio
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.models import (
    ActivityType, BudgetRange, VenueInfo, ActivityCategory,
    CrowdLevel, StationSearchResult, GroupInfo
)
from app.config import get_settings


class GeminiResearchAgent:
    """Vertex AI Gemini APIを使用した深層調査エージェント"""
    
    def __init__(self):
        self.settings = get_settings()
        self.client = None
        self._setup_vertex_ai()
    
    def _setup_vertex_ai(self):
        """Vertex AI設定のセットアップ"""
        try:
            if self.settings.GOOGLE_GENAI_USE_VERTEXAI:
                # Vertex AI用の環境変数設定
                os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
                os.environ["GOOGLE_CLOUD_PROJECT"] = self.settings.GOOGLE_CLOUD_PROJECT
                os.environ["GOOGLE_CLOUD_LOCATION"] = self.settings.GOOGLE_CLOUD_LOCATION
                
                from google import genai
                from google.genai.types import HttpOptions
                
                # Vertex AI Client初期化
                self.client = genai.Client(http_options=HttpOptions(api_version="v1"))
                print(f"Vertex AI Client initialized for project: {self.settings.GOOGLE_CLOUD_PROJECT}")
            else:
                # フォールバック: 旧Gemini API
                import google.generativeai as genai
                genai.configure(api_key=self.settings.GEMINI_API_KEY)
                self.model = genai.GenerativeModel('gemini-pro')
                print("Fallback: Using legacy Gemini API")
                
        except Exception as e:
            print(f"Vertex AI setup failed: {e}")
            # フォールバック設定
            self._setup_fallback()
    
    def _setup_fallback(self):
        """フォールバック設定"""
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-pro')
            print("Using fallback Gemini API")
        except Exception as e:
            print(f"Fallback setup also failed: {e}")
            self.client = None
            self.model = None
    
    async def research_station_activities(
        self,
        station: StationSearchResult,
        group_info: GroupInfo,
        activity_types: List[ActivityType],
        current_time: datetime
    ) -> List[ActivityCategory]:
        """駅周辺のアクティビティを深層調査"""
        
        # 駅名を保存（フォールバック時に使用）
        self._current_station_name = station.station_name
        
        # プロンプトの生成
        prompt = self._create_research_prompt(
            station.station_name,
            group_info,
            activity_types,
            current_time
        )
        
        try:
            # Vertex AI Gemini APIへのリクエスト
            response = await self._call_gemini_async(prompt)
            
            # レスポンスをパース
            activities = self._parse_research_response(response, activity_types)
            
            return activities
            
        except Exception as e:
            print(f"Research error for {station.station_name}: {str(e)}")
            # エラー時はフォールバックデータを返す
            return self._create_fallback_activities(activity_types)
            return self._create_fallback_activities(activity_types)
    
    def _create_research_prompt(
        self,
        station_name: str,
        group_info: GroupInfo,
        activity_types: List[ActivityType],
        current_time: datetime
    ) -> str:
        """調査プロンプトの生成"""
        
        # 予算範囲を日本語に変換
        budget_map = {
            BudgetRange.LOW: "～1000円/人",
            BudgetRange.MEDIUM: "1000-3000円/人",
            BudgetRange.HIGH: "3000円以上/人"
        }
        budget_text = budget_map.get(group_info.budget_range, "指定なし")
        
        # アクティビティタイプを文字列に変換
        activity_text = "、".join([act.value for act in activity_types])
        
        prompt = self.settings.RESEARCH_PROMPT_TEMPLATE.format(
            station_name=station_name,
            member_count=group_info.member_count,
            activity_types=activity_text,
            budget_range=budget_text,
            current_time=current_time.strftime("%Y-%m-%d %H:%M")
        )
        
        return prompt
    
    async def _call_gemini_async(self, prompt: str) -> str:
        """Vertex AI Gemini APIへの非同期呼び出し"""
        
        def sync_call():
            try:
                if self.client and self.settings.GOOGLE_GENAI_USE_VERTEXAI:
                    # Vertex AI経由
                    response = self.client.models.generate_content(
                        model=self.settings.GEMINI_MODEL,
                        contents=prompt,
                        config={
                            "temperature": 0.7,
                            "maxOutputTokens": 2048,
                            "topP": 0.9
                        }
                    )
                    return response.text if response.text else ""
                
                elif hasattr(self, 'model') and self.model:
                    # 旧API経由（フォールバック）
                    response = self.model.generate_content(prompt)
                    return response.text if response.text else ""
                
                else:
                    print("No available Gemini client")
                    return ""
                    
            except Exception as e:
                print(f"Gemini API call error: {str(e)}")
                # 詳細エラーログ
                if "authentication" in str(e).lower():
                    print("Authentication error: Check ADC setup with 'gcloud auth application-default login'")
                elif "project" in str(e).lower():
                    print(f"Project error: Check GOOGLE_CLOUD_PROJECT={self.settings.GOOGLE_CLOUD_PROJECT}")
                return ""
        
        # 同期関数を非同期で実行
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, sync_call)
    
    def _parse_research_response(
        self, 
        response_text: str, 
        activity_types: List[ActivityType]
    ) -> List[ActivityCategory]:
        """Geminiのレスポンスをパース"""
        
        activities = []
        
        try:
            # JSONとして解析を試みる
            # Geminiが正しいJSON形式で返さない場合があるため、
            # エラーハンドリングを含む
            
            # レスポンスからJSON部分を抽出（マークダウンコードブロックを考慮）
            json_text = response_text
            if "```json" in json_text:
                json_text = json_text.split("```json")[1].split("```")[0]
            elif "```" in json_text:
                json_text = json_text.split("```")[1].split("```")[0]
            
            # JSONパース
            data = json.loads(json_text)
            
            # アクティビティタイプごとに整理
            for activity_type in activity_types:
                venues = []
                
                # データから該当するカテゴリの店舗を抽出
                for item in data:
                    if self._match_activity_type(item, activity_type):
                        venue = self._create_venue_from_data(item)
                        if venue:
                            venues.append(venue)
                
                if venues:
                    activities.append(
                        ActivityCategory(
                            category=activity_type,
                            venues=venues[:5]  # 各カテゴリ最大5件
                        )
                    )
            
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"Failed to parse Gemini response: {str(e)}")
            # パース失敗時はフォールバックデータを使用
            activities = self._create_fallback_activities(activity_types)
        
        return activities
    
    def _match_activity_type(self, venue_data: Dict[str, Any], activity_type: ActivityType) -> bool:
        """店舗データがアクティビティタイプに合致するか判定"""
        # 簡略化した判定ロジック
        venue_name = venue_data.get("name", "").lower()
        
        type_keywords = {
            ActivityType.CAFE: ["カフェ", "喫茶", "コーヒー", "スターバックス", "ドトール"],
            ActivityType.DRINK: ["バー", "居酒屋", "ビール", "ワイン", "飲み"],
            ActivityType.WALK: ["公園", "散歩", "商店街", "遊歩道", "庭園"],
            ActivityType.SHOPPING: ["ショッピング", "百貨店", "モール", "商業施設"],
            ActivityType.MOVIE: ["映画", "シネマ", "シアター", "劇場"],
            ActivityType.FOOD: ["レストラン", "食堂", "ランチ", "定食", "ラーメン"]
        }
        
        keywords = type_keywords.get(activity_type, [])
        return any(keyword in venue_name for keyword in keywords)
    
    def _create_venue_from_data(self, data: Dict[str, Any]) -> Optional[VenueInfo]:
        """データからVenueInfoオブジェクトを生成"""
        try:
            # 混雑度の変換
            crowd_map = {
                "low": CrowdLevel.LOW,
                "medium": CrowdLevel.MEDIUM,
                "high": CrowdLevel.HIGH
            }
            crowd_level = crowd_map.get(
                data.get("crowd_level", "medium").lower(),
                CrowdLevel.MEDIUM
            )
            
            return VenueInfo(
                name=data.get("name", "Unknown"),
                rating=data.get("rating", 3.5),
                price_range=data.get("price_range", "¥1000-2000"),
                crowd_level=crowd_level,
                operating_hours=data.get("operating_hours", "10:00-22:00"),
                walking_time_min=data.get("walking_time_min", 5),
                special_features=data.get("special_features", []),
                real_time_info=data.get("real_time_info")
            )
        except Exception as e:
            print(f"Error creating venue: {str(e)}")
            return None
    
    def _create_fallback_activities(
        self, 
        activity_types: List[ActivityType]
    ) -> List[ActivityCategory]:
        """フォールバック用のアクティビティデータを生成"""
        activities = []
        
        # 各アクティビティタイプに対してダミーデータを生成
        fallback_venues = {
            ActivityType.CAFE: [
                VenueInfo(
                    name="スターバックスコーヒー",
                    rating=4.0,
                    price_range="¥500-1500",
                    crowd_level=CrowdLevel.MEDIUM,
                    operating_hours="07:00-22:00",
                    walking_time_min=5,
                    special_features=["WiFi完備", "電源あり"],
                    real_time_info="通常営業中"
                )
            ],
            ActivityType.DRINK: [
                VenueInfo(
                    name="HUB",
                    rating=3.8,
                    price_range="¥2000-4000",
                    crowd_level=CrowdLevel.MEDIUM,
                    operating_hours="17:00-24:00",
                    walking_time_min=3,
                    special_features=["スポーツ観戦可", "立ち飲みスペースあり"],
                    real_time_info="ハッピーアワー実施中"
                )
            ],
            ActivityType.WALK: [
                VenueInfo(
                    name="駅前商店街",
                    rating=3.5,
                    price_range="無料",
                    crowd_level=CrowdLevel.LOW,
                    operating_hours="終日",
                    walking_time_min=1,
                    special_features=["屋根付き", "ベンチあり"],
                    real_time_info="天候良好"
                )
            ]
        }
        
        for activity_type in activity_types:
            if activity_type in fallback_venues:
                activities.append(
                    ActivityCategory(
                        category=activity_type,
                        venues=fallback_venues[activity_type]
                    )
                )
        
        return activities