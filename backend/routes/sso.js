import express from 'express';
import { validateSSOToken, getSSOSettings, updateSSOSettings, getPowerSchoolSettings, updatePowerSchoolSettings } from '../controllers/ssoController.js';
import { authenticateToken, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public route for Moodle to validate SSO tokens
router.post('/validate', validateSSOToken);

// Protected admin routes
router.get('/settings', authenticateToken, adminOnly, getSSOSettings);
router.put('/settings', authenticateToken, adminOnly, updateSSOSettings);

// PowerSchool SSO routes
router.get('/powerschool-settings', authenticateToken, adminOnly, getPowerSchoolSettings);
router.put('/powerschool-settings', authenticateToken, adminOnly, updatePowerSchoolSettings);

export default router;

