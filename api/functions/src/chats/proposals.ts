import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { Request, Response } from 'express';

const db = getFirestore();

interface AcceptProposalRequest {
  proposalId: string;
  userId: string;
}

/**
 * 提案を承認してチャットルームを作成するAPI
 * POST /acceptProposal
 * Body: { proposalId: string, userId: string }
 */
export const acceptProposal = onRequest(async (request: Request, response: Response) => {
  try {
    // CORSヘッダーを設定
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONSリクエスト（プリフライト）の処理
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // POSTメソッドのみ許可
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { proposalId, userId }: AcceptProposalRequest = request.body;

    // バリデーション
    if (!proposalId || !userId) {
      response.status(400).json({ 
        error: 'Missing required fields',
        required: ['proposalId', 'userId']
      });
      return;
    }

    logger.info('Accepting proposal', { proposalId, userId });

    // 1. 提案データの取得
    const proposalRef = db.collection('proposals').doc(proposalId);
    const proposalDoc = await proposalRef.get();

    if (!proposalDoc.exists) {
      response.status(404).json({ error: 'Proposal not found' });
      return;
    }

    const proposalData = proposalDoc.data();
    if (!proposalData) {
      response.status(500).json({ error: 'Invalid proposal data' });
      return;
    }

    // 2. ユーザーの提案応答を承認状態に更新
    const userProposalRef = db.collection('users').doc(userId).collection('userProposal').doc(proposalId);
    await userProposalRef.update({
      status: 'accepted',
      respondedAt: new Date(),
      updatedAt: new Date()
    });

    // 3. 提案のresponse情報を更新
    const currentResponses = proposalData.responses || {};
    currentResponses[userId] = {
      status: 'accepted',
      respondedAt: new Date()
    };

    const responseCount = proposalData.responseCount || { accepted: 0, declined: 0, pending: 0 };
    responseCount.accepted = (responseCount.accepted || 0) + 1;
    responseCount.pending = Math.max((responseCount.pending || 0) - 1, 0);

    await proposalRef.update({
      responses: currentResponses,
      responseCount: responseCount,
      updatedAt: new Date()
    });

    // 4. 新しいチャットルームを作成
    const chatId = `chat_${proposalId}_${Date.now()}`;
    const chatTitle = proposalData.title || 'グループチャット';
    
    // 参加者リストの正しい取得（配列の確認）
    let participants: string[] = [];
    if (Array.isArray(proposalData.targetUsers)) {
      participants = proposalData.targetUsers;
    } else if (Array.isArray(proposalData.invitedUsers)) {
      participants = proposalData.invitedUsers.map((user: any) => user.uid || user.id);
    } else {
      logger.warn('No valid participants found in proposal data', { proposalData });
      participants = [userId]; // 最低限承認者を追加
    }

    // participantDisplayNamesの生成
    const invitedUsers = proposalData.invitedUsers || [];
    const participantDisplayNames = invitedUsers.map((user: any) => user.displayName || '不明なユーザー');
    
    logger.info('Participants determined', { participants, participantDisplayNames });

    // チャットドキュメントの作成
    const chatData = {
      chatId: chatId,
      type: 'ai_proposal',
      participants: participants,
      eventRef: null, // イベントが確定したらここに参照を追加
      aiAssistEnabled: true,
      lastMessage: {
        messageId: `welcome_${Date.now()}`,
        senderUid: 'system',
        senderDisplayName: 'システム',
        content: `${chatTitle}のチャットが作成されました！`,
        type: 'system',
        timestamp: new Date()
      },
      activeUsers: [userId],
      typingUsers: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const chatRef = db.collection('chats').doc(chatId);
    await chatRef.set(chatData);

    // 5. システムメッセージをチャットに追加
    const welcomeMessageData = {
      messageId: `welcome_${Date.now()}`,
      senderRef: null, // システムメッセージなので参照なし
      content: `${chatTitle}のチャットが作成されました！みんなで楽しく計画を立てましょう🎉`,
      type: 'system',
      mediaUrl: null,
      aiGenerated: false,
      reactions: [],
      timestamp: new Date(),
      editedAt: null,
      isRead: {}
    };

    await chatRef.collection('messages').add(welcomeMessageData);

    // 6. 参加者全員のchatsListに追加
    logger.info('Adding chatsList entries for participants', { 
      participants, 
      participantsCount: participants.length,
      chatId,
      proposalDataKeys: Object.keys(proposalData)
    });
    
    if (!participants || participants.length === 0) {
      logger.error('No participants found for chatsList creation', { 
        proposalId, 
        participants,
        targetUsers: proposalData.targetUsers,
        invitedUsers: proposalData.invitedUsers,
        proposalDataSnapshot: JSON.stringify(proposalData, null, 2)
      });
      // 空の場合でも承認者だけは追加
      participants = [userId];
    }
    
    // 各参加者に個別にchatsListエントリを作成（より詳細なエラー追跡のため）
    const chatsListPromises = participants.map(async (participantUid: string) => {
      try {
        logger.info(`Creating chatsList entry for participant: ${participantUid}`);
        
        const chatsListRef = db.collection('users').doc(participantUid).collection('chatsList').doc(chatId);
        const chatsListData = {
          chatId: chatId,
          chatRefPath: `chats/${chatId}`, // 参照パスを文字列として保存
          chatType: 'ai_proposal',
          title: chatTitle,
          lastMessage: {
            messageId: `welcome_${Date.now()}`,
            senderUid: 'system',
            senderDisplayName: 'システム',
            content: `${chatTitle}のチャットが作成されました！`,
            type: 'system',
            timestamp: new Date()
          },
          lastMessageTime: new Date(),
          unreadCount: participantUid === userId ? 0 : 1, // 承認したユーザーは既読、他は未読
          isActive: true,
          isMuted: false,
          isPinned: false,
          participants: participants,
          participantDisplayNames: participantDisplayNames,
          relatedProposalId: proposalId,
          relatedEventId: null,
          joinedAt: new Date(),
          leftAt: null,
          role: participantUid === (proposalData.creatorRef?.id || proposalData.targetUsers?.[0]) ? 'admin' : 'member',
          customSettings: {
            notificationLevel: 'all',
            theme: 'default',
            fontSize: 'medium',
            showTypingIndicator: true,
            autoMarkAsRead: true
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await chatsListRef.set(chatsListData);
        logger.info(`Successfully created chatsList entry for participant: ${participantUid}`, {
          chatsListPath: `users/${participantUid}/chatsList/${chatId}`,
          dataKeys: Object.keys(chatsListData)
        });
        return { participantUid, success: true };
        
      } catch (error) {
        logger.error(`Failed to create chatsList entry for participant: ${participantUid}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : 'No stack trace',
          chatsListPath: `users/${participantUid}/chatsList/${chatId}`,
          participantUid,
          chatId
        });
        return { participantUid, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // 全ての参加者のchatsListエントリ作成を並行実行
    const chatsListResults = await Promise.all(chatsListPromises);
    
    // 結果をログ出力
    const successCount = chatsListResults.filter(result => result.success).length;
    const failCount = chatsListResults.filter(result => !result.success).length;
    
    logger.info('ChatsList creation completed', {
      totalParticipants: participants.length,
      successCount,
      failCount,
      results: chatsListResults
    });
    
    if (failCount > 0) {
      logger.warn('Some chatsList entries failed to create', { 
        failedResults: chatsListResults.filter(result => !result.success) 
      });
    }

    logger.info('Proposal accepted and chat created successfully', { 
      proposalId, 
      userId, 
      chatId,
      participantsCount: participants.length 
    });

    // 成功レスポンス
    response.status(200).json({
      success: true,
      message: 'Proposal accepted and chat created successfully',
      data: {
        proposalId: proposalId,
        chatId: chatId,
        chatTitle: chatTitle,
        participantsCount: participants.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Accept proposal error:', error);
    response.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 提案データを確認するデバッグ用API
 * GET /checkProposal?proposalId=xxx
 */
export const checkProposal = onRequest(async (request: Request, response: Response) => {
  try {
    // CORSヘッダーを設定
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONSリクエスト（プリフライト）の処理
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // GETメソッドのみ許可
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const proposalId = request.query.proposalId as string;

    // バリデーション
    if (!proposalId) {
      response.status(400).json({ 
        error: 'Missing proposalId parameter',
        usage: 'GET /checkProposal?proposalId=proposal_1016e016604e'
      });
      return;
    }

    logger.info('Checking proposal', { proposalId });

    // 提案データの取得
    const proposalRef = db.collection('proposals').doc(proposalId);
    const proposalDoc = await proposalRef.get();

    if (!proposalDoc.exists) {
      response.status(404).json({ 
        error: 'Proposal not found',
        proposalId: proposalId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const proposalData = proposalDoc.data();

    // 成功レスポンス
    response.status(200).json({
      success: true,
      message: 'Proposal found',
      data: {
        proposalId: proposalId,
        proposalData: proposalData,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Check proposal error:', error);
    response.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * chatsListエントリ作成のテスト用API
 * POST /testChatsList
 * Body: { userId: string, chatId: string }
 */
export const testChatsList = onRequest(async (request: Request, response: Response) => {
  try {
    // CORSヘッダーを設定
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { userId, chatId } = request.body;

    if (!userId || !chatId) {
      response.status(400).json({ error: 'Missing userId or chatId' });
      return;
    }

    logger.info('Testing chatsList creation', { userId, chatId });

    const chatsListRef = db.collection('users').doc(userId).collection('chatsList').doc(chatId);
    const testData = {
      chatId: chatId,
      chatRefPath: `chats/${chatId}`,
      chatType: 'test',
      title: 'テストチャット',
      lastMessage: {
        messageId: 'test_message',
        senderUid: 'system',
        senderDisplayName: 'システム',
        content: 'テストメッセージ',
        type: 'system',
        timestamp: new Date()
      },
      lastMessageTime: new Date(),
      unreadCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await chatsListRef.set(testData);
    
    logger.info('Test chatsList entry created successfully', { userId, chatId });

    response.status(200).json({
      success: true,
      message: 'Test chatsList entry created successfully',
      data: { userId, chatId, path: `users/${userId}/chatsList/${chatId}` }
    });

  } catch (error) {
    logger.error('Test chatsList error:', error);
    response.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 