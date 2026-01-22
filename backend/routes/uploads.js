import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.js';
import { uploadFile, uploadMultipleFiles } from '../controllers/uploadController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum file size is 20MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR'
    });
  }
  if (err) {
    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR'
    });
  }
  next();
};

// Upload endpoints (protected)
router.post('/file', authenticateToken, uploadSingle('file'), handleMulterError, uploadFile);
router.post('/files', authenticateToken, uploadMultiple('files', 10), handleMulterError, uploadMultipleFiles);

// Serve uploaded files (public)
router.get('/images/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'uploads', 'images', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

router.get('/videos/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'uploads', 'videos', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

router.get('/audio/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'uploads', 'audio', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

export default router;
