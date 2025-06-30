import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

// Firebase Admin初期化
initializeApp();

// グローバル設定
setGlobalOptions({
  region: 'asia-northeast1', // 東京リージョン
  maxInstances: 10,
});

// AI関連の関数
export * from './ai';

// ユーザー関連の関数
export * from './users';

// チャット関連の関数
export * from './chats';

// イベント関連の関数
export * from './events';

// 店舗関連の関数
export * from './stores';

// 位置情報関連の関数
export * from './locations';

// Hello World関数（テスト用）
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

export const helloWorld = onRequest((request, response) => {
  logger.info('Hello logs!', { structuredData: true });
  response.json({
    message: 'Hello from Collect Friends API!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}); 