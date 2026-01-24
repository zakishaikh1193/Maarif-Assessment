import { body, param, query, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Login validation
export const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  handleValidationErrors
];

// Registration validation
export const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('role')
    .isIn(['admin', 'student'])
    .withMessage('Role must be either admin or student'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  
  handleValidationErrors
];

// ID parameter validation
export const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  handleValidationErrors
];

// Subject ID parameter validation
export const validateSubjectId = [
  param('subjectId')
    .isInt({ min: 1 })
    .withMessage('Subject ID must be a positive integer'),
  
  handleValidationErrors
];

// Assessment ID parameter validation
export const validateAssessmentId = [
  param('assessmentId')
    .isInt({ min: 1 })
    .withMessage('Assessment ID must be a positive integer'),
  
  handleValidationErrors
];

// Assessment configuration validation (gradeId and subjectId)
export const validateAssessmentConfig = [
  param('gradeId')
    .isInt({ min: 1 })
    .withMessage('Grade ID must be a positive integer'),
  
  param('subjectId')
    .isInt({ min: 1 })
    .withMessage('Subject ID must be a positive integer'),
  
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Question creation validation
export const validateQuestion = [
  body('subjectId')
    .isInt({ min: 1 })
    .withMessage('Subject ID must be a positive integer'),
  
  body('questionText')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Question text must be between 10 and 1000 characters'),
  
  body('options')
    .custom((value, { req }) => {
      const questionType = req.body.questionType || 'MCQ';
      
      // For FillInBlank, Matching, ShortAnswer, and Essay questions, options can be empty (options are in questionMetadata or not needed)
      if (questionType === 'FillInBlank' || questionType === 'Matching' || questionType === 'ShortAnswer' || questionType === 'Essay') {
        // Allow empty array or undefined for these types
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
          return true;
        }
        // If provided, still validate format
      }
      
      // For other question types, validate options
      // Allow both array and string formats
      if (Array.isArray(value)) {
        if (value.length < 2 || value.length > 6) {
          throw new Error('Options must have 2-6 items');
        }
        // Validate each option length
        for (let option of value) {
          if (typeof option !== 'string' || option.trim().length < 1 || option.trim().length > 500) {
            throw new Error('Each option must be between 1 and 500 characters');
          }
        }
        return true;
      }
      if (typeof value === 'string') {
        const options = value.split(',').map(opt => opt.trim());
        if (options.length < 2 || options.length > 6) {
          throw new Error('Options must have 2-6 items');
        }
        // Validate each option length
        for (let option of options) {
          if (option.length < 1 || option.length > 500) {
            throw new Error('Each option must be between 1 and 500 characters');
          }
        }
        return true;
      }
      throw new Error('Options must be an array or comma-separated string');
    })
    .withMessage('Options must be an array with 2-6 items or comma-separated string'),
  
  body('correctOptionIndex')
    .isInt({ min: 0 })
    .withMessage('Correct option index must be a non-negative integer'),
  
  body('difficultyLevel')
    .isInt({ min: 100, max: 350 })
    .withMessage('Difficulty level must be between 100 and 350'),
  
  handleValidationErrors
];

// Assessment start validation
export const validateAssessmentStart = [
  body('subjectId')
    .isInt({ min: 1 })
    .withMessage('Subject ID must be a positive integer'),
  
  body('period')
    .isIn(['BOY', 'EOY'])
    .withMessage('Period must be BOY (Beginning of Year) or EOY (End of Year)'),
  
  handleValidationErrors
];

// Answer submission validation
export const validateAnswerSubmission = [
  body('questionId')
    .isInt({ min: 1 })
    .withMessage('Question ID must be a positive integer'),
  
  body('answerIndex')
    .custom((value) => {
      // Allow integer (for MCQ/TrueFalse), array (for MultipleSelect/FillInBlank/Matching), or string (for ShortAnswer/Essay)
      if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
        return true;
      }
      if (Array.isArray(value)) {
        // Validate array contains only non-negative integers
        if (value.length === 0) {
          throw new Error('Answer index array cannot be empty');
        }
        for (let idx of value) {
          if (!Number.isInteger(Number(idx)) || Number(idx) < 0) {
            throw new Error('All answer indices must be non-negative integers');
          }
        }
        return true;
      }
      if (typeof value === 'string') {
        // Allow strings for ShortAnswer and Essay (text responses)
        if (value.trim().length === 0) {
          throw new Error('Text answer cannot be empty');
        }
        return true;
      }
      throw new Error('Answer index must be a non-negative integer, an array of non-negative integers, or a string');
    })
    .withMessage('Answer index must be a non-negative integer, an array of non-negative integers, or a string'),
  
  body('assessmentId')
    .isInt({ min: 1 })
    .withMessage('Assessment ID must be a positive integer'),
  
  handleValidationErrors
];

// Bulk question creation validation
export const validateBulkQuestions = [
  body('questions')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Questions must be an array with 1-1000 items'),
  
  body('questions.*.subjectId')
    .isInt({ min: 1 })
    .withMessage('Subject ID must be a positive integer'),
  
  body('questions.*.questionText')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Question text must be between 10 and 1000 characters'),
  
  body('questions.*.options')
    .custom((value, { req, path }) => {
      // Extract question index from path (e.g., "questions.0.questionType")
      const pathParts = path.split('.');
      const questionIndex = pathParts.length > 1 ? parseInt(pathParts[1]) : -1;
      const questionType = (req.body.questions && questionIndex >= 0 && req.body.questions[questionIndex]) 
        ? req.body.questions[questionIndex].questionType || 'MCQ'
        : 'MCQ';
      
      // For FillInBlank, Matching, ShortAnswer, and Essay questions, options can be empty (options are in questionMetadata or not needed)
      if (questionType === 'FillInBlank' || questionType === 'Matching' || questionType === 'ShortAnswer' || questionType === 'Essay') {
        // Allow empty array or undefined for these types
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
          return true;
        }
        // If provided, still validate format
      }
      
      // For other question types, validate options
      if (Array.isArray(value)) {
        if (value.length < 2 || value.length > 6) {
          throw new Error('Options must have 2-6 items');
        }
        for (let option of value) {
          if (typeof option !== 'string' || option.trim().length < 1 || option.trim().length > 500) {
            throw new Error('Each option must be between 1 and 500 characters');
          }
        }
        return true;
      }
      if (typeof value === 'string') {
        const options = value.split(',').map(opt => opt.trim());
        if (options.length < 2 || options.length > 6) {
          throw new Error('Options must have 2-6 items');
        }
        for (let option of options) {
          if (option.length < 1 || option.length > 500) {
            throw new Error('Each option must be between 1 and 500 characters');
          }
        }
        return true;
      }
      throw new Error('Options must be an array or comma-separated string');
    })
    .withMessage('Options must be an array with 2-6 items or comma-separated string'),
  
  body('questions.*.correctOptionIndex')
    .isInt({ min: 0 })
    .withMessage('Correct option index must be a non-negative integer'),
  
  body('questions.*.difficultyLevel')
    .isInt({ min: 100, max: 350 })
    .withMessage('Difficulty level must be between 100 and 350'),
  
  handleValidationErrors
];

// Student creation validation
export const validateStudent = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  
  body('schoolId')
    .isInt({ min: 1 })
    .withMessage('School ID must be a positive integer'),
  
  body('gradeId')
    .isInt({ min: 1 })
    .withMessage('Grade ID must be a positive integer'),
  
  handleValidationErrors
];

// Validate competency data
export const validateCompetency = (req, res, next) => {
  const { code, name, strong_description, neutral_description, growth_description, strong_threshold, neutral_threshold } = req.body;

  const errors = [];

  // Required fields
  if (!code || code.trim().length === 0) {
    errors.push('Competency code is required');
  } else if (code.length > 20) {
    errors.push('Competency code must be 20 characters or less');
  }

  if (!name || name.trim().length === 0) {
    errors.push('Competency name is required');
  } else if (name.length > 100) {
    errors.push('Competency name must be 100 characters or less');
  }

  // Optional fields - only validate format if provided
  if (strong_description !== undefined && strong_description !== null && strong_description.trim().length === 0) {
    // Allow empty string, but if provided it should not be just whitespace
    // Actually, empty string is fine, so we'll allow it
  }

  if (neutral_description !== undefined && neutral_description !== null && neutral_description.trim().length === 0) {
    // Allow empty string
  }

  if (growth_description !== undefined && growth_description !== null && growth_description.trim().length === 0) {
    // Allow empty string
  }

  // Validate thresholds if provided
  if (strong_threshold !== undefined && strong_threshold !== null && strong_threshold !== '') {
    const threshold = typeof strong_threshold === 'string' ? parseInt(strong_threshold) : strong_threshold;
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
      errors.push('Strong threshold must be an integer between 0 and 100');
    }
  }

  if (neutral_threshold !== undefined && neutral_threshold !== null && neutral_threshold !== '') {
    const threshold = typeof neutral_threshold === 'string' ? parseInt(neutral_threshold) : neutral_threshold;
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
      errors.push('Neutral threshold must be an integer between 0 and 100');
    }
  }

  // Only validate threshold relationship if both are provided
  if (strong_threshold !== undefined && strong_threshold !== null && strong_threshold !== '' &&
      neutral_threshold !== undefined && neutral_threshold !== null && neutral_threshold !== '') {
    const strong = typeof strong_threshold === 'string' ? parseInt(strong_threshold) : strong_threshold;
    const neutral = typeof neutral_threshold === 'string' ? parseInt(neutral_threshold) : neutral_threshold;
    if (strong <= neutral) {
      errors.push('Strong threshold must be greater than neutral threshold');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      code: 'VALIDATION_ERROR'
    });
  }

  next();
};
