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
const httpServer = createServer(app);git 

// Socket.io with robust CORS and fallback transports
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true
});

// Express middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('❌ FATAL ERROR: MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', protect, chatRoutes);
app.use('/api/users', protect, userRoutes);

// Socket handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));