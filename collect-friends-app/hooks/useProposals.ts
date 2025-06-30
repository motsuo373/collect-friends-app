import { useState, useEffect } from 'react';
import { DocumentData } from 'firebase/firestore';
import { getCollectionWithQuery, getDocument, getMultipleUsers } from '../utils/firestoreService';

// database.mdのuserProposalサブコレクションに基づく提案データの型定義
export interface UserProposalData {
  id: string;
  proposalId: string;
  status: 'pending' | 'accepted' | 'declined' | 'maybe';
  respondedAt?: Date;
  notificationSent: boolean;
  receivedAt: Date;
  updatedAt: Date;
  // proposalsコレクションから追加で取得される詳細情報
  title?: string;
  description?: string;
  proposalSource?: 'user' | 'ai' | 'friend_invite';
  creatorDisplayName?: string;
  scheduledAt?: Date;
  endTime?: Date;
  createdAt?: Date;
  expiresAt?: Date;
  category?: string;
  location?: {
    name?: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
    perPerson?: boolean;
  };
  targetUsers?: string[]; // UIDの配列（Firestoreの実際の構造）
  participantUsers?: Array<{ // UIで表示するためのユーザー情報
    uid: string;
    displayName: string;
  }>;
  responseCount?: {
    accepted: number;
    declined: number;
    pending: number;
  };
}

export interface ProposalsHookResult {
  proposals: UserProposalData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 現在のユーザーの提案データをuserProposalサブコレクションから取得するhook
 * @param currentUserUid - 現在のユーザーのUID
 * @returns 提案データとロード状態
 */
export const useProposals = (currentUserUid: string | null): ProposalsHookResult => {
  const [proposals, setProposals] = useState<UserProposalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = async () => {
    if (!currentUserUid) {
      setProposals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // users/{uid}/userProposalサブコレクションから提案データを取得
      const userProposalData = await getCollectionWithQuery(
        `users/${currentUserUid}/userProposal`
      );

      if (userProposalData.length === 0) {
        setProposals([]);
        setLoading(false);
        return;
      }

      // userProposalサブコレクションから直接データを構築
      // 新しい設計では、userProposalに必要な情報が全て含まれているため、
      // proposalsコレクションへの追加アクセスは不要でパフォーマンスが向上
      const proposalsFromUserProposal = await Promise.all(
        userProposalData.map(async (userProposal: DocumentData) => {
          const proposal: UserProposalData = {
            id: userProposal.id,
            proposalId: userProposal.proposalId,
            status: userProposal.status || 'pending',
            respondedAt: userProposal.respondedAt?.toDate ? userProposal.respondedAt.toDate() : undefined,
            notificationSent: userProposal.notificationSent || false,
            receivedAt: userProposal.receivedAt?.toDate ? userProposal.receivedAt.toDate() : new Date(),
            updatedAt: userProposal.updatedAt?.toDate ? userProposal.updatedAt.toDate() : new Date(),
            
            // 新しく追加された提案内容フィールド（userProposalサブコレクションから直接取得）
            title: userProposal.title || 'タイトル未設定',
            description: userProposal.description || '',
            proposalSource: userProposal.proposalSource || userProposal.proposal_source || 'user',
            creatorDisplayName: userProposal.creatorDisplayName || userProposal.creator_display_name || '匿名ユーザー',
            scheduledAt: userProposal.scheduledAt?.toDate ? userProposal.scheduledAt.toDate() : 
                        userProposal.scheduled_at?.toDate ? userProposal.scheduled_at.toDate() : undefined,
            endTime: userProposal.endTime?.toDate ? userProposal.endTime.toDate() : 
                    userProposal.end_time?.toDate ? userProposal.end_time.toDate() : undefined,
            createdAt: userProposal.createdAt?.toDate ? userProposal.createdAt.toDate() : 
                      userProposal.created_at?.toDate ? userProposal.created_at.toDate() : undefined,
            expiresAt: userProposal.expiresAt?.toDate ? userProposal.expiresAt.toDate() : 
                      userProposal.expires_at?.toDate ? userProposal.expires_at.toDate() : undefined,
            category: userProposal.category || 'other',
            location: userProposal.location,
            budget: userProposal.budget,
            targetUsers: userProposal.targetUsers || userProposal.target_users || [],
            responseCount: userProposal.responseCount || userProposal.response_count || { accepted: 0, declined: 0, pending: 1 },
          };

          // targetUsersからparticipantUsersを取得
          try {
            if (proposal.targetUsers && proposal.targetUsers.length > 0) {
              const participantUsers = await getMultipleUsers(proposal.targetUsers);
              proposal.participantUsers = participantUsers;
            } else {
              proposal.participantUsers = [];
            }
          } catch (error) {
            console.error('参加者情報取得エラー:', error);
            proposal.participantUsers = [];
          }

          return proposal;
        })
      );

      // 受信日時で降順ソート（新しいものが上）
      const sortedProposals = proposalsFromUserProposal.sort((a: UserProposalData, b: UserProposalData) => 
        b.receivedAt.getTime() - a.receivedAt.getTime()
      );

      setProposals(sortedProposals);
      
    } catch (err) {
      console.error('提案データ取得エラー:', err);
      setError('提案データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [currentUserUid]);

  return {
    proposals,
    loading,
    error,
    refetch: fetchProposals,
  };
}; 