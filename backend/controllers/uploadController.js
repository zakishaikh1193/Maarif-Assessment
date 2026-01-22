import { uploadSingle, getFileUrl } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';

// Upload single file (image, video, or audio)
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const fileType = req.file.mimetype.split('/')[0];
    const fileUrl = getFileUrl(req, req.file.filename, fileType);

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        type: fileType
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      code: 'UPLOAD_ERROR',
      details: error.message
    });
  }
};

// Upload multiple files
export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    const files = req.files.map(file => {
      const fileType = file.mimetype.split('/')[0];
      return {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: getFileUrl(req, file.filename, fileType),
        type: fileType
      };
    });

    res.json({
      success: true,
      files: files
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      error: 'Failed to upload files',
      code: 'UPLOAD_ERROR',
      details: error.message
    });
  }
};
