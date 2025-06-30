import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * 友達追加リクエスト
 * POST /api/users/addFriend
 */
export const addFriend = onRequest({
  cors: true,
  region: 'asia-northeast1',
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { friendUid, currentUserUid } = req.body;

    // バリデーション
    if (!friendUid || !currentUserUid) {
      res.status(400).json({ 
        error: 'friendUid and currentUserUid are required' 
      });
      return;
    }

    if (friendUid === currentUserUid) {
      res.status(400).json({ 
        error: 'Cannot add yourself as friend' 
      });
      return;
    }

    // 友達になるユーザーが存在するかチェック
    const friendUserDoc = await db.collection('users').doc(friendUid).get();
    if (!friendUserDoc.exists) {
      res.status(404).json({ 
        error: 'User not found' 
      });
      return;
    }

    const currentUserDoc = await db.collection('users').doc(currentUserUid).get();
    if (!currentUserDoc.exists) {
      res.status(404).json({ 
        error: 'Current user not found' 
      });
      return;
    }

    const friendData = friendUserDoc.data();
    const currentUserData = currentUserDoc.data();

    // 既に友達かどうかチェック
    const existingFriendship = await db
      .collection('users')
      .doc(currentUserUid)
      .collection('friendsList')
      .doc(friendUid)
      .get();

    if (existingFriendship.exists) {
      res.status(400).json({ 
        error: 'Already friends or friendship request exists' 
      });
      return;
    }

    const now = new Date();
    const relationshipId = `${currentUserUid}_${friendUid}`;

    // トランザクションで友達関係を作成
    await db.runTransaction(async (transaction) => {
      // 1. relationshipsコレクションに関係を作成
      const relationshipRef = db.collection('relationships').doc(relationshipId);
      transaction.set(relationshipRef, {
        relationshipId,
        userARef: db.collection('users').doc(currentUserUid),
        userBRef: db.collection('users').doc(friendUid),
        status: 'accepted', // 直接承認（リクエスト制ではなく）
        locationSharingA: {
          level: 2, // デフォルトは大雑把位置
          enabled: true
        },
        locationSharingB: {
          level: 2, // デフォルトは大雑把位置
          enabled: true
        },
        requestedAt: now,
        acceptedAt: now,
        interactionHistory: {
          totalMeetups: 0,
          lastMeetup: null,
          commonInterests: []
        }
      });

      // 2. 現在のユーザーのfriendsListに追加
      const currentUserFriendRef = db
        .collection('users')
        .doc(currentUserUid)
        .collection('friendsList')
        .doc(friendUid);
      
      transaction.set(currentUserFriendRef, {
        friendUid,
        displayName: friendData?.displayName || 'Unknown User',
        profileImage: friendData?.profileImage || '',
        relationshipRef: relationshipRef,
        sharingLevel: 2,
        currentStatus: friendData?.currentStatus || 'offline',
        mood: friendData?.mood || [],
        availableUntil: friendData?.availableUntil || null,
        customMessage: friendData?.customMessage || '',
        isOnline: friendData?.isOnline || false,
        lastActive: friendData?.lastActive || now,
        sharedLocation: {
          level: 2,
          statusOnly: false,
          areaDescription: '不明',
          distanceRange: '不明'
        },
        locationLastUpdate: null,
        isFavorite: false,
        interactionCount: 0,
        lastInteraction: null,
        createdAt: now,
        updatedAt: now
      });

      // 3. 友達のfriendsListに追加
      const friendUserFriendRef = db
        .collection('users')
        .doc(friendUid)
        .collection('friendsList')
        .doc(currentUserUid);
      
      transaction.set(friendUserFriendRef, {
        friendUid: currentUserUid,
        displayName: currentUserData?.displayName || 'Unknown User',
        profileImage: currentUserData?.profileImage || '',
        relationshipRef: relationshipRef,
        sharingLevel: 2,
        currentStatus: currentUserData?.currentStatus || 'offline',
        mood: currentUserData?.mood || [],
        availableUntil: currentUserData?.availableUntil || null,
        customMessage: currentUserData?.customMessage || '',
        isOnline: currentUserData?.isOnline || false,
        lastActive: currentUserData?.lastActive || now,
        sharedLocation: {
          level: 2,
          statusOnly: false,
          areaDescription: '不明',
          distanceRange: '不明'
        },
        locationLastUpdate: null,
        isFavorite: false,
        interactionCount: 0,
        lastInteraction: null,
        createdAt: now,
        updatedAt: now
      });
    });

    logger.info(`友達関係が作成されました: ${currentUserUid} <-> ${friendUid}`);

    res.status(200).json({
      success: true,
      message: '友達を追加しました',
      relationshipId,
      friend: {
        uid: friendUid,
        displayName: friendData?.displayName || 'Unknown User',
        profileImage: friendData?.profileImage || ''
      }
    });

  } catch (error) {
    logger.error('友達追加エラー:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 友達一覧取得
 * GET /api/users/friends?uid={uid}
 */
export const getFriends = onRequest({
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

    // ユーザーの友達一覧を取得
    const friendsSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('friendsList')
      .orderBy('createdAt', 'desc')
      .get();

    const friends = friendsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      success: true,
      friends,
      count: friends.length
    });

  } catch (error) {
    logger.error('友達一覧取得エラー:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 友達削除
 * DELETE /api/users/removeFriend
 */
export const removeFriend = onRequest({
  cors: true,
  region: 'asia-northeast1',
}, async (req, res) => {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { friendUid, currentUserUid } = req.body;

    if (!friendUid || !currentUserUid) {
      res.status(400).json({ 
        error: 'friendUid and currentUserUid are required' 
      });
      return;
    }

    const relationshipId = `${currentUserUid}_${friendUid}`;
    const alternativeRelationshipId = `${friendUid}_${currentUserUid}`;

    // トランザクションで友達関係を削除
    await db.runTransaction(async (transaction) => {
      // relationshipsコレクションから削除
      const relationshipRef1 = db.collection('relationships').doc(relationshipId);
      const relationshipRef2 = db.collection('relationships').doc(alternativeRelationshipId);
      
      const rel1 = await transaction.get(relationshipRef1);
      const rel2 = await transaction.get(relationshipRef2);
      
      if (rel1.exists) {
        transaction.delete(relationshipRef1);
      }
      if (rel2.exists) {
        transaction.delete(relationshipRef2);
      }

      // 両方のユーザーのfriendsListから削除
      const currentUserFriendRef = db
        .collection('users')
        .doc(currentUserUid)
        .collection('friendsList')
        .doc(friendUid);
      
      const friendUserFriendRef = db
        .collection('users')
        .doc(friendUid)
        .collection('friendsList')
        .doc(currentUserUid);

      transaction.delete(currentUserFriendRef);
      transaction.delete(friendUserFriendRef);
    });

    logger.info(`友達関係が削除されました: ${currentUserUid} <-> ${friendUid}`);

    res.status(200).json({
      success: true,
      message: '友達を削除しました'
    });

  } catch (error) {
    logger.error('友達削除エラー:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 