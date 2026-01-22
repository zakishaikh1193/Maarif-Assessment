import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');
const audioDir = path.join(uploadsDir, 'audio');

[uploadsDir, imagesDir, videosDir, audioDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = file.mimetype.split('/')[0];
    let uploadPath = uploadsDir;
    
    if (fileType === 'image') {
      uploadPath = imagesDir;
    } else if (fileType === 'video') {
      uploadPath = videosDir;
    } else if (fileType === 'audio') {
      uploadPath = audioDir;
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']
  };
  
  const fileType = file.mimetype.split('/')[0];
  const allowedTypes = allowedMimes[fileType] || [];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${Object.values(allowedMimes).flat().join(', ')}`), false);
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: fileFilter
});

// Single file upload middleware
export const uploadSingle = (fieldName) => upload.single(fieldName);

// Multiple files upload middleware
export const uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);

// Get file URL helper
export const getFileUrl = (req, filename, fileType = 'image') => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const typeMap = {
    image: 'images',
    video: 'videos',
    audio: 'audio'
  };
  return `${baseUrl}/api/uploads/${typeMap[fileType]}/${filename}`;
};
