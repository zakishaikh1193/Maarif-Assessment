-- =====================================================
-- Migration: Fix MultipleSelect Questions
-- =====================================================
-- This migration ensures that MultipleSelect questions
-- have their correct_answer field properly populated
-- =====================================================

-- Note: This migration is informational only.
-- MultipleSelect questions should be created/updated using the application
-- which will properly populate the correct_answer field.
-- 
-- If you have existing MultipleSelect questions with NULL correct_answer,
-- you may need to edit and re-save them through the application interface.

-- Check for MultipleSelect questions with NULL correct_answer
-- SELECT id, question_text, correct_option_index, correct_answer 
-- FROM questions 
-- WHERE question_type = 'MultipleSelect' 
-- AND (correct_answer IS NULL OR correct_answer = '');

-- =====================================================
-- Migration Complete
-- =====================================================
-- The application logic now properly stores MultipleSelect answers:
-- - correct_option_index: stores the first correct index (for backward compatibility)
-- - correct_answer: stores all correct indices as JSON array (e.g., "[0,2,3]")
-- =====================================================
