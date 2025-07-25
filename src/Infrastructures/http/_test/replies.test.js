const AuthenticationsTableTestHelper = require('../../../../tests/AuthenticationsTableTestHelper');
const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const RepliesTableTestHelper = require('../../../../tests/RepliesTableTestHelper');
const ServerTestHelper = require('../../../../tests/ServerTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');
const container = require('../../container');
const pool = require('../../database/postgres/pool');
const createServer = require('../createServer');

describe('Replies endpoints', () => {
  afterEach(async () => {
    await RepliesTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await AuthenticationsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('when POST /threads/{threadId}/comments/{commentId}/replies', () => {
    it('should response 201 and persisted reply', async () => {
      const requestPayload = {
        content: 'content'
      };
      const server = await createServer(container);

      const { accessToken, userId } = await ServerTestHelper.getCredential({ server });

      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });

      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments/${commentId}/replies`,
        payload: requestPayload,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(201);
      expect(responseJson.status).toEqual('success');
      expect(responseJson.data.addedReply).toBeDefined();
    });

    it('should response 400 when request payload not contain needed property', async () => {
      const requestPayload = {};
      const server = await createServer(container);

      const { accessToken, userId } = await ServerTestHelper.getCredential({ server });

      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });

      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments/${commentId}/replies`,
        payload: requestPayload,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(400);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('tidak dapat membuat balasan baru karena properti yang dibutuhkan tidak ada');
    });

    it('should response 400 when request payload not meet data type specification', async () => {
      const requestPayload = {
        content: 123
      };
      const server = await createServer(container);

      const { accessToken, userId } = await ServerTestHelper.getCredential({ server });

      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });

      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments/${commentId}/replies`,
        payload: requestPayload,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(400);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('tidak dapat membuat balasan baru karena tipe data tidak sesuai');
    });

    it('should response 404 when thread not found', async () => {
      const requestPayload = {
        content: 'content'
      };
      const server = await createServer(container);

      const { accessToken } = await ServerTestHelper.getCredential({ server });

      const response = await server.inject({
        method: 'POST',
        url: '/threads/thread-123/comments/comment-123/replies',
        payload: requestPayload,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(404);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('komentar tidak ditemukan');
    });
  });

  describe('when DELETE /threads/{threadId}/comments/{commentId}/replies/{replyId}', () => {
    it('should response 200 and delete reply', async () => {
      const server = await createServer(container);

      const { accessToken, userId } = await ServerTestHelper.getCredential({ server });

      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });

      const replyId = 'reply-123';
      await RepliesTableTestHelper.addReply({ id: replyId, owner: userId, commentId });

      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}/replies/${replyId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const responseJson = JSON.parse(response.payload);
      console.log(responseJson);
      expect(response.statusCode).toEqual(200);
      expect(responseJson.status).toEqual('success');
    });

    it('should response 404 when reply not found', async () => {
      const server = await createServer(container);

      const { accessToken, userId } = await ServerTestHelper.getCredential({ server });

      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });

      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}/replies/reply-123`,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(404);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('balasan tidak ditemukan');
    });

    it('should response 403 when user not the owner of the reply', async () => {
      const server = await createServer(container);

      const { userId: firstUserId } = await ServerTestHelper.getCredential({ server, username: 'dicoding' });

      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: firstUserId });

      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, owner: firstUserId, threadId });

      const replyId = 'reply-123';
      await RepliesTableTestHelper.addReply({ id: replyId, owner: firstUserId, commentId });

      const { accessToken: secondAccessToken } = await ServerTestHelper.getCredential({ server, username: 'anggiirawan' });

      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}/replies/${replyId}`,
        headers: {
          Authorization: `Bearer ${secondAccessToken}`
        }
      });

      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(403);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('anda bukan pemilik balasan ini');
    });
  });
});
