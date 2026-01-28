import express from 'express';
import { 
  getAllSchools, 
  getSchoolById, 
  createSchool, 
  updateSchool, 
  deleteSchool,
  getSchoolStats
} from '../controllers/schoolsController.js';
import { authenticateToken, adminOnly } from '../middleware/auth.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

// Public routes (require authentication)
router.get('/', authenticateToken, getAllSchools);
router.get('/:id', authenticateToken, validateId, getSchoolById);
router.get('/:id/stats', authenticateToken, validateId, getSchoolStats);

// Admin-only routes
router.post('/', authenticateToken, adminOnly, createSchool);
router.put('/:id', authenticateToken, adminOnly, validateId, updateSchool);
router.delete('/:id', authenticateToken, adminOnly, validateId, deleteSchool);

export default router;
