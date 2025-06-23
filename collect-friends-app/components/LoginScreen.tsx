import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { signInWithGoogle, signInWithTwitter, signInWithLine, signInWithEmail } from '../utils/auth';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import SignUpScreen from './SignUpScreen';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [showSignUp, setShowSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      onLoginSuccess();
    } catch (error: any) {
      console.error('メールログインエラー:', error);
      let errorMessage = 'ログインに失敗しました';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'ユーザーが見つかりません';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'パスワードが間違っています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください';
      }
      
      Alert.alert('エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      onLoginSuccess();
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('エラー', 'Googleログインに失敗しました');
    }
  };

  const handleTwitterLogin = async () => {
    try {
      await signInWithTwitter();
      onLoginSuccess();
    } catch (error) {
      console.error('Twitter login error:', error);
      Alert.alert('エラー', 'Twitterログインに失敗しました');
    }
  };

  const handleLineLogin = async () => {
    try {
      await signInWithLine();
      onLoginSuccess();
    } catch (error) {
      console.error('LINE login error:', error);
      Alert.alert('エラー', 'LINEログインに失敗しました');
    }
  };

  if (showSignUp) {
    return (
      <SignUpScreen
        onSwitchToLogin={() => setShowSignUp(false)}
        onSignUpSuccess={() => {
          setShowSignUp(false);
          onLoginSuccess();
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.loginContainer}>
          <ThemedText style={styles.title}>Collect Friends</ThemedText>
          <ThemedText style={styles.subtitle}>今すぐ遊べる友達を見つけよう！</ThemedText>
          
          {/* メール認証フォーム */}
          <View style={styles.emailForm}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="メールアドレスを入力"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>パスワード</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="パスワードを入力"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'ログイン中...' : 'メールでログイン'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpLink}
              onPress={() => setShowSignUp(true)}
            >
              <Text style={styles.signUpLinkText}>
                アカウントをお持ちでない方はこちら
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>または</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* SNSログインボタン */}
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
              <Text style={styles.googleButtonText}>Googleでログイン</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.twitterButton} onPress={handleTwitterLogin}>
              <Text style={styles.twitterButtonText}>Twitterでログイン</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.lineButton} onPress={handleLineLogin}>
              <Text style={styles.lineButtonText}>LINEでログイン</Text>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  emailForm: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  signUpLink: {
    marginTop: 15,
    alignItems: 'center',
  },
  signUpLinkText: {
    color: '#007AFF',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  socialButtonsContainer: {
    gap: 15,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  twitterButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  twitterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  lineButton: {
    backgroundColor: '#00C300',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  lineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 