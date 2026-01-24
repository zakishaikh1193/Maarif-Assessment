import express from 'express';
import { 
  startAssessment,
  submitAnswer,
  getResultsBySubject,
  getDashboardData,
  getAssessmentResults,
  getGrowthOverTime,
  getLatestAssessmentDetails,
  getAvailableSubjects,
  getCompetencyScores,
  getCompetencyGrowth,
  getAssessmentConfiguration,
  generateQuestionDescriptionEndpoint,
  generatePerformanceAnalysisEndpoint,
  generateCompetencyRecommendationsEndpoint,
  generateCompetencyFeedbackEndpoint
} from '../controllers/studentController.js';
import {
  getStudentAssignments,
  getCompletedAssignments,
  startStandardAssignment,
  startAdaptiveAssignment
} from '../controllers/studentAssignmentsController.js';
import { authenticateToken, studentOnly } from '../middleware/auth.js';
import { validateId, validateAssessmentId, validateSubjectId, validateAssessmentStart, validateAnswerSubmission, validateAssessmentConfig } from '../middleware/validation.js';

const router = express.Router();

// All student routes require student role
router.use(authenticateToken);
router.use(studentOnly);

// Assessment operations
router.post('/assessments/start', validateAssessmentStart, startAssessment);
router.post('/assessments/answer', validateAnswerSubmission, submitAnswer);

// Results and analytics
router.get('/assessments/results/:subjectId', validateSubjectId, getResultsBySubject);
router.get('/assessments/results/detailed/:assessmentId', validateAssessmentId, getAssessmentResults);
router.get('/assessments/dashboard', getDashboardData);
router.get('/assessments/latest/:subjectId', validateSubjectId, getLatestAssessmentDetails);
router.get('/assessments/growth/:subjectId', validateSubjectId, getGrowthOverTime);

// Subjects
router.get('/subjects/available', getAvailableSubjects);

// Assessment configuration
router.get('/assessment-config/:gradeId/:subjectId', validateAssessmentConfig, getAssessmentConfiguration);

// Competency Analytics
router.get('/assessments/:assessmentId/competencies', validateAssessmentId, getCompetencyScores);
router.get('/assessments/competency-growth/:subjectId', validateSubjectId, getCompetencyGrowth);

// Question Description (AI-generated)
router.get('/questions/:questionId/description', validateId, generateQuestionDescriptionEndpoint);

// Performance Analysis (AI-generated)
router.get('/assessments/:assessmentId/performance-analysis', validateAssessmentId, generatePerformanceAnalysisEndpoint);

// Competency Recommendations (AI-generated)
router.get('/assessments/:assessmentId/competency-recommendations', validateAssessmentId, generateCompetencyRecommendationsEndpoint);

// Competency Feedback (AI-generated for individual competency)
router.get('/assessments/:assessmentId/competencies/:competencyId/feedback', validateAssessmentId, generateCompetencyFeedbackEndpoint);

// Assignments
router.get('/assignments', getStudentAssignments);
router.get('/assignments/completed', getCompletedAssignments);
router.post('/assignments/start-standard', startStandardAssignment);
router.post('/assignments/start-adaptive', startAdaptiveAssignment);

export default router;
