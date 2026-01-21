import express from 'express';
import { authenticateToken, adminOnly } from '../middleware/auth.js';
import { validateCompetency } from '../middleware/validation.js';
import {
  getAllCompetencies,
  getActiveCompetencies,
  getCompetencyById,
  createCompetency,
  updateCompetency,
  deleteCompetency,
  getCompetencyStats,
  getCompetencyQuestions
} from '../controllers/competenciesController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(adminOnly);

// Get all competencies
router.get('/', getAllCompetencies);

// Get active competencies only
router.get('/active', getActiveCompetencies);

// Get competency statistics
router.get('/stats', getCompetencyStats);

// Get competency by ID
router.get('/:id', getCompetencyById);

// Get questions linked to a competency
router.get('/:id/questions', getCompetencyQuestions);

// Create new competency
router.post('/', validateCompetency, createCompetency);

// Update competency
router.put('/:id', validateCompetency, updateCompetency);

// Delete competency
router.delete('/:id', deleteCompetency);

export default router;
