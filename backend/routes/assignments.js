import express from 'express';
import {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentStudents,
  reassignAssignment
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

// Reassign assignment to schools/grades/students (must be before /:id route)
router.post('/:id/reassign', validateId, reassignAssignment);

// Get students who took an assignment (must be before /:id route)
router.get('/:id/students', validateId, getAssignmentStudents);

// Get assignment by ID
router.get('/:id', validateId, getAssignmentById);

// Update assignment
router.put('/:id', validateId, updateAssignment);

// Delete assignment
router.delete('/:id', validateId, deleteAssignment);

export default router;
