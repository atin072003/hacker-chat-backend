import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  type: { type: String, enum: ['private', 'group'], required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groupName: { type: String, required: function() { return this.type === 'group'; } },
  groupAvatar: String,
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: String,
  lastMessageTime: Date
}, { timestamps: true });

export default mongoose.model('Chat', chatSchema);