import express from 'express';
import { 
  getAllConfigurations,
  getConfigurationById,
  getConfigurationByGradeSubject,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration
} from '../controllers/assessmentConfigController.js';
import { authenticateToken, adminOnly } from '../middleware/auth.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(adminOnly);

// Assessment configuration routes
router.get('/', getAllConfigurations);
router.get('/:id', validateId, getConfigurationById);
router.get('/grade/:gradeId/subject/:subjectId', validateId, getConfigurationByGradeSubject);
router.post('/', createConfiguration);
router.put('/:id', validateId, updateConfiguration);
router.delete('/:id', validateId, deleteConfiguration);

export default router;
