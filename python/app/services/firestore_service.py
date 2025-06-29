"""
Firestoreとの連携を行うサービスクラス
"""
import os
import json
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from firebase_admin import firestore, credentials, initialize_app
import firebase_admin
from google.cloud.firestore_v1.base_query import FieldFilter

from app.models import (
    Proposal, UserProposal, ProposalLocation, InvitedUser,
    ProposalBudget, ProposalCapacity, AIAnalysis, UserResponse,
    ResponseCount, ProposalSource, ProposalType, ProposalStatus,
    UserResponseStatus, Priority, LocationData
)


class FirestoreService:
    """Firestore連携サービス"""
    
    def __init__(self):
        """Firestoreクライアントを初期化"""
        self._init_firebase()
        self.db = firestore.client()
    
    def _init_firebase(self):
        """Firebase Admin SDKを初期化"""
        if not firebase_admin._apps:
            # 環境変数からサービスアカウントキーを取得
            service_account_key = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
            if service_account_key:
                try:
                    # JSON文字列をパース
                    service_account_dict = json.loads(service_account_key)
                    cred = credentials.Certificate(service_account_dict)
                    print("✅ Using Firebase Service Account Key")
                except json.JSONDecodeError as e:
                    print(f"❌ Error parsing Firebase Service Account Key: {e}")
                    raise
            else:
                try:
                    # Cloud Run環境ではデフォルト認証を使用
                    cred = credentials.ApplicationDefault()
                    print("✅ Using Application Default Credentials")
                except Exception as e:
                    print(f"❌ No Firebase credentials found. Error: {e}")
                    print("📋 Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable")
                    print("📋 Or use Firebase Emulator for local development")
                    raise
            
            initialize_app(cred)
    
    async def get_active_users(self, location_filter: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """アクティブなユーザーを取得"""
        try:
            users_ref = self.db.collection('users')
            
            # オンライン且つ'free'ステータスのユーザーを取得
            query = users_ref.where(filter=FieldFilter('isActive', '==', True)) \
                             .where(filter=FieldFilter('isOnline', '==', True)) \
                             .where(filter=FieldFilter('currentStatus', '==', 'free'))
            
            # 位置情報フィルターがある場合は適用
            if location_filter:
                # TODO: Geohashを使った位置フィルタリング実装
                pass
            
            docs = query.stream()
            users = []
            
            for doc in docs:
                user_data = doc.to_dict()
                user_data['uid'] = doc.id
                users.append(user_data)
            
            return users
        
        except Exception as e:
            print(f"❌ Error getting active users: {str(e)}")
            return []
    
    async def get_user_friends(self, user_uid: str) -> List[Dict[str, Any]]:
        """ユーザーの友人リストを取得"""
        try:
            friends_ref = self.db.collection('users').document(user_uid).collection('friendsList')
            docs = friends_ref.stream()
            
            friends = []
            for doc in docs:
                friend_data = doc.to_dict()
                friend_data['friendUid'] = doc.id
                friends.append(friend_data)
            
            return friends
        
        except Exception as e:
            print(f"❌ Error getting user friends: {str(e)}")
            return []
    
    async def get_user_location(self, user_uid: str) -> Optional[Dict[str, Any]]:
        """ユーザーの位置情報を取得"""
        try:
            location_doc = self.db.collection('locations').document(user_uid).get()
            if location_doc.exists:
                return location_doc.to_dict()
            return None
        
        except Exception as e:
            print(f"❌ Error getting user location: {str(e)}")
            return None
    
    async def create_proposal(self, proposal: Proposal) -> bool:
        """提案をFirestoreに保存"""
        try:
            # proposalsコレクションに保存
            proposal_data = proposal.dict()
            
            # datetimeをFirestoreのTimestampに変換
            self._convert_datetime_to_timestamp(proposal_data)
            
            # proposalを保存
            self.db.collection('proposals').document(proposal.proposal_id).set(proposal_data)
            
            print(f"✅ Proposal {proposal.proposal_id} created successfully")
            return True
        
        except Exception as e:
            print(f"❌ Error creating proposal: {str(e)}")
            return False
    
    async def create_user_proposals(self, user_proposals: List[Tuple[str, UserProposal]]) -> int:
        """ユーザー個別提案をFirestoreに保存"""
        success_count = 0
        
        try:
            for user_uid, user_proposal in user_proposals:
                user_proposal_data = user_proposal.dict()
                
                # datetimeをFirestoreのTimestampに変換
                self._convert_datetime_to_timestamp(user_proposal_data)
                
                # userProposalサブコレクションに保存
                user_ref = self.db.collection('users').document(user_uid)
                user_ref.collection('userProposal').document(user_proposal.proposal_id).set(user_proposal_data)
                
                success_count += 1
            
            print(f"✅ {success_count} user proposals created successfully")
            return success_count
        
        except Exception as e:
            print(f"❌ Error creating user proposals: {str(e)}")
            return success_count
    
    async def update_proposal_response(self, user_uid: str, proposal_id: str, response_status: UserResponseStatus) -> bool:
        """ユーザーの提案応答を更新"""
        try:
            # userProposalを更新
            user_proposal_ref = (self.db.collection('users').document(user_uid)
                               .collection('userProposal').document(proposal_id))
            
            user_proposal_ref.update({
                'status': response_status.value,
                'responded_at': datetime.now(),
                'updated_at': datetime.now()
            })
            
            # 元のproposalも更新
            proposal_ref = self.db.collection('proposals').document(proposal_id)
            proposal_doc = proposal_ref.get()
            
            if proposal_doc.exists:
                proposal_data = proposal_doc.to_dict()
                
                # responses辞書を更新
                responses = proposal_data.get('responses', {})
                responses[user_uid] = {
                    'status': response_status.value,
                    'responded_at': datetime.now()
                }
                
                # response_countを更新
                response_count = self._calculate_response_count(responses)
                
                proposal_ref.update({
                    'responses': responses,
                    'response_count': response_count,
                    'updated_at': datetime.now()
                })
            
            print(f"✅ Proposal response updated: {user_uid} -> {proposal_id} ({response_status.value})")
            return True
        
        except Exception as e:
            print(f"❌ Error updating proposal response: {str(e)}")
            return False
    
    async def get_user_proposals(self, user_uid: str, limit: int = 10) -> List[Dict[str, Any]]:
        """ユーザーの提案を取得"""
        try:
            user_proposals_ref = (self.db.collection('users').document(user_uid)
                                .collection('userProposal')
                                .order_by('received_at', direction=firestore.Query.DESCENDING)
                                .limit(limit))
            
            docs = user_proposals_ref.stream()
            proposals = []
            
            for doc in docs:
                proposal_data = doc.to_dict()
                proposals.append(proposal_data)
            
            return proposals
        
        except Exception as e:
            print(f"❌ Error getting user proposals: {str(e)}")
            return []
    
    async def get_proposal_details(self, proposal_id: str) -> Optional[Dict[str, Any]]:
        """提案の詳細を取得"""
        try:
            proposal_doc = self.db.collection('proposals').document(proposal_id).get()
            if proposal_doc.exists:
                return proposal_doc.to_dict()
            return None
        
        except Exception as e:
            print(f"❌ Error getting proposal details: {str(e)}")
            return None
    
    def _convert_datetime_to_timestamp(self, data: Dict[str, Any]):
        """辞書内のdatetimeオブジェクトをFirestoreのTimestampに変換（再帰的）"""
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value
            elif isinstance(value, dict):
                self._convert_datetime_to_timestamp(value)
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        self._convert_datetime_to_timestamp(item)
                    elif isinstance(item, datetime):
                        value[i] = item
    
    def _calculate_response_count(self, responses: Dict[str, Dict]) -> Dict[str, int]:
        """応答状況を集計"""
        count = {
            'accepted': 0,
            'declined': 0,
            'pending': 0,
            'maybe': 0
        }
        
        for response in responses.values():
            status = response.get('status', 'pending')
            if status in count:
                count[status] += 1
        
        return count
    
    async def cleanup_expired_proposals(self) -> int:
        """期限切れの提案をクリーンアップ"""
        try:
            now = datetime.now()
            proposals_ref = self.db.collection('proposals')
            
            # 期限切れの提案を取得
            expired_query = proposals_ref.where(filter=FieldFilter('expires_at', '<', now)) \
                                       .where(filter=FieldFilter('status', '==', 'active'))
            
            expired_docs = expired_query.stream()
            cleanup_count = 0
            
            for doc in expired_docs:
                # ステータスを'expired'に更新
                doc.reference.update({
                    'status': 'expired',
                    'updated_at': now
                })
                cleanup_count += 1
            
            print(f"✅ Cleaned up {cleanup_count} expired proposals")
            return cleanup_count
        
        except Exception as e:
            print(f"❌ Error cleaning up expired proposals: {str(e)}")
            return 0


# シングルトンインスタンス
_firestore_service = None

def get_firestore_service() -> FirestoreService:
    """Firestoreサービスのシングルトンインスタンスを取得"""
    global _firestore_service
    if _firestore_service is None:
        _firestore_service = FirestoreService()
    return _firestore_service 