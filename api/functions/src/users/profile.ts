import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * ユーザープロフィール取得
 * GET /api/users/profile?uid={uid}
 */
export const getProfile = onRequest({
  cors: true,
  region: 'asia-northeast1',
}, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ 
        error: 'uid parameter is required' 
      });
      return;
    }

    // ユーザーのプロフィール情報を取得
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ 
        error: 'User not found' 
      });
      return;
    }

    const userData = userDoc.data();
    
    res.status(200).json({
      success: true,
      profile: {
        uid: userData?.uid,
        email: userData?.email,
        displayName: userData?.displayName,
        bio: userData?.bio,
        profileImage: userData?.profileImage,
        accountType: userData?.accountType,
        isActive: userData?.isActive,
        currentStatus: userData?.currentStatus,
        mood: userData?.mood,
        availableUntil: userData?.availableUntil,
        customMessage: userData?.customMessage,
        isOnline: userData?.isOnline,
        lastActive: userData?.lastActive,
        createdAt: userData?.createdAt,
        updatedAt: userData?.updatedAt,
      }
    });

  } catch (error) {
    logger.error('プロフィール取得エラー:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * ユーザープロフィール更新
 * PUT /api/users/profile
 */
export const updateProfile = onRequest({
  cors: true,
  region: 'asia-northeast1',
}, async (req, res) => {
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { uid, displayName, bio, profileImage } = req.body;

    if (!uid) {
      res.status(400).json({ 
        error: 'uid is required' 
      });
      return;
    }

    if (!displayName || !displayName.trim()) {
      res.status(400).json({ 
        error: 'displayName is required' 
      });
      return;
    }

    // ユーザーが存在するかチェック
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      res.status(404).json({ 
        error: 'User not found' 
      });
      return;
    }

    // プロフィール情報を更新
    const updateData = {
      displayName: displayName.trim(),
      bio: bio ? bio.trim() : '',
      profileImage: profileImage || '',
      updatedAt: new Date(),
    };

    await db.collection('users').doc(uid).update(updateData);

    logger.info(`プロフィール更新成功: ${uid}`, updateData);

    res.status(200).json({
      success: true,
      message: 'プロフィールを更新しました',
      updatedFields: updateData
    });

  } catch (error) {
    logger.error('プロフィール更新エラー:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 