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

export const firestoreService = {
  setDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  getCollection,
  getCollectionWithQuery,
  addDocument
}; 