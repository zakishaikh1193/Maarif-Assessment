-- =====================================================
-- Migration: Add Standard and Adaptive Assessment Modes
-- =====================================================
-- This migration adds support for two assessment modes:
-- 1. Adaptive: Questions are selected dynamically based on student responses (existing functionality)
-- 2. Standard: Questions are pre-selected from question bank and assigned to students
-- =====================================================

-- --------------------------------------------------------
-- 1. Add assessment_mode to assessments table
-- --------------------------------------------------------
-- This field distinguishes between 'Standard' and 'Adaptive' assessment modes
ALTER TABLE `assessments` 
ADD COLUMN `assessment_mode` ENUM('Standard', 'Adaptive') NOT NULL DEFAULT 'Adaptive' 
AFTER `grade_id`,
ADD COLUMN `assignment_id` INT DEFAULT NULL COMMENT 'Reference to assignment template for Standard mode assessments' 
AFTER `assessment_mode`,
ADD INDEX `idx_assessments_mode` (`assessment_mode`),
ADD INDEX `idx_assessments_assignment` (`assignment_id`);

-- --------------------------------------------------------
-- 2. Add question_type to questions table
-- --------------------------------------------------------
-- This field will support multiple question types in the future:
-- MCQ, True/False, Matching, Fill-in-the-blank, etc.
ALTER TABLE `questions` 
ADD COLUMN `question_type` ENUM('MCQ', 'TrueFalse', 'Matching', 'FillInBlank', 'ShortAnswer', 'Essay', 'MultipleSelect') 
NOT NULL DEFAULT 'MCQ' 
AFTER `question_text`,
ADD INDEX `idx_questions_type` (`question_type`),
ADD INDEX `idx_questions_type_subject` (`question_type`, `subject_id`);

-- Note: For existing questions, they will default to 'MCQ' which matches current behavior
-- The options JSON field can be adapted for different question types:
-- - MCQ: ["option1", "option2", "option3", "option4"]
-- - TrueFalse: ["True", "False"]
-- - Matching: [{"left": "term1", "right": "definition1"}, ...]
-- - MultipleSelect: ["option1", "option2", "option3", "option4"] with multiple correct indices

-- --------------------------------------------------------
-- 3. Create assignments table (Standard Mode Templates)
-- --------------------------------------------------------
-- This table stores assignment templates created by admins
-- Each assignment is a pre-selected set of questions for Standard mode assessments
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT 'Assignment name/title',
  `description` TEXT DEFAULT NULL COMMENT 'Assignment description',
  `subject_id` INT NOT NULL,
  `grade_id` INT DEFAULT NULL COMMENT 'Target grade level (NULL = all grades)',
  `created_by` INT NOT NULL COMMENT 'Admin user who created this assignment',
  `time_limit_minutes` INT DEFAULT NULL COMMENT 'Time limit for this assignment (NULL = no limit)',
  `total_questions` INT NOT NULL DEFAULT 0 COMMENT 'Total number of questions in this assignment',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Whether this assignment is active and available',
  `is_published` TINYINT(1) DEFAULT 0 COMMENT 'Whether this assignment is published and visible to students',
  `question_sequence` ENUM('fixed', 'random') DEFAULT 'fixed' COMMENT 'Question sequence: fixed or random',
  `option_sequence` ENUM('fixed', 'random') DEFAULT 'fixed' COMMENT 'Option sequence: fixed or random',
  `difficulty_level` INT DEFAULT 225 COMMENT 'Difficulty level (RIT score)',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assignments_subject` (`subject_id`),
  KEY `idx_assignments_grade` (`grade_id`),
  KEY `idx_assignments_created_by` (`created_by`),
  KEY `idx_assignments_active` (`is_active`),
  KEY `idx_assignments_published` (`is_published`),
  KEY `idx_assignments_subject_grade` (`subject_id`, `grade_id`),
  KEY `idx_assignments_comprehensive` (`subject_id`, `grade_id`, `is_active`, `is_published`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 4. Create assignment_questions table
-- --------------------------------------------------------
-- This table links assignments to questions with a specific order
-- For Standard mode, questions are presented in this order
CREATE TABLE IF NOT EXISTS `assignment_questions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `assignment_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  `question_order` INT NOT NULL COMMENT 'Order of question in the assignment (1, 2, 3, ...)',
  `points` DECIMAL(5,2) DEFAULT 1.00 COMMENT 'Points awarded for correct answer',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_assignment_question_order` (`assignment_id`, `question_order`),
  KEY `idx_assignment_questions_assignment` (`assignment_id`),
  KEY `idx_assignment_questions_question` (`question_id`),
  KEY `idx_assignment_questions_order` (`assignment_id`, `question_order`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 5. Update assessment_configurations table
-- --------------------------------------------------------
-- Add support for default assessment mode per grade-subject combination
ALTER TABLE `assessment_configurations` 
ADD COLUMN `default_mode` ENUM('Standard', 'Adaptive') NOT NULL DEFAULT 'Adaptive' 
AFTER `question_count`,
ADD INDEX `idx_config_mode` (`default_mode`);

-- --------------------------------------------------------
-- 6. Create assignment_students table (Optional - for targeted assignments)
-- --------------------------------------------------------
-- This table allows admins to assign specific assignments to specific students
-- If an assignment is published but not assigned to specific students, it's available to all
CREATE TABLE IF NOT EXISTS `assignment_students` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `assignment_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `assigned_by` INT NOT NULL COMMENT 'Admin who assigned this to the student',
  `assigned_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` TIMESTAMP NULL DEFAULT NULL COMMENT 'Optional due date for the assignment',
  `is_completed` TINYINT(1) DEFAULT 0 COMMENT 'Whether student has completed this assignment',
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_assignment_student` (`assignment_id`, `student_id`),
  KEY `idx_assignment_students_assignment` (`assignment_id`),
  KEY `idx_assignment_students_student` (`student_id`),
  KEY `idx_assignment_students_completed` (`is_completed`),
  KEY `idx_assignment_students_due_date` (`due_date`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 7. Add indexes for better performance
-- --------------------------------------------------------
-- Additional indexes for common query patterns

-- For finding assessments by mode and student
ALTER TABLE `assessments` 
ADD INDEX `idx_assessments_student_mode` (`student_id`, `assessment_mode`),
ADD INDEX `idx_assessments_student_subject_mode` (`student_id`, `subject_id`, `assessment_mode`);

-- For finding available assignments for a student
ALTER TABLE `assignments`
ADD INDEX `idx_assignments_available` (`is_active`, `is_published`, `subject_id`, `grade_id`);

-- --------------------------------------------------------
-- 8. Update questions table for multiple question types support
-- --------------------------------------------------------
-- Add fields to support different question types
ALTER TABLE `questions`
ADD COLUMN `correct_answer` TEXT DEFAULT NULL COMMENT 'For non-MCQ types: stores correct answer(s) as JSON',
ADD COLUMN `question_metadata` JSON DEFAULT NULL COMMENT 'Additional metadata for question types (e.g., matching pairs, fill-in options)',
ADD INDEX `idx_questions_type_grade` (`question_type`, `grade_id`);

-- Note on correct_answer field:
-- - MCQ: NULL (uses correct_option_index)
-- - TrueFalse: "true" or "false"
-- - Matching: JSON array of correct pairs [{"left": 1, "right": 2}, ...]
-- - FillInBlank: JSON array of acceptable answers ["answer1", "answer2", ...]
-- - MultipleSelect: JSON array of correct indices [0, 2, 3]
-- - ShortAnswer/Essay: NULL (manual grading)

-- --------------------------------------------------------
-- 9. Data Migration Notes
-- --------------------------------------------------------
-- All existing assessments will have assessment_mode = 'Adaptive' (default)
-- All existing questions will have question_type = 'MCQ' (default)
-- No data loss will occur

-- --------------------------------------------------------
-- 10. Rollback Script (if needed)
-- --------------------------------------------------------
/*
-- To rollback this migration, execute:

ALTER TABLE `assessments` 
DROP COLUMN `assessment_mode`,
DROP COLUMN `assignment_id`,
DROP INDEX `idx_assessments_mode`,
DROP INDEX `idx_assessments_assignment`,
DROP INDEX `idx_assessments_student_mode`,
DROP INDEX `idx_assessments_student_subject_mode`;

ALTER TABLE `questions`
DROP COLUMN `question_type`,
DROP COLUMN `correct_answer`,
DROP COLUMN `question_metadata`,
DROP INDEX `idx_questions_type`,
DROP INDEX `idx_questions_type_subject`,
DROP INDEX `idx_questions_type_grade`;

ALTER TABLE `assessment_configurations`
DROP COLUMN `default_mode`,
DROP INDEX `idx_config_mode`;

DROP TABLE IF EXISTS `assignment_students`;
DROP TABLE IF EXISTS `assignment_questions`;
DROP TABLE IF EXISTS `assignments`;
*/

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary of changes:
-- 1. Added assessment_mode to assessments table
-- 2. Added assignment_id to link Standard assessments to templates
-- 3. Added question_type to questions table for future question types
-- 4. Created assignments table for Standard mode templates
-- 5. Created assignment_questions table to link questions to assignments
-- 6. Created assignment_students table for targeted assignments
-- 7. Updated assessment_configurations to support default mode
-- 8. Added necessary indexes for performance
-- =====================================================
