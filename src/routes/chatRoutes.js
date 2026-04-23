import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/auth.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

const router = express.Router();

// Configure multer for file uploads (images, files, voice)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Get all chats for the logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'username email avatar statusText')
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new private chat (or return existing)
router.post('/', protect, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) {
      return res.status(400).json({ message: 'otherUserId is required' });
    }

    let chat = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.user._id, otherUserId] }
    });

    if (!chat) {
      chat = await Chat.create({
        type: 'private',
        participants: [req.user._id, otherUserId]
      });
    }

    await chat.populate('participants', 'username email avatar statusText');
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages for a specific chat (populated with sender details)
router.get('/:chatId/messages', protect, async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      chatId: msg.chatId,
      senderId: msg.sender._id.toString(),
      sender: msg.sender.username,
      senderAvatar: msg.sender.avatar,
      encryptedContent: msg.encryptedContent,
      type: msg.type,
      metadata: msg.metadata,
      reactions: msg.reactions,
      readBy: msg.readBy,
      deliveredTo: msg.deliveredTo,
      edited: msg.edited,
      deletedForEveryone: msg.deletedForEveryone,
      createdAt: msg.createdAt,
      replyTo: msg.replyTo
    }));
    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload file (image, document, voice)
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 
                      req.file.mimetype.startsWith('audio/') ? 'voice' : 'file';
    res.json({ fileUrl, type: fileType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;