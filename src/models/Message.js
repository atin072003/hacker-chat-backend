import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: { type: String, default: '' }, // allow empty for media
  encryptedKey: { type: String },
  type: { type: String, enum: ['text', 'image', 'file', 'voice'], default: 'text' },
  metadata: mongoose.Schema.Types.Mixed,
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  reactions: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  edited: { type: Boolean, default: false },
  deletedForEveryone: { type: Boolean, default: false }
}, { timestamps: true });

messageSchema.index({ chatId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);