import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  content: string;
  senderRef: string;
  senderName: string;
  timestamp: Date;
  isCurrentUser: boolean;
  type: 'text' | 'image' | 'poll' | 'ai_message';
  aiGenerated?: boolean;
}

export const useChat = (chatRoomId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // メッセージのリアルタイム監視
  useEffect(() => {
    if (!chatRoomId) {
      setLoading(false);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chats', chatRoomId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      try {
        setError(null);
        const messagePromises = snapshot.docs.map(async (messageDoc) => {
          const data = messageDoc.data();
          
          // 送信者の情報を取得
          let senderName = '不明ユーザー';
          if (data.senderRef && typeof data.senderRef === 'string') {
            try {
              const senderDoc = await getDoc(doc(db, 'users', data.senderRef));
              if (senderDoc.exists()) {
                const senderData = senderDoc.data();
                senderName = senderData.displayName || senderData.name || 'ユーザー';
              }
            } catch (error) {
              console.warn('送信者情報の取得に失敗:', error);
            }
          }

          // timestampの変換
          let timestamp = new Date();
          if (data.timestamp) {
            if (data.timestamp instanceof Timestamp) {
              timestamp = data.timestamp.toDate();
            } else if (data.timestamp?.toDate) {
              timestamp = data.timestamp.toDate();
            }
          }

          const message: ChatMessage = {
            id: messageDoc.id,
            content: data.content || '',
            senderRef: data.senderRef || '',
            senderName,
            timestamp,
            isCurrentUser: user ? data.senderRef === user.uid : false,
            type: data.type || 'text',
            aiGenerated: data.aiGenerated || false,
          };

          return message;
        });

        const messagesData = await Promise.all(messagePromises);
        setMessages(messagesData);
        setLoading(false);
      } catch (error) {
        console.error('メッセージ取得エラー:', error);
        setError('メッセージの取得に失敗しました。');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [chatRoomId, user]);

  // メッセージ送信
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !user || !chatRoomId) {
      throw new Error('メッセージの送信に必要な情報が不足しています。');
    }

    try {
      const messageData = {
        content: content.trim(),
        senderRef: user.uid,
        timestamp: serverTimestamp(),
        type: 'text',
        aiGenerated: false,
        isRead: {
          [user.uid]: serverTimestamp()
        }
      };

      await addDoc(collection(db, 'chats', chatRoomId, 'messages'), messageData);
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      throw new Error('メッセージの送信に失敗しました。');
    }
  }, [user, chatRoomId]);

  // AIメッセージ送信
  const sendAIMessage = useCallback(async (content: string) => {
    if (!content.trim() || !chatRoomId) {
      throw new Error('AIメッセージの送信に必要な情報が不足しています。');
    }

    try {
      const messageData = {
        content: content.trim(),
        senderRef: 'ai_system',
        timestamp: serverTimestamp(),
        type: 'ai_message',
        aiGenerated: true,
        isRead: {}
      };

      await addDoc(collection(db, 'chats', chatRoomId, 'messages'), messageData);
    } catch (error) {
      console.error('AIメッセージ送信エラー:', error);
      throw new Error('AIメッセージの送信に失敗しました。');
    }
  }, [chatRoomId]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendAIMessage,
  };
}; 