import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

const onlineUsers = new Map();

export const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() }).exec();
    io.emit('user-status', { userId, status: 'online' });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { chatId, encryptedContent, type, replyToId } = data;
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) return;

        // Prepare message document
        let messageDoc = {
          chatId,
          sender: userId,
          type,
          replyTo: replyToId,
          encryptedContent: '', // default for media
          metadata: null
        };

        if (type === 'text') {
          messageDoc.encryptedContent = encryptedContent;
        } else {
          // For image, file, voice – store the file URL in metadata
          messageDoc.metadata = { fileUrl: encryptedContent };
        }

        const message = new Message(messageDoc);
        await message.save();
        await Chat.findByIdAndUpdate(chatId, { lastMessage: 'New message', lastMessageTime: new Date() });

        // Build the message data to emit (same shape expected by frontend)
        const messageData = {
          _id: message._id,
          chatId,
          senderId: userId,
          sender: socket.user.username,
          senderAvatar: socket.user.avatar,
          encryptedContent: message.encryptedContent,
          type: message.type,
          metadata: message.metadata,   // <-- use the stored metadata
          reactions: message.reactions || [],
          readBy: message.readBy || [],
          deliveredTo: message.deliveredTo || [],
          edited: message.edited,
          deletedForEveryone: message.deletedForEveryone,
          createdAt: message.createdAt,
          replyTo: replyToId
        };

        chat.participants.forEach(pid => {
          const sid = onlineUsers.get(pid.toString());
          if (sid) io.to(sid).emit('new-message', messageData);
        });
      } catch (err) { 
        console.error('Send message error:', err); 
      }
    });

    // Typing
    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(`chat:${chatId}`).emit('user-typing', { userId, username: socket.user.username, isTyping });
    });

    // Mark as read
    socket.on('mark-read', async ({ chatId, messageId }) => {
      await Message.updateOne({ _id: messageId }, { $addToSet: { readBy: userId } });
      const chat = await Chat.findById(chatId);
      chat.participants.forEach(p => {
        const sid = onlineUsers.get(p.toString());
        if (sid) io.to(sid).emit('message-read', { messageId, userId });
      });
    });

    // Reaction
    socket.on('add-reaction', async ({ messageId, emoji }) => {
      const message = await Message.findById(messageId);
      if (!message) return;
      const existing = message.reactions.find(r => r.userId.toString() === userId);
      if (existing) existing.emoji = emoji;
      else message.reactions.push({ userId, emoji });
      await message.save();
      io.to(`chat:${message.chatId}`).emit('reaction-updated', { messageId, reactions: message.reactions });
    });

    // Edit message
    socket.on('edit-message', async ({ messageId, newEncryptedContent }) => {
      const message = await Message.findById(messageId);
      if (message.sender.toString() !== userId) return;
      message.encryptedContent = newEncryptedContent;
      message.edited = true;
      await message.save();
      io.to(`chat:${message.chatId}`).emit('message-edited', { messageId, encryptedContent: newEncryptedContent });
    });

    // Delete for everyone
    socket.on('delete-message', async ({ messageId }) => {
      const message = await Message.findById(messageId);
      if (message.sender.toString() !== userId) return;
      message.deletedForEveryone = true;
      message.encryptedContent = '';
      await message.save();
      io.to(`chat:${message.chatId}`).emit('message-deleted', { messageId });
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
      io.emit('user-status', { userId, status: 'offline' });
    });
  });
};