import asyncio
import logging
from typing import Dict, Any, List
from tenacity import retry, stop_after_attempt, wait_exponential

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import get_settings
from app.services.google_places import GooglePlacesService
from research.state import ResearchState, PlaceInfo

logger = logging.getLogger(__name__)


class ResearchNodes:
    """LangGraphの各ノード実装"""
    
    def __init__(self):
        self.settings = get_settings()
        self.llm = ChatGoogleGenerativeAI(
            model=self.settings.gemini_model,
            google_api_key=self.settings.gemini_api_key,
            temperature=self.settings.gemini_temperature,
            top_p=self.settings.gemini_top_p
        )
        self.places_service = GooglePlacesService()
        
    async def query_generation_node(self, state: ResearchState) -> Dict[str, Any]:
        """検索クエリ生成ノード"""
        try:
            logger.info(f"Generating search query for station: {state.station.name}")
            
            prompt = ChatPromptTemplate.from_template(
                """あなたは旅行と観光の専門家です。以下の情報に基づいて、Google Places APIで検索するための最適な検索クエリを1つ生成してください。

駅情報: {station_name}
希望アクティビティ: {activities}
予算帯: {budget}
人数: {member_count}人
現在時刻: {current_time}

要件:
- 駅周辺で実際に見つかりそうな具体的な施設タイプを指定
- 検索結果が多すぎず少なすぎない適切な範囲
- 予算と人数を考慮した場所タイプ
- 現在時刻（営業時間）を考慮

検索クエリのみを出力してください。説明は不要です。

例: "新宿 カフェ" や "渋谷 レストラン" など"""
            )
            
            chain = prompt | self.llm | StrOutputParser()
            
            query = await chain.ainvoke({
                "station_name": state.station.name,
                "activities": ", ".join(state.activity_types),
                "budget": state.budget_range.value if state.budget_range else "指定なし",
                "member_count": state.member_count,
                "current_time": state.current_time.strftime("%Y-%m-%d %H:%M")
            })
            
            query = query.strip().strip('"\'')
            
            return {
                "search_query": query,
                "current_step": "places_search",
                "completed_steps": state.completed_steps + ["query_generation"]
            }
            
        except Exception as e:
            logger.error(f"Error in query generation: {e}")
            return {
                "errors": state.errors + [f"クエリ生成エラー: {str(e)}"],
                "current_step": "error"
            }

    async def places_search_node(self, state: ResearchState) -> Dict[str, Any]:
        """Google Places検索ノード"""
        try:
            logger.info(f"Searching places with query: {state.search_query}")
            
            if not state.search_query:
                raise ValueError("検索クエリが生成されていません")
            
            # Google Places API検索
            places_data = await self.places_service.search_places(
                query=state.search_query,
                location=(state.station.latitude, state.station.longitude),
                radius=2000  # 駅周辺2km
            )
            
            # PlaceInfoオブジェクトに変換
            places_parsed = []
            for place in places_data:
                try:
                    place_info = PlaceInfo(
                        name=place.get("name", ""),
                        address=place.get("formatted_address", ""),
                        rating=place.get("rating"),
                        price_level=place.get("price_level"),
                        place_type=place.get("types", ["unknown"])[0],
                        google_place_id=place.get("place_id", ""),
                        latitude=place.get("geometry", {}).get("location", {}).get("lat", 0),
                        longitude=place.get("geometry", {}).get("location", {}).get("lng", 0)
                    )
                    places_parsed.append(place_info)
                except Exception as e:
                    logger.warning(f"Failed to parse place data: {e}")
                    continue
            
            logger.info(f"Found {len(places_parsed)} places")
            
            return {
                "places_raw": places_data,
                "places_parsed": places_parsed,
                "current_step": "critique",
                "completed_steps": state.completed_steps + ["places_search"]
            }
            
        except Exception as e:
            logger.error(f"Error in places search: {e}")
            return {
                "errors": state.errors + [f"場所検索エラー: {str(e)}"],
                "current_step": "error"
            }

    async def critique_node(self, state: ResearchState) -> Dict[str, Any]:
        """検索結果批評ノード"""
        try:
            logger.info("Critiquing search results")
            
            if not state.places_parsed:
                return {
                    "critique_feedback": "検索結果が見つかりませんでした。検索クエリを調整する必要があります。",
                    "needs_refinement": True,
                    "current_step": "query_generation" if state.refinement_count < state.max_refinements else "summary",
                    "refinement_count": state.refinement_count + 1,
                    "completed_steps": state.completed_steps + ["critique"]
                }
            
            # 場所情報を要約
            places_summary = []
            for place in state.places_parsed[:10]:  # 上位10件
                places_summary.append(
                    f"- {place.name} (評価: {place.rating or 'N/A'}, "
                    f"価格帯: {place.price_level or 'N/A'}, タイプ: {place.place_type})"
                )
            
            prompt = ChatPromptTemplate.from_template(
                """あなたは旅行コンサルタントです。以下の検索結果を評価してください。

駅: {station_name}
希望アクティビティ: {activities}
予算帯: {budget}
人数: {member_count}人

検索結果:
{places_summary}

評価基準:
1. 希望アクティビティとの適合性
2. 予算帯との適合性  
3. グループサイズとの適合性
4. 結果の多様性と質

この検索結果は要求を満たしていますか？
満たしている場合は「満足」、改善が必要な場合は「改善必要: [具体的な理由]」と回答してください。"""
            )
            
            chain = prompt | self.llm | StrOutputParser()
            
            feedback = await chain.ainvoke({
                "station_name": state.station.name,
                "activities": ", ".join(state.activity_types),
                "budget": state.budget_range.value if state.budget_range else "指定なし",
                "member_count": state.member_count,
                "places_summary": "\n".join(places_summary)
            })
            
            needs_refinement = "改善必要" in feedback
            
            if needs_refinement and state.refinement_count < state.max_refinements:
                next_step = "query_generation"
            else:
                next_step = "summary"
                
            return {
                "critique_feedback": feedback,
                "needs_refinement": needs_refinement,
                "current_step": next_step,
                "refinement_count": state.refinement_count + 1 if needs_refinement else state.refinement_count,
                "completed_steps": state.completed_steps + ["critique"]
            }
            
        except Exception as e:
            logger.error(f"Error in critique: {e}")
            return {
                "errors": state.errors + [f"批評エラー: {str(e)}"],
                "current_step": "summary"  # エラーでも要約に進む
            }

    async def summary_node(self, state: ResearchState) -> Dict[str, Any]:
        """要約生成ノード"""
        try:
            logger.info("Generating station summary")
            
            if not state.places_parsed:
                summary = f"{state.station.name}駅周辺では、指定された条件に合う場所が見つかりませんでした。"
            else:
                # トップ5の場所を選択
                top_places = state.places_parsed[:5]
                places_text = []
                
                for i, place in enumerate(top_places, 1):
                    places_text.append(
                        f"{i}. {place.name}\n"
                        f"   - 住所: {place.address}\n"
                        f"   - 評価: {place.rating or 'N/A'}/5.0\n"
                        f"   - 価格帯: {'¥' * (place.price_level or 1)}\n"
                        f"   - タイプ: {place.place_type}"
                    )
                
                prompt = ChatPromptTemplate.from_template(
                    """あなたは旅行ガイドです。以下の情報を基に、{station_name}駅のおすすめ要約を作成してください。

希望アクティビティ: {activities}
予算帯: {budget}
人数: {member_count}人

見つかった場所:
{places_text}

要約要件:
- 150文字以内
- この駅の特徴と魅力を簡潔に
- 見つかった場所の傾向を説明
- グループにとっての利便性を言及

要約のみを出力してください。"""
                )
                
                chain = prompt | self.llm | StrOutputParser()
                
                summary = await chain.ainvoke({
                    "station_name": state.station.name,
                    "activities": ", ".join(state.activity_types),
                    "budget": state.budget_range.value if state.budget_range else "指定なし",
                    "member_count": state.member_count,
                    "places_text": "\n\n".join(places_text)
                })
            
            return {
                "station_summary": summary.strip(),
                "current_step": "completed",
                "completed_steps": state.completed_steps + ["summary"]
            }
            
        except Exception as e:
            logger.error(f"Error in summary generation: {e}")
            # エラーでも基本的な要約を提供
            basic_summary = f"{state.station.name}駅周辺の調査を完了しました。"
            if state.places_parsed:
                basic_summary += f" {len(state.places_parsed)}件の場所を見つけました。"
            
            return {
                "station_summary": basic_summary,
                "current_step": "completed",
                "errors": state.errors + [f"要約生成エラー: {str(e)}"],
                "completed_steps": state.completed_steps + ["summary"]
            }