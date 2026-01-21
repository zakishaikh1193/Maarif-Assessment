import express from 'express';
import { validateSSOToken, getSSOSettings, updateSSOSettings } from '../controllers/ssoController.js';
import { authenticateToken, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public route for Moodle to validate SSO tokens
router.post('/validate', validateSSOToken);

// Protected admin routes
router.get('/settings', authenticateToken, adminOnly, getSSOSettings);
router.put('/settings', authenticateToken, adminOnly, updateSSOSettings);

export default router;

