import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  DocumentData,
  DocumentReference,
  QueryConstraint,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * ランダムな文字列を生成（メッセージIDなどに使用）
 * @param length - 生成する文字列の長さ（デフォルト: 20）
 * @returns ランダムな文字列
 */
export const generateRandomId = (length: number = 20): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * ドキュメントパスを解析してコレクション名とドキュメントIDを抽出
 * @param path - "/collection/docId" または "/collection/docId/subcollection/subDocId" 形式のパス
 * @returns { collectionPath: string, docId: string }
 */
function parsePath(path: string) {
  const parts = path.split('/').filter(part => part.length > 0);
  if (parts.length < 2) {
    throw new Error('パスは "/collection/docId" の形式である必要があります');
  }
  
  const docId = parts[parts.length - 1];
  const collectionPath = parts.slice(0, -1).join('/');
  
  return { collectionPath, docId };
}

/**
 * ドキュメントの作成・更新
 * @param path - "/user/uid" のようなドキュメントパス
 * @param data - 保存するデータオブジェクト
 * @param merge - マージするかどうか（デフォルト: true）
 * @returns Promise<void>
 */
export const setDocument = async (
  path: string,
  data: DocumentData,
  merge: boolean = true
): Promise<void> => {
  try {
    const { collectionPath, docId } = parsePath(path);
    const docRef = doc(db, collectionPath, docId);
    
    const dataWithTimestamp = {
      ...data,
      updatedAt: serverTimestamp(),
      ...(merge ? {} : { createdAt: serverTimestamp() })
    };
    
    await setDoc(docRef, dataWithTimestamp, { merge });
  } catch (error) {
    console.error(`ドキュメント保存エラー (${path}):`, error);
    throw error;
  }
};

/**
 * ドキュメントの取得
 * @param path - "/user/uid" のようなドキュメントパス
 * @returns Promise<DocumentData | null>
 */
export const getDocument = async (path: string): Promise<DocumentData | null> => {
  try {
    const { collectionPath, docId } = parsePath(path);
    const docRef = doc(db, collectionPath, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`ドキュメント取得エラー (${path}):`, error);
    throw error;
  }
};

/**
 * ドキュメントの部分更新
 * @param path - "/user/uid" のようなドキュメントパス
 * @param data - 更新するデータオブジェクト
 * @returns Promise<void>
 */
export const updateDocument = async (
  path: string,
  data: Partial<DocumentData>
): Promise<void> => {
  try {
    const { collectionPath, docId } = parsePath(path);
    const docRef = doc(db, collectionPath, docId);
    
    const dataWithTimestamp = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, dataWithTimestamp);
  } catch (error) {
    console.error(`ドキュメント更新エラー (${path}):`, error);
    throw error;
  }
};

/**
 * ドキュメントの削除
 * @param path - "/user/uid" のようなドキュメントパス
 * @returns Promise<void>
 */
export const deleteDocument = async (path: string): Promise<void> => {
  try {
    const { collectionPath, docId } = parsePath(path);
    const docRef = doc(db, collectionPath, docId);
    
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`ドキュメント削除エラー (${path}):`, error);
    throw error;
  }
};

/**
 * コレクションの取得（全件）
 * @param collectionPath - "users" のようなコレクションパス
 * @returns Promise<DocumentData[]>
 */
