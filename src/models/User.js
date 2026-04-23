import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  publicKey: { type: String, required: true },
  encryptedPrivateKey: { type: String, required: true },
  avatar: { type: String, default: '' },
  statusText: { type: String, default: 'Hey there! I am using Hacker Chat' },
  status: { type: String, enum: ['online', 'offline', 'away'], default: 'offline' },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('User', userSchema);