import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

const router = express.Router();

// Configure multer for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/avatars/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/me', protect, (req, res) => res.json(req.user));

// Search users
router.get('/search', protect, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ]
  }).limit(10).select('_id username email avatar statusText');
  res.json(users);
});

// Upload avatar
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });
    res.json({ avatarUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update status text
router.put('/status', protect, async (req, res) => {
  const { statusText } = req.body;
  await User.findByIdAndUpdate(req.user._id, { statusText });
  res.json({ statusText });
});

// Delete own account (hard delete)
router.delete('/me', protect, async (req, res) => {
  try {
    // Optionally delete all user messages and remove from chats
    await Message.deleteMany({ sender: req.user._id });
    await Chat.updateMany(
      { participants: req.user._id },
      { $pull: { participants: req.user._id } }
    );
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted permanently' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;