import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    """セッション全体で使用するイベントループ"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """テスト用のHTTPクライアント"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def sample_request_data():
    """テスト用のサンプルリクエストデータ"""
    return {
        "user_location": {
            "latitude": 35.676225,
            "longitude": 139.650348
        },
        "search_params": {
            "search_radius_km": 10,
            "max_stations": 20
        },
        "group_info": {
            "member_count": 2,
            "member_moods": ["お茶・カフェ", "散歩・ぶらぶら"],
            "budget_range": "¥1500-4500"
        },
        "context": {
            "current_time": "2025-06-29T14:30:00+09:00"
        }
    }


@pytest.fixture
def sample_invalid_request_data():
    """無効なリクエストデータ"""
    return {
        "user_location": {
            "latitude": 100,  # 無効な緯度
            "longitude": 200   # 無効な経度
        },
        "group_info": {
            "member_count": 0,  # 無効な人数
            "member_moods": [],  # 空のアクティビティリスト
        }
    }