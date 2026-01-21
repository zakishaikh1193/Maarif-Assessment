import express from 'express';
import {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment
} from '../controllers/assignmentsController.js';
import { authenticateToken, adminOnly } from '../middleware/auth.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(adminOnly);

// Create new assignment
router.post('/', createAssignment);

// Get all assignments
router.get('/', getAllAssignments);

// Get assignment by ID
router.get('/:id', validateId, getAssignmentById);

// Update assignment
router.put('/:id', validateId, updateAssignment);

// Delete assignment
router.delete('/:id', validateId, deleteAssignment);

export default router;
