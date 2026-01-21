import express from 'express';
import { 
  getAdminStats,
  getStudents,
  getStudentGrowth,
  getStudentsBySchoolAndGrade,
  createStudent,
  updateStudent,
  deleteStudent,
  createQuestion,
  createBulkQuestions,
  getQuestionsBySubject,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  debugQuestions,
  getSubjectPerformanceDashboard,
  getAchievementGapAnalysis,
  getCompetencyMasteryReport,
  getCompetencyGrowthTracking,
  getStudentCompetencyScores,
  getStudentCompetencyGrowth,
  importStudentsFromCSV,
  importQuestionsFromCSV
} from '../controllers/adminController.js';
import { authenticateToken, adminOnly } from '../middleware/auth.js';
import { validateId, validateSubjectId, validateQuestion, validateBulkQuestions, validateStudent } from '../middleware/validation.js';

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(adminOnly);

// Stats
router.get('/stats', getAdminStats);

// Students
router.get('/students', getStudents);
router.get('/students/:studentId/growth/:subjectId', getStudentGrowth);
router.get('/students/school/:schoolId/grade/:gradeId', getStudentsBySchoolAndGrade);

// Student management
router.post('/students', validateStudent, createStudent);
router.post('/students/import-csv', importStudentsFromCSV);
router.put('/students/:id', validateId, updateStudent);
router.delete('/students/:id', validateId, deleteStudent);

// Debug endpoint
router.get('/debug/questions', debugQuestions);

// Analytics
router.get('/analytics/subject-performance', getSubjectPerformanceDashboard);
router.get('/analytics/achievement-gaps', getAchievementGapAnalysis);
router.get('/analytics/competency-mastery', getCompetencyMasteryReport);
router.get('/analytics/competency-growth', getCompetencyGrowthTracking);

// Student Competency Analytics
router.get('/student-competency-scores', getStudentCompetencyScores);
router.get('/student-competency-growth', getStudentCompetencyGrowth);

// Questions
router.post('/questions', validateQuestion, createQuestion);
router.post('/questions/bulk', validateBulkQuestions, createBulkQuestions);
router.post('/questions/import-csv', importQuestionsFromCSV);
router.get('/questions/:subjectId', validateSubjectId, getQuestionsBySubject);
router.get('/question/:id', validateId, getQuestionById);
router.put('/questions/:id', validateId, validateQuestion, updateQuestion);
router.delete('/questions/:id', validateId, deleteQuestion);

export default router;
