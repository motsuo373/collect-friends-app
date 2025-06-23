import { 
  GoogleAuthProvider, 
  TwitterAuthProvider, 
  signInWithPopup, 
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { auth, GOOGLE_WEB_CLIENT_ID } from '../firebaseConfig';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

// WebBrowserの設定を完了する
WebBrowser.maybeCompleteAuthSession();

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

// Google認証（WebBrowser使用）
export const signInWithGoogle = async () => {
  try {
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error('Google Web Client IDが設定されていません');
    }

    if (Platform.OS === 'web') {
      // Web版の場合
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } else {
      // モバイル版 - WebBrowserを使用
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'collectfriendsapp',
      });
      
      const authUrl = 
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_WEB_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=openid%20profile%20email&` +
        `access_type=offline&` +
        `prompt=select_account`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          // 認証コードをアクセストークンに交換
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: GOOGLE_WEB_CLIENT_ID,
              code: code,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
            }).toString(),
          });

          const tokenData = await tokenResponse.json();
          
          if (tokenData.access_token && tokenData.id_token) {
            const credential = GoogleAuthProvider.credential(
              tokenData.id_token,
              tokenData.access_token
            );
            
            const firebaseResult = await signInWithCredential(auth, credential);
            return firebaseResult.user;
          }
        }
      } else if (result.type === 'cancel') {
        throw new Error('ユーザーが認証をキャンセルしました');
      }
      
      throw new Error('認証に失敗しました');
    }
  } catch (error) {
    console.error('Google認証エラー:', error);
    throw error;
  }
};

// X(Twitter)認証
export const signInWithTwitter = async () => {
  try {
    if (Platform.OS === 'web') {
      // Web版の場合
      const provider = new TwitterAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } else {
      // モバイル版は後で実装
      throw new Error('Twitter認証はまだサポートされていません');
    }
  } catch (error) {
    console.error('Twitter認証エラー:', error);
    throw error;
  }
};

// LINE認証（将来的な実装用）
export const signInWithLine = async () => {
  try {
    // LINE認証は後で実装
    throw new Error('LINE認証はまだサポートされていません');
  } catch (error) {
    console.error('LINE認証エラー:', error);
    throw error;
  }
}; 