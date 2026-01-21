import express from 'express';
import { 
  getAllGrades, 
  getGradeById, 
  createGrade, 
  updateGrade, 
  deleteGrade,
  getGradeStats,
  getActiveGrades
} from '../controllers/gradesController.js';
import { authenticateToken, adminOnly } from '../middleware/auth.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

// Public routes (require authentication)
router.get('/', authenticateToken, getAllGrades);
router.get('/active', authenticateToken, getActiveGrades);
router.get('/:id', authenticateToken, validateId, getGradeById);
router.get('/:id/stats', authenticateToken, validateId, getGradeStats);

// Admin-only routes
router.post('/', authenticateToken, adminOnly, createGrade);
router.put('/:id', authenticateToken, adminOnly, validateId, updateGrade);
router.delete('/:id', authenticateToken, adminOnly, validateId, deleteGrade);

export default router;
