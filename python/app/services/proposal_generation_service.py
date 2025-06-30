"""
AI提案生成サービス
既存のレコメンデーションAPIを活用してFirestore用の提案を生成
"""
import uuid
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import random

from app.models import (
    Proposal, UserProposal, ProposalLocation, InvitedUser,
    ProposalBudget, ProposalCapacity, AIAnalysis, ResponseCount,
    ProposalSource, ProposalType, ProposalStatus, Priority,
    LocationData, ActivityType, MoodType, BudgetRange,
    RestaurantRecommendationRequest, ProposalGenerationRequest,
    ProposalGenerationResponse
)
from app.services.firestore_service import get_firestore_service
from app.services.restaurant_recommendation_service import RestaurantRecommendationService
from app.services.activity_recommendation_service import ActivityRecommendationService


class ProposalGenerationService:
    """AI提案生成サービス"""
    
    def __init__(self):
        self.firestore_service = get_firestore_service()
        self.restaurant_service = RestaurantRecommendationService()
        self.activity_service = ActivityRecommendationService()
    
    async def generate_ai_proposals(self, request: ProposalGenerationRequest) -> ProposalGenerationResponse:
        """AI提案を生成してFirestoreに保存"""
        start_time = datetime.now()
        generated_proposals = []
        
        try:
            print(f"🤖 Starting AI proposal generation...")
            
            # 対象ユーザーを取得
            if request.target_user_ids:
                # 指定されたユーザーIDから取得
                target_users = []
                for uid in request.target_user_ids:
                    user_data = await self._get_user_data(uid)
                    if user_data:
                        target_users.append(user_data)
                        print(f"✅ Target user found: {user_data.get('displayName', uid)}")
                    else:
                        print(f"⚠️ Target user not found: {uid}, creating dummy data for testing")
                        # デバッグ用：ダミーユーザーデータを作成
                        dummy_user = {
                            'uid': uid,
                            'displayName': f'User_{uid[:8]}',
                            'isActive': True,
                            'mood': ['drinking', 'cafe'],
                            'currentStatus': 'free'
                        }
                        target_users.append(dummy_user)
            else:
                # アクティブユーザーを取得
                target_users = await self.firestore_service.get_active_users(request.location_filter)
            
            print(f"🎯 Found {len(target_users)} target users for proposal generation")
            
            # ユーザーごとに提案を生成
            for user in target_users:
                user_proposals = await self._generate_proposals_for_user(
                    user, request.max_proposals_per_user, request.force_generation
                )
                generated_proposals.extend(user_proposals)
            
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return ProposalGenerationResponse(
                success=True,
                generated_proposals=generated_proposals,
                target_users_count=len(target_users),
                processing_time_ms=processing_time
            )
        
        except Exception as e:
            print(f"❌ Error in AI proposal generation: {str(e)}")
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return ProposalGenerationResponse(
                success=False,
                generated_proposals=generated_proposals,
                target_users_count=0,
                processing_time_ms=processing_time,
                error_message=str(e)
            )
    
    async def _generate_proposals_for_user(
        self, user: Dict[str, Any], max_proposals: int, force_generation: bool
    ) -> List[str]:
        """指定ユーザーに対する提案を生成"""
        proposals = []
        user_uid = user['uid']
        
        try:
            print(f"👤 Generating proposals for user: {user.get('displayName', user_uid)}")
            
            # ユーザーの位置情報を取得
            user_location_data = await self.firestore_service.get_user_location(user_uid)
            if not user_location_data:
                print(f"⚠️ No location data for user {user_uid}")
                # デバッグ用：デフォルト位置（東京駅）を使用
                print(f"🔧 Using default location (Tokyo Station) for testing")
                user_location = LocationData(latitude=35.6812, longitude=139.7671)
            else:
                user_location = LocationData(
                    latitude=user_location_data['coordinates']['lat'],
                    longitude=user_location_data['coordinates']['lng']
                )
                print(f"📍 User location: {user_location.latitude}, {user_location.longitude}")
            
            # ユーザーの友人を取得
            friends = await self.firestore_service.get_user_friends(user_uid)
            print(f"👥 Found {len(friends)} friends for user {user_uid}")
            
            # ユーザーの気分・興味から提案を生成
            user_moods = user.get('mood', ['drinking'])  # デフォルトは飲み会
            print(f"😊 User moods: {user_moods}")
            
            # 複数の提案を生成（最大max_proposals個）
            proposal_count = min(max_proposals, max(len(user_moods), 1))
            print(f"🎲 Generating {proposal_count} proposals")
            
            for i in range(proposal_count):
                proposal_id = await self._create_single_proposal(
                    user, user_location, friends, user_moods, i
                )
                if proposal_id:
                    proposals.append(proposal_id)
                    print(f"✨ Proposal {i+1}/{proposal_count} created: {proposal_id}")
                else:
                    print(f"⚠️ Failed to create proposal {i+1}/{proposal_count}")
            
            print(f"✅ Generated {len(proposals)} proposals for user {user_uid}")
            return proposals
        
        except Exception as e:
            print(f"❌ Error generating proposals for user {user_uid}: {str(e)}")
            import traceback
            traceback.print_exc()
            return proposals
    
    async def _create_single_proposal(
        self, user: Dict[str, Any], user_location: LocationData,
        friends: List[Dict[str, Any]], user_moods: List[str], proposal_index: int
    ) -> Optional[str]:
        """単一の提案を作成"""
        try:
            user_uid = user['uid']
            proposal_id = f"proposal_{uuid.uuid4().hex[:12]}"
            
            # 気分からアクティビティタイプを決定
            activity_type = self._determine_activity_type(user_moods, proposal_index)
            mood_type = self._determine_mood_type(user.get('preferences', {}))
            
            print(f"🎲 Creating proposal for activity: {activity_type}, mood: {mood_type}")
            
            # レストラン推薦を取得
            recommendation_request = RestaurantRecommendationRequest(
                user_location=user_location,
                activity_type=[activity_type],
                mood=[mood_type],
                group_size=self._estimate_group_size(friends),
                max_price_per_person=3000,  # カジュアル向け
                station_search_radius_km=5.0,
                max_stations=3,
                max_restaurants_per_station=5
            )
            
            recommendation_response = await self.restaurant_service.recommend_restaurants_async(
                user_location=recommendation_request.user_location,
                activity_type=recommendation_request.activity_type,
                mood=recommendation_request.mood,
                group_size=recommendation_request.group_size,
                max_price_per_person=recommendation_request.max_price_per_person,
                station_search_radius_km=recommendation_request.station_search_radius_km,
                max_stations=recommendation_request.max_stations,
                max_restaurants_per_station=recommendation_request.max_restaurants_per_station
            )
            
            if not recommendation_response.success or not recommendation_response.recommendations:
                print(f"⚠️ No recommendations found for user {user_uid}")
                return None
            
            # 一番良い推薦を選択
            best_recommendation = recommendation_response.recommendations[0]
            
            # 友人を招待対象として選定
            invited_friends = self._select_friends_for_invitation(friends, activity_type)
            
            # 提案時間を決定
            scheduled_time = self._determine_proposal_time(user, activity_type)
            
            # Proposalオブジェクトを作成
            proposal = self._build_proposal_object(
                proposal_id, user, best_recommendation, invited_friends,
                scheduled_time, activity_type, mood_type
            )
            
            # Firestoreに保存
            success = await self.firestore_service.create_proposal(proposal)
            if not success:
                return None
            
            # ユーザー個別提案を作成
            user_proposals = self._build_user_proposals(proposal, invited_friends + [user])
            await self.firestore_service.create_user_proposals(user_proposals)
            
            print(f"✅ Created proposal {proposal_id}: {proposal.title}")
            return proposal_id
        
        except Exception as e:
            print(f"❌ Error creating single proposal: {str(e)}")
            return None
    
    def _determine_activity_type(self, user_moods: List[str], index: int) -> ActivityType:
        """ユーザーの気分からアクティビティタイプを決定"""
        mood_to_activity = {
            'drinking': ActivityType.DRINK,
            'cafe': ActivityType.CAFE,
            'food': ActivityType.FOOD,
            'shopping': ActivityType.SHOPPING,
            'movie': ActivityType.MOVIE,
            'walk': ActivityType.WALK
        }
        
        if index < len(user_moods):
            mood = user_moods[index]
            return mood_to_activity.get(mood, ActivityType.DRINK)
        
        # デフォルトまたはランダム選択
        return random.choice([ActivityType.DRINK, ActivityType.CAFE, ActivityType.FOOD])
    
    def _determine_mood_type(self, preferences: Dict[str, Any]) -> MoodType:
        """ユーザーの嗜好から雰囲気を決定"""
        # 簡単な実装：カジュアルをデフォルトに
        return random.choice([MoodType.CASUAL, MoodType.SOCIAL])
    
    def _estimate_group_size(self, friends: List[Dict[str, Any]]) -> int:
        """友人数から適切なグループサイズを推定"""
        active_friends = len([f for f in friends if f.get('currentStatus') == 'free'])
        return min(max(2, active_friends // 2), 6)  # 2-6人の範囲
    
    def _select_friends_for_invitation(
        self, friends: List[Dict[str, Any]], activity_type: ActivityType
    ) -> List[Dict[str, Any]]:
        """アクティビティに適した友人を選定"""
        # アクティブな友人を優先
        active_friends = [f for f in friends if f.get('currentStatus') == 'free']
        
        # 気分が合う友人を優先
        compatible_friends = []
        for friend in active_friends:
            friend_moods = friend.get('mood', [])
            if activity_type.value in friend_moods:
                compatible_friends.append(friend)
        
        # 最大4人まで選択
        selected = compatible_friends[:4] if compatible_friends else active_friends[:4]
        return selected
    
    def _determine_proposal_time(self, user: Dict[str, Any], activity_type: ActivityType) -> datetime:
        """提案時間を決定"""
        now = datetime.now()
        
        # アクティビティタイプに応じた時間帯
        if activity_type == ActivityType.DRINK:
            # 飲み会は今から2-4時間後の18:00-20:00頃
            return now + timedelta(hours=random.randint(2, 4))
        elif activity_type == ActivityType.CAFE:
            # カフェは今から1-3時間後
            return now + timedelta(hours=random.randint(1, 3))
        else:
            # その他は今から1-2時間後
            return now + timedelta(hours=random.randint(1, 2))
    
    def _build_proposal_object(
        self, proposal_id: str, user: Dict[str, Any], recommendation,
        invited_friends: List[Dict[str, Any]], scheduled_time: datetime,
        activity_type: ActivityType, mood_type: MoodType
    ) -> Proposal:
        """Proposalオブジェクトを構築"""
        
        restaurant = recommendation.restaurant
        
        # タイトル生成
        activity_names = {
            ActivityType.DRINK: "飲み会",
            ActivityType.CAFE: "カフェ",
            ActivityType.FOOD: "軽食",
            ActivityType.SHOPPING: "ショッピング",
            ActivityType.MOVIE: "映画",
            ActivityType.WALK: "散歩"
        }
        title = f"{restaurant.address.split('区')[0] if '区' in restaurant.address else ''}で{activity_names.get(activity_type, 'お出かけ')}"
        
        # 場所情報
        location = ProposalLocation(
            name=restaurant.name,
            address=restaurant.address,
            coordinates={"lat": restaurant.latitude, "lng": restaurant.longitude},
            place_id=restaurant.place_id,
            category=restaurant.type,
            phone=restaurant.phone_number,
            website=restaurant.website,
            price_level=restaurant.price_level,
            rating=restaurant.rating
        )
        
        # 招待ユーザー情報
        invited_users = []
        for friend in invited_friends:
            invited_users.append(InvitedUser(
                uid=friend['friendUid'],
                display_name=friend['displayName'],
                profile_image=friend.get('profileImage'),
                invited_at=datetime.now()
            ))
        
        # 予算情報
        budget = ProposalBudget(
            min=2000,
            max=4000,
            currency="JPY",
            per_person=True,
            includes_food=True,
            includes_drinks=activity_type == ActivityType.DRINK,
            notes="カジュアルな価格帯"
        )
        
        # 参加人数情報
        capacity = ProposalCapacity(
            min=2,
            max=len(invited_friends) + 1,
            current=0
        )
        
        # AI分析データ
        ai_analysis = AIAnalysis(
            confidence=recommendation.recommendation_score / 10.0,
            matching_score=recommendation.casual_score / 10.0 if hasattr(recommendation, 'casual_score') else 0.8,
            reasons=[recommendation.reason],
            recommendation_basis=["位置情報", "ユーザー嗜好", "友人の状況"],
            success_probability=0.7,
            factors_considered={
                "userPreferences": True,
                "locationData": True,
                "pastEvents": False,
                "friendsAvailability": True
            }
        )
        
        return Proposal(
            proposal_id=proposal_id,
            title=title,
            description=f"{restaurant.name}で{activity_names.get(activity_type, 'お出かけ')}はいかがですか？",
            type=ProposalType.VENUE_RECOMMENDATION,
            proposal_source=ProposalSource.AI,
            target_users=[user['uid']] + [f['friendUid'] for f in invited_friends],
            invited_users=invited_users,
            scheduled_at=scheduled_time,
            location=location,
            category=activity_type.value,
            budget=budget,
            capacity=capacity,
            ai_analysis=ai_analysis,
            expires_at=datetime.now() + timedelta(hours=24),  # 24時間で期限切れ
            response_count=ResponseCount()
        )
    
    def _build_user_proposals(
        self, proposal: Proposal, all_users: List[Dict[str, Any]]
    ) -> List[Tuple[str, UserProposal]]:
        """ユーザー個別提案を構築（提案内容の複製を含む）"""
        user_proposals = []
        
        for user in all_users:
            user_uid = user.get('uid') or user.get('friendUid')
            if not user_uid:
                continue
                
            user_proposal = UserProposal(
                proposal_id=proposal.proposal_id,
                proposal_ref=f"proposals/{proposal.proposal_id}",
                priority=random.uniform(0.6, 0.9),  # AI算出優先度
                
                # 提案内容の複製（フロントエンド取得用）
                title=proposal.title,
                description=proposal.description,
                type=proposal.type,
                proposal_source=proposal.proposal_source,
                creator_display_name=proposal.creator_display_name,
                target_users=proposal.target_users,
                scheduled_at=proposal.scheduled_at,
                end_time=proposal.end_time,
                location=proposal.location,
                category=proposal.category,
                budget=proposal.budget,
                capacity=proposal.capacity,
                response_count=proposal.response_count,
                expires_at=proposal.expires_at,
                created_at=proposal.created_at or datetime.now()
            )
            
            user_proposals.append((user_uid, user_proposal))
        
        return user_proposals
    
    async def _get_user_data(self, uid: str) -> Optional[Dict[str, Any]]:
        """指定ユーザーのデータを取得"""
        try:
            # Firestoreから直接取得
            user_doc = self.firestore_service.db.collection('users').document(uid).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                user_data['uid'] = uid
                return user_data
            return None
        except Exception as e:
            print(f"❌ Error getting user data for {uid}: {str(e)}")
            return None


# シングルトンインスタンス
_proposal_service = None

def get_proposal_generation_service() -> ProposalGenerationService:
    """提案生成サービスのシングルトンインスタンスを取得"""
    global _proposal_service
    if _proposal_service is None:
        _proposal_service = ProposalGenerationService()
    return _proposal_service 