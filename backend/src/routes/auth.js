const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDB } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const { validate, Joi } = require('../middleware/validate');
const { track } = require('../utils/analytics');

const router = express.Router();
const db = getDB();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  name: Joi.string().min(2).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if email already exists
    const emailIndex = await db.readIndex('user_by_email');
    if (emailIndex[email.toLowerCase()]) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.create('users', {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      profileComplete: false,
      photos: [],
      activities: [],
      interests: [],
      blockedUsers: [],
      verified: false,
      active: true,
      lastActive: new Date().toISOString()
    });

    // Add to email index
    await db.addToIndex('user_by_email', email.toLowerCase(), user.id);

    // Track analytics
    track('user').catch(() => {});

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return user without password
    const { password: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const emailIndex = await db.readIndex('user_by_email');
    const userId = emailIndex[email.toLowerCase()];
    if (!userId) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = await db.read('users', userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last active
    await db.update('users', user.id, { lastActive: new Date().toISOString() });

    // Track analytics
    track('login', { userId: user.id }).catch(() => {});

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Update last active timestamp
    await db.update('users', req.user.id, { lastActive: new Date().toISOString() });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.read('users', req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
