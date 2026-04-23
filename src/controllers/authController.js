import User from '../models/User.js';
import bcrypt from 'bcryptjs';   // instead of 'bcrypt'
import jwt from 'jsonwebtoken';
export const register = async (req, res) => {
  try {
    const { username, email, password, publicKey, encryptedPrivateKey } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash, publicKey, encryptedPrivateKey });
    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    res.json({ accessToken, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