export const getCollection = async (collectionPath: string): Promise<DocumentData[]> => {
  try {
    const colRef = collection(db, collectionPath);
    const querySnapshot = await getDocs(colRef);
    
    const documents: DocumentData[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return documents;
  } catch (error) {
    console.error(`コレクション取得エラー (${collectionPath}):`, error);
    throw error;
  }
};

/**
 * クエリ付きコレクションの取得
 * @param collectionPath - "users" のようなコレクションパス
 * @param constraints - where, orderBy, limit等のクエリ制約
 * @returns Promise<DocumentData[]>
 */
export const getCollectionWithQuery = async (
  collectionPath: string,
  constraints: QueryConstraint[] = []
): Promise<DocumentData[]> => {
  try {
    const colRef = collection(db, collectionPath);
    const q = query(colRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const documents: DocumentData[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return documents;
  } catch (error) {
    console.error(`クエリ付きコレクション取得エラー (${collectionPath}):`, error);
    throw error;
  }
};

/**
 * 複数のユーザー情報を並列で取得
 * @param userUids - ユーザーUIDの配列
 * @returns Promise<Array<{uid: string, displayName: string}>>
 */
export const getMultipleUsers = async (userUids: string[]): Promise<Array<{uid: string, displayName: string}>> => {
  try {
    // 空の配列の場合は空を返す
    if (!userUids || userUids.length === 0) {
      return [];
    }

    // 並列でユーザー情報を取得
    const userPromises = userUids.map(async (uid) => {
      try {
        const userData = await getDocument(`users/${uid}`);
        return {
          uid: uid,
          displayName: userData?.displayName || '不明なユーザー'
        };
      } catch (error) {
        console.error(`ユーザー情報取得エラー (${uid}):`, error);
        return {
          uid: uid,
          displayName: '不明なユーザー'
        };
      }
    });

    const users = await Promise.all(userPromises);
    return users;
  } catch (error) {
    console.error('複数ユーザー情報取得エラー:', error);
    throw error;
  }
};

/**
 * コレクションに新しいドキュメントを追加（自動ID生成）
 * @param collectionPath - "users" のようなコレクションパス
 * @param data - 保存するデータオブジェクト
 * @returns Promise<string> - 生成されたドキュメントID
 */
export const addDocument = async (
  collectionPath: string,
  data: DocumentData
): Promise<string> => {
  try {
    const colRef = collection(db, collectionPath);
    
    const dataWithTimestamp = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(colRef, dataWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error(`ドキュメント追加エラー (${collectionPath}):`, error);
    throw error;
  }
};

export const firestoreQueries = {
  where,
  orderBy,
  limit
};

/**
 * ユーザーの提案への応答を更新
 * @param userUid - ユーザーUID
 * @param proposalId - 提案ID
 * @param status - 応答ステータス ('pending', 'accepted', 'declined', 'maybe')
 * @returns Promise<void>
 */
export const updateProposalResponse = async (
  userUid: string,
  proposalId: string,
  status: 'pending' | 'accepted' | 'declined' | 'maybe'
): Promise<void> => {
  try {
    const userProposalPath = `users/${userUid}/userProposal/${proposalId}`;
    await updateDocument(userProposalPath, {
      status,
      respondedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`提案応答更新エラー (${proposalId}):`, error);
    throw error;
  }
};

/**
 * ユーザーの提案を削除（辞退時に使用）
 * @param userUid - ユーザーUID
 * @param proposalId - 提案ID
 * @returns Promise<void>
 */
export const deleteProposalResponse = async (
  userUid: string,
  proposalId: string
): Promise<void> => {
  try {
    const userProposalPath = `users/${userUid}/userProposal/${proposalId}`;
    await deleteDocument(userProposalPath);
  } catch (error) {
    console.error(`提案削除エラー (${proposalId}):`, error);
    throw error;
  }
};

/**
 * 提案の詳細情報を取得
 * @param proposalId - 提案ID
 * @returns Promise<DocumentData | null>
 */
export const getProposalDetails = async (proposalId: string): Promise<DocumentData | null> => {
  try {
    const proposalPath = `proposals/${proposalId}`;
    return await getDocument(proposalPath);
  } catch (error) {
    console.error(`提案詳細取得エラー (${proposalId}):`, error);
    throw error;
  }
};

/**
 * チャットメッセージを送信（カスタムIDで保存）
 * @param chatId - チャットID
 * @param messageData - メッセージデータ
 * @returns Promise<string> - 生成されたメッセージID
 */
export const sendChatMessage = async (
  chatId: string,
  messageData: {
    content: string;
    senderRef: string;
    type?: string;
    aiGenerated?: boolean;
  }
): Promise<string> => {
  try {
    const messageId = generateRandomId(20);
    const messagePath = `chats/${chatId}/messages/${messageId}`;
    
    const fullMessageData = {
      ...messageData,
      timestamp: serverTimestamp(),
      type: messageData.type || 'text',
      aiGenerated: messageData.aiGenerated || false,
      isRead: {
        [messageData.senderRef]: serverTimestamp()
      }
    };
    
    await setDocument(messagePath, fullMessageData, false);
    return messageId;
  } catch (error) {
    console.error(`メッセージ送信エラー (${chatId}):`, error);
    throw error;
  }
};

export const firestoreService = {
  setDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  getCollection,
  getCollectionWithQuery,
  addDocument,
  updateProposalResponse,
  deleteProposalResponse,
  getProposalDetails,
  generateRandomId,
  sendChatMessage
}; 