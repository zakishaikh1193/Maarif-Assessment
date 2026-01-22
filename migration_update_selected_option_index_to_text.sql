-- Migration: Update selected_option_index to TEXT to support ShortAnswer and Essay questions
-- This allows the column to store both integer indices (for MCQ, etc.) and text responses (for ShortAnswer/Essay)

-- Change selected_option_index from INT to TEXT
ALTER TABLE `assessment_responses` 
MODIFY COLUMN `selected_option_index` TEXT DEFAULT NULL COMMENT 'Stores answer: integer index for MCQ/TrueFalse, JSON array for MultipleSelect/FillInBlank/Matching, or text for ShortAnswer/Essay';

-- Note: Existing integer values will be preserved as text representations
-- The application logic handles parsing based on question type
