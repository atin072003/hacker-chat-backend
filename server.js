import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './src/routes/authRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import { protect } from './src/middleware/auth.js';
import { setupSocketHandlers } from './src/sockets/index.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN, credentials: true },
  transports: ['websocket', 'polling']
});

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/auth', authRoutes);
app.use('/api/chats', protect, chatRoutes);
app.use('/api/users', protect, userRoutes);

setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));