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
  const filename = req.params.filename;
  const imagesDir = path.join(__dirname, '..', 'uploads', 'images');
  let filePath = path.join(imagesDir, filename);
  
  // Log the request for debugging
  console.log(`[Image Request] Requested: ${filename}`);
  
  // Check if file exists with exact match
  if (fs.existsSync(filePath)) {
    return serveImageFile(filePath, filename, res);
  }
  
  // File not found with exact match, try to find by base name
  // This handles cases where database has {multiselect1.png} but file is multiselect1-1769238017035-297168697.png
  console.log(`[Image Request] Exact match not found, searching by base name...`);
  
  if (!fs.existsSync(imagesDir)) {
    console.log(`[Image Request] Images directory does not exist: ${imagesDir}`);
    return res.status(404).json({ error: 'Images directory not found', filename });
  }
  
  const files = fs.readdirSync(imagesDir);
  const requestedBaseName = path.basename(filename, path.extname(filename));
  const requestedExt = path.extname(filename).toLowerCase();
  
  // Try to find a file that starts with the base name and has the same extension
  // e.g., if requested is "multiselect1.png", find "multiselect1-1769238017035-297168697.png"
  const matchingFile = files.find(f => {
    const fExt = path.extname(f).toLowerCase();
    const fBaseName = path.basename(f, fExt);
    
    // Check if the file starts with the requested base name and has the same extension
    // Also handle case-insensitive matching
    return fExt === requestedExt && 
           (fBaseName.toLowerCase().startsWith(requestedBaseName.toLowerCase()) ||
            fBaseName.toLowerCase() === requestedBaseName.toLowerCase());
  });
  
  if (matchingFile) {
    console.log(`[Image Request] Found matching file by base name: ${matchingFile} (requested: ${filename})`);
    filePath = path.join(imagesDir, matchingFile);
    return serveImageFile(filePath, matchingFile, res);
  }
  
  // If still not found, try case-insensitive match with any extension
  const caseInsensitiveMatch = files.find(f => {
    const fBaseName = path.basename(f, path.extname(f));
    return fBaseName.toLowerCase() === requestedBaseName.toLowerCase();
  });
  
  if (caseInsensitiveMatch) {
    console.log(`[Image Request] Found case-insensitive match: ${caseInsensitiveMatch} (requested: ${filename})`);
    filePath = path.join(imagesDir, caseInsensitiveMatch);
    return serveImageFile(filePath, caseInsensitiveMatch, res);
  }
  
  console.log(`[Image Request] File not found: ${filename}. Available files: ${files.slice(0, 5).join(', ')}...`);
  return res.status(404).json({ error: 'File not found', filename, availableFiles: files.length });
});

// Helper function to serve image file with proper headers
function serveImageFile(filePath, filename, res) {
  // Determine MIME type based on file extension
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  
  const mimeType = mimeTypes[ext] || 'image/jpeg';
  
  // Set headers and send file
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[Image Request] Error sending file: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving file', filename });
      }
    } else {
      console.log(`[Image Request] Successfully served: ${filename}`);
    }
  });
}

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
