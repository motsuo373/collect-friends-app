import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

// メール認証 - 新規登録
export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // ユーザー名を設定
    await updateProfile(user, {
      displayName: displayName
    });
    
    console.log('新規登録成功:', user);
    return user;
  } catch (error) {
    console.error('新規登録エラー:', error);
    throw error;
  }
};

// メール認証 - ログイン
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('メールログイン成功:', userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error('メールログインエラー:', error);
    throw error;
  }
};

// ログアウト
export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log('ログアウト成功');
  } catch (error) {
    console.error('ログアウトエラー:', error);
    throw error;
  }
};

 