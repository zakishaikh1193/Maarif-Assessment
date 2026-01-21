import express from 'express';
import { 
  getAllSubjects, 
  getSubjectById, 
  createSubject, 
  updateSubject, 
  deleteSubject 
} from '../controllers/subjectsController.js';
import { authenticateToken, adminOnly } from '../middleware/auth.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

// Public routes (require authentication)
router.get('/', authenticateToken, getAllSubjects);
router.get('/:id', authenticateToken, validateId, getSubjectById);

// Admin-only routes
router.post('/', authenticateToken, adminOnly, createSubject);
router.put('/:id', authenticateToken, adminOnly, validateId, updateSubject);
router.delete('/:id', authenticateToken, adminOnly, validateId, deleteSubject);

export default router;
