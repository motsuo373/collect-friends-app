import asyncio
import logging
from typing import Dict, Any

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from research.state import ResearchState
from research.nodes import ResearchNodes

logger = logging.getLogger(__name__)


class StationResearchGraph:
    """駅研究用LangGraphの実装"""
    
    def __init__(self):
        self.nodes = ResearchNodes()
        self.graph = self._build_graph()
        
    def _build_graph(self) -> StateGraph:
        """LangGraphの構築"""
        
        # StateGraphを初期化
        workflow = StateGraph(ResearchState)
        
        # ノードを追加
        workflow.add_node("query_generation", self.nodes.query_generation_node)
        workflow.add_node("places_search", self.nodes.places_search_node)
        workflow.add_node("critique", self.nodes.critique_node)
        workflow.add_node("summary", self.nodes.summary_node)
        
        # エントリーポイントを設定
        workflow.set_entry_point("query_generation")
        
        # エッジを追加
        workflow.add_conditional_edges(
            "query_generation",
            self._route_from_query_generation,
            {
                "places_search": "places_search",
                "error": END
            }
        )
        
        workflow.add_conditional_edges(
            "places_search",
            self._route_from_places_search,
            {
                "critique": "critique",
                "error": END
            }
        )
        
        workflow.add_conditional_edges(
            "critique",
            self._route_from_critique,
            {
                "query_generation": "query_generation",
                "summary": "summary"
            }
        )
        
        workflow.add_edge("summary", END)
        
        # メモリセーバーを設定
        memory = MemorySaver()
        graph = workflow.compile(checkpointer=memory)
        
        return graph
    
    def _route_from_query_generation(self, state: ResearchState) -> str:
        """クエリ生成後のルーティング"""
        if state.errors:
            return "error"
        return "places_search"
    
    def _route_from_places_search(self, state: ResearchState) -> str:
        """場所検索後のルーティング"""
        if state.errors:
            return "error"
        return "critique"
    
    def _route_from_critique(self, state: ResearchState) -> str:
        """批評後のルーティング"""
        # 改善が必要で、まだ再試行回数に余裕がある場合
        if (state.needs_refinement and 
            state.refinement_count < state.max_refinements):
            return "query_generation"
        return "summary"
    
    async def research_station(
        self,
        state: ResearchState,
        thread_id: str = None
    ) -> ResearchState:
        """
        駅の研究を実行
        
        Args:
            state: 初期状態
            thread_id: スレッドID（継続実行用）
            
        Returns:
            完了した研究状態
        """
        try:
            logger.info(f"Starting research for station: {state.station.name}")
            
            # 実行設定
            config = {"configurable": {"thread_id": thread_id or "default"}}
            
            # グラフを実行
            final_state = None
            async for chunk in self.graph.astream(state.dict(), config=config):
                # 各ステップの出力をログ
                for node_name, node_output in chunk.items():
                    logger.debug(f"Node {node_name} output: {node_output}")
                    
                # 最終状態を更新
                if chunk:
                    # 最新の状態で更新
                    state_dict = state.dict()
                    for node_name, node_output in chunk.items():
                        state_dict.update(node_output)
                    final_state = ResearchState(**state_dict)
            
            if final_state is None:
                logger.error("Graph execution failed - no final state")
                state.errors.append("グラフ実行エラー: 最終状態が取得できませんでした")
                return state
            
            logger.info(f"Research completed for station: {state.station.name}")
            return final_state
            
        except Exception as e:
            logger.error(f"Error in station research: {e}")
            state.errors.append(f"研究実行エラー: {str(e)}")
            return state
    
    async def research_station_with_timeout(
        self,
        state: ResearchState,
        timeout_seconds: int = 300,
        thread_id: str = None
    ) -> ResearchState:
        """
        タイムアウト付きで駅の研究を実行
        """
        try:
            return await asyncio.wait_for(
                self.research_station(state, thread_id),
                timeout=timeout_seconds
            )
        except asyncio.TimeoutError:
            logger.error(f"Research timeout for station: {state.station.name}")
            state.errors.append(f"研究タイムアウト: {timeout_seconds}秒")
            return state
        except Exception as e:
            logger.error(f"Unexpected error in research: {e}")
            state.errors.append(f"予期しないエラー: {str(e)}")
            return state