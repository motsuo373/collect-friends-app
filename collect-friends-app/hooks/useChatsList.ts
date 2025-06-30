import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatListItem {
  id: string;
  chatId: string;
  title: string;
  lastMessage: {
    messageId: string;
    senderUid: string;
    senderDisplayName: string;
    content: string;
    type: string;
    timestamp: string;
  } | null;
  lastMessageTime: Date | null;
  unreadCount: number;
  participants: string[];
  participantDisplayNames: string[];
  chatType: 'group' | 'ai_proposal' | 'direct';
  isActive: boolean;
  isMuted: boolean;
  isPinned: boolean;
  role: 'admin' | 'member' | 'guest';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const useChatsList = () => {
  const [chatsList, setChatsList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const chatsListQuery = query(
      collection(db, 'users', user.uid, 'chatsList'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsListQuery, (snapshot) => {
      try {
        setError(null);
        const chatsData: ChatListItem[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // timestampの変換
          const convertTimestamp = (timestamp: any): Date => {
            if (!timestamp) return new Date();
            if (timestamp instanceof Timestamp) {
              return timestamp.toDate();
            } else if (timestamp?.toDate) {
              return timestamp.toDate();
            } else if (timestamp?.seconds) {
              return new Date(timestamp.seconds * 1000);
            }
            return new Date();
          };

          const chatItem: ChatListItem = {
            id: doc.id,
            chatId: data.chatId || doc.id,
            title: data.title || 'タイトル未設定',
            lastMessage: data.lastMessage || null,
            lastMessageTime: data.lastMessageTime ? convertTimestamp(data.lastMessageTime) : null,
            unreadCount: data.unreadCount || 0,
            participants: data.participants || [],
            participantDisplayNames: data.participantDisplayNames || [],
            chatType: data.chatType || 'group',
            isActive: data.isActive !== undefined ? data.isActive : true,
            isMuted: data.isMuted || false,
            isPinned: data.isPinned || false,
            role: data.role || 'member',
            joinedAt: convertTimestamp(data.joinedAt),
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
          };

          chatsData.push(chatItem);
        });

        // ピン留めされたチャットを優先してソート
        chatsData.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          // 最終更新日時でソート
          if (a.lastMessageTime && b.lastMessageTime) {
            return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
          }
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        });

        setChatsList(chatsData);
        setLoading(false);
      } catch (error) {
        console.error('チャット一覧取得エラー:', error);
        setError('チャット一覧の取得に失敗しました。');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return {
    chatsList,
    loading,
    error,
  };
}; 