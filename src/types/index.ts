export interface User {
  id: number;
  username: string;
  role: 'admin' | 'student';
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  school?: {
    id: number;
    name: string;
  };
  grade?: {
    id: number;
    name: string;
    display_name: string;
    level: number;
  };
}

export interface Subject {
  id: number;
  name: string;
  description?: string;
}

export interface School {
  id: number;
  name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at?: string;
}

export interface Grade {
  id: number;
  name: string;
  display_name: string;
  grade_level?: number | null;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total?: number; // For competencies
  totalQuestions?: number; // For questions (backward compatibility)
  limit?: number; // For competencies
  questionsPerPage?: number; // For questions (backward compatibility)
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type QuestionType = 'MCQ' | 'TrueFalse' | 'Matching' | 'FillInBlank' | 'ShortAnswer' | 'Essay' | 'MultipleSelect';

export interface Question {
  id: number;
  subjectId: number;
  gradeId: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  difficultyLevel: number;
  dokLevel?: number; // Depth of Knowledge level (1-4)
  standard?: string; // Standard identifier (e.g., NGSS, CGSA)
  contentFocus?: string; // Content Focus description - parameters for DOK level used in AI grading
  questionType?: QuestionType;
  correctAnswer?: string; // For non-MCQ types
  questionMetadata?: any; // For complex question types (e.g., FillInBlank blanks structure)
  createdBy?: number;
  createdAt?: string;
  createdByUsername?: string;
  gradeName?: string;
  competencies?: Array<{
    id: number;
    code: string;
    name: string;
  }>;
}

export interface FillInBlankData {
  blanks: Array<{
    options: string[];
    correctIndex: number;
  }>;
}

export interface Assessment {
  id: number;
  studentId: number;
  subjectId: number;
  assessmentPeriod: 'BOY' | 'EOY';
  ritScore?: number;
  correctAnswers?: number;
  totalQuestions: number;
  dateTaken: string;
  durationMinutes?: number;
  year: number;
  subjectName?: string;
}

export interface AssessmentQuestion {
  id: number;
  text: string;
  options: string[];
  questionNumber: number;
  totalQuestions: number;
  questionType?: 'MCQ' | 'TrueFalse' | 'MultipleSelect' | 'Matching' | 'FillInBlank' | 'ShortAnswer' | 'Essay';
  questionMetadata?: any; // For FillInBlank and other complex types
}

export interface AssessmentResponse {
  completed: boolean;
  isCorrect?: boolean;
  ritScore?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  duration?: number;
  assessmentId?: number;
  question?: AssessmentQuestion;
}

export interface StartAssessmentResponse {
  assessmentId: number;
  timeLimitMinutes: number;
  question: AssessmentQuestion;
}

export interface AssessmentResult {
  questionNumber: number;
  isCorrect: boolean;
  difficulty: number;
  questionText: string;
  questionType?: string;
  options: string[];
  questionMetadata?: any; // For FillInBlank, Matching, etc.
  selectedAnswer: number | string | number[]; // Can be number for MCQ, string for Short Answer/Essay, or array for MultipleSelect/FillInBlank/Matching
  formattedSelectedAnswer?: string; // Formatted display string for the selected answer
  correctAnswer: number | string | number[];
  formattedCorrectAnswer?: string; // Formatted display string for the correct answer
  aiGradingResult?: {
    correct: number; // 1 or 0
    reason: string; // Explanation
  };
}

export interface DifficultyProgression {
  questionNumber: number;
  difficulty: number;
  isCorrect: boolean;
}

export interface GrowthDataPoint {
  period: string;
  year: number;
  assessmentPeriod: string;
  ritScore: number;
  dateTaken: string;
}

export interface ClassAverageDataPoint {
  period: string;
  year: number;
  assessmentPeriod: string;
  averageRITScore: number;
  studentCount: number;
}

export interface PeriodDistribution {
  period: string;
  year: number;
  assessmentPeriod: string;
  totalStudents: number;
  distributions: {
    red: number;
    orange: number;
    yellow: number;
    green: number;
    blue: number;
  };
}

export interface GrowthOverTimeData {
  subjectName: string;
  schoolName?: string;
  gradeName?: string;
  studentScores: GrowthDataPoint[];
  classAverages: ClassAverageDataPoint[];
  districtAverages?: ClassAverageDataPoint[];
  periodDistributions: PeriodDistribution[];
  totalAssessments: number;
}

export interface DetailedAssessmentResults {
  assessment: {
    id: number;
    subjectId: number;
    subjectName: string;
    period: string;
    year: number;
    dateTaken: string;
    duration: number;
    mode?: 'Standard' | 'Adaptive';
  };
  statistics: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    previousRIT: number | null;
    currentRIT: number;
    accuracy: number;
  };
  responses: AssessmentResult[];
  difficultyProgression: DifficultyProgression[];
  previousAssessment: {
    ritScore: number;
    dateTaken: string;
    period: string;
    year: number;
  } | null;
  competencyScores?: CompetencyScore[];
}

export interface DashboardData {
  subjectId: number;
  subjectName: string;
  assessments: Assessment[];
}

export interface AssessmentConfiguration {
  id: number;
  gradeId: number;
  subjectId: number;
  timeLimitMinutes: number;
  questionCount: number;
  isActive: boolean;
  defaultMode?: 'Standard' | 'Adaptive';
  createdAt?: string;
  updatedAt?: string;
  gradeName?: string;
  subjectName?: string;
}

export interface CompetencyScore {
  id: number;
  competencyId: number;
  competencyCode: string;
  competencyName: string;
  questionsAttempted: number;
  questionsCorrect: number;
  rawScore: number;
  weightedScore: number;
  finalScore: number;
  feedbackType: 'strong' | 'neutral' | 'growth';
  feedbackText: string;
  dateCalculated: string;
}

export interface CompetencyGrowthData {
  competencyId: number;
  competencyCode: string;
  competencyName: string;
  scores: Array<{
    assessmentId: number;
    assessmentPeriod: string;
    year: number;
    dateTaken: string;
    finalScore: number;
    feedbackType: 'strong' | 'neutral' | 'growth';
  }>;
  averageScore: number;
  growthTrend: 'improving' | 'declining' | 'stable';
  overallFeedback: string;
}

export interface AdminStats {
  totalQuestions: number;
  totalStudents: number;
  totalAssessments: number;
  difficultyDistribution: Array<{
    difficulty_range: string;
    count: number;
  }>;
  subjectDistribution: Array<{
    name: string;
    question_count: number;
  }>;
  gradePerformance?: Array<{
    id: number;
    display_name: string;
    grade_level: number | null;
    average_rit_score: number;
    performance_percentage: number;
    assessment_count: number;
    student_count: number;
  }>;
}

export interface Competency {
  id: number;
  parent_id?: number | null;
  code: string;
  name: string;
  description?: string;
  strong_description?: string | null;
  neutral_description?: string | null;
  growth_description?: string | null;
  strong_threshold?: number | null;
  neutral_threshold?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompetencyStats {
  id: number;
  code: string;
  name: string;
  questions_linked: number;
  students_assessed: number;
  average_score: number;
  strong_count: number;
  neutral_count: number;
  growth_count: number;
}