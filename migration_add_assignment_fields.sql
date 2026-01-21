-- =====================================================
-- Migration: Add Missing Fields to Assignments Table
-- =====================================================
-- This migration adds the missing fields to the assignments table:
-- - question_sequence
-- - option_sequence  
-- - difficulty_level
-- =====================================================

-- --------------------------------------------------------
-- Add missing columns to assignments table
-- --------------------------------------------------------

-- Add question_sequence column
ALTER TABLE `assignments` 
ADD COLUMN `question_sequence` ENUM('fixed', 'random') DEFAULT 'fixed' 
COMMENT 'Question sequence: fixed or random'
AFTER `is_published`;

-- Add option_sequence column
ALTER TABLE `assignments` 
ADD COLUMN `option_sequence` ENUM('fixed', 'random') DEFAULT 'fixed' 
COMMENT 'Option sequence: fixed or random'
AFTER `question_sequence`;

-- Add difficulty_level column
ALTER TABLE `assignments` 
ADD COLUMN `difficulty_level` INT DEFAULT 225 
COMMENT 'Difficulty level (RIT score)'
AFTER `option_sequence`;

-- Add start and end date/time columns for assignment availability
ALTER TABLE `assignments` 
ADD COLUMN `start_date` DATETIME DEFAULT NULL 
COMMENT 'Start date and time when assignment becomes available'
AFTER `difficulty_level`;

ALTER TABLE `assignments` 
ADD COLUMN `end_date` DATETIME DEFAULT NULL 
COMMENT 'End date and time when assignment becomes unavailable'
AFTER `start_date`;

-- --------------------------------------------------------
-- Add indexes for better performance (optional)
-- --------------------------------------------------------
ALTER TABLE `assignments` 
ADD INDEX `idx_assignments_difficulty` (`difficulty_level`),
ADD INDEX `idx_assignments_dates` (`start_date`, `end_date`);

-- --------------------------------------------------------
-- Update existing records (if any) with default values
-- --------------------------------------------------------
UPDATE `assignments` 
SET 
  `question_sequence` = 'fixed',
  `option_sequence` = 'fixed',
  `difficulty_level` = 225
WHERE `question_sequence` IS NULL 
   OR `option_sequence` IS NULL 
   OR `difficulty_level` IS NULL;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary of changes:
-- 1. Added question_sequence column (ENUM: 'fixed', 'random')
-- 2. Added option_sequence column (ENUM: 'fixed', 'random')
-- 3. Added difficulty_level column (INT, default 225)
-- 4. Added index on difficulty_level for performance
-- 5. Updated existing records with default values
-- =====================================================
