import express from 'express';
import { 
  login, 
  register, 
  verifyToken, 
  getProfile, 
  updateProfile, 
  changePassword, 
  logout 
} from '../controllers/authController.js';
import { 
  validateLogin, 
  validateRegistration 
} from '../middleware/validation.js';
import { 
  authenticateToken, 
  adminOnly 
} from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', validateLogin, login);
router.post('/register', validateRegistration, register);

// Protected routes
router.get('/verify', authenticateToken, verifyToken);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);

export default router;
