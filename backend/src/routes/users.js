const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { getDB } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const { validate, Joi } = require('../middleware/validate');

const router = express.Router();
const db = getDB();

// Multer config for photo uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  bio: Joi.string().max(500).allow(''),
  age: Joi.number().integer().min(18).max(99),
  gender: Joi.string().valid('male', 'female'),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  city: Joi.string().max(100),
  neighborhood: Joi.string().max(100),
  intention: Joi.string().valid('serious', 'dating', 'friendship', 'open'),
  photos: Joi.array().items(Joi.string())
});

const preferencesSchema = Joi.object({
  ageRangeMin: Joi.number().integer().min(18).max(99),
  ageRangeMax: Joi.number().integer().min(18).max(99),
  genderPreference: Joi.string().valid('male', 'female', 'both'),
  maxDistance: Joi.number().integer().min(1).max(200),
  activities: Joi.array().items(Joi.string()).min(2).max(4),
  interests: Joi.array().items(Joi.string())
});

// GET /api/users/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await db.read('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password, ...profile } = user;
    res.json({ profile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', authMiddleware, validate(updateProfileSchema), async (req, res) => {
  try {
    const updates = req.body;
    
    // Calculate profile completeness
    const user = await db.read('users', req.user.id);
    const merged = { ...user, ...updates };
    const requiredFields = ['name', 'age', 'gender', 'latitude', 'longitude', 'intention'];
    const hasPhotos = merged.photos && merged.photos.length >= 3;
    const hasActivities = merged.activities && merged.activities.length >= 2;
    const completedFields = requiredFields.filter(f => merged[f] !== undefined && merged[f] !== null).length;
    const profileComplete = completedFields === requiredFields.length && hasPhotos && hasActivities;

    const updated = await db.update('users', req.user.id, {
      ...updates,
      profileComplete
    });

    const { password, ...safeUser } = updated;
    res.json({ profile: safeUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/users/photos
router.post('/photos', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const user = await db.read('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.photos && user.photos.length >= 6) {
      return res.status(400).json({ error: 'Maximum 6 photos allowed' });
    }

    // Create upload directory
    const userDir = path.join(process.env.UPLOAD_DIR || './uploads', 'users', req.user.id);
    await fs.mkdir(userDir, { recursive: true });

    const photoId = db.generateId();
    const filename = `${photoId}.webp`;
    const thumbFilename = `${photoId}_thumb.webp`;
    const filepath = path.join(userDir, filename);
    const thumbPath = path.join(userDir, thumbFilename);

    // Process full image
    await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Create thumbnail
    await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 70 })
      .toFile(thumbPath);

    // Add to user photos
    const photoUrl = `/uploads/users/${req.user.id}/${filename}`;
    const thumbUrl = `/uploads/users/${req.user.id}/${thumbFilename}`;
    const photos = [...(user.photos || []), { id: photoId, url: photoUrl, thumbnail: thumbUrl, uploadedAt: new Date().toISOString() }];

    // Check profile completeness
    const requiredFields = ['name', 'age', 'gender', 'latitude', 'longitude', 'intention'];
    const completedFields = requiredFields.filter(f => user[f] !== undefined && user[f] !== null).length;
    const hasActivities = user.activities && user.activities.length >= 2;
    const profileComplete = completedFields === requiredFields.length && photos.length >= 3 && hasActivities;

    await db.update('users', req.user.id, { photos, profileComplete });

    res.status(201).json({ photo: { id: photoId, url: photoUrl, thumbnail: thumbUrl } });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// DELETE /api/users/photos/:id
router.delete('/photos/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.read('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const photos = (user.photos || []).filter(p => p.id !== id);
    if (photos.length === user.photos.length) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete files
    const userDir = path.join(process.env.UPLOAD_DIR || './uploads', 'users', req.user.id);
    try {
      await fs.unlink(path.join(userDir, `${id}.webp`));
      await fs.unlink(path.join(userDir, `${id}_thumb.webp`));
    } catch (e) { /* files may not exist */ }

    await db.update('users', req.user.id, { photos });
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    console.error('Delete photo error:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// PUT /api/users/preferences
router.put('/preferences', authMiddleware, validate(preferencesSchema), async (req, res) => {
  try {
    const updated = await db.update('users', req.user.id, req.body);
    const { password, ...safeUser } = updated;
    res.json({ profile: safeUser });
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
