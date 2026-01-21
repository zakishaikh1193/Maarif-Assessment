import { executeQuery } from '../config/database.js';

// Get all subjects
export const getAllSubjects = async (req, res) => {
  try {
    const subjects = await executeQuery(
      'SELECT id, name, description FROM subjects ORDER BY name'
    );

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      error: 'Failed to fetch subjects',
      code: 'FETCH_SUBJECTS_ERROR'
    });
  }
};

// Get subject by ID
export const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subjects = await executeQuery(
      'SELECT id, name, description FROM subjects WHERE id = ?',
      [id]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    res.json(subjects[0]);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({
      error: 'Failed to fetch subject',
      code: 'FETCH_SUBJECT_ERROR'
    });
  }
};

// Create new subject (admin only)
export const createSubject = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if subject already exists
    const existingSubjects = await executeQuery(
      'SELECT id FROM subjects WHERE name = ?',
      [name]
    );

    if (existingSubjects.length > 0) {
      return res.status(409).json({
        error: 'Subject already exists',
        code: 'SUBJECT_EXISTS'
      });
    }

    // Insert new subject
    const result = await executeQuery(
      'INSERT INTO subjects (name, description) VALUES (?, ?)',
      [name, description]
    );

    // Get the created subject
    const newSubjects = await executeQuery(
      'SELECT id, name, description FROM subjects WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Subject created successfully',
      subject: newSubjects[0]
    });

  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({
      error: 'Failed to create subject',
      code: 'CREATE_SUBJECT_ERROR'
    });
  }
};

// Update subject (admin only)
export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if subject exists
    const existingSubjects = await executeQuery(
      'SELECT id FROM subjects WHERE id = ?',
      [id]
    );

    if (existingSubjects.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Check if name is already taken by another subject
    const nameCheck = await executeQuery(
      'SELECT id FROM subjects WHERE name = ? AND id != ?',
      [name, id]
    );

    if (nameCheck.length > 0) {
      return res.status(409).json({
        error: 'Subject name already exists',
        code: 'SUBJECT_NAME_EXISTS'
      });
    }

    // Update subject
    await executeQuery(
      'UPDATE subjects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, id]
    );

    // Get updated subject
    const updatedSubjects = await executeQuery(
      'SELECT id, name, description FROM subjects WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Subject updated successfully',
      subject: updatedSubjects[0]
    });

  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({
      error: 'Failed to update subject',
      code: 'UPDATE_SUBJECT_ERROR'
    });
  }
};

// Delete subject (admin only)
export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists
    const existingSubjects = await executeQuery(
      'SELECT id FROM subjects WHERE id = ?',
      [id]
    );

    if (existingSubjects.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Check if subject has questions
    const questions = await executeQuery(
      'SELECT id FROM questions WHERE subject_id = ? LIMIT 1',
      [id]
    );

    if (questions.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete subject with existing questions',
        code: 'SUBJECT_HAS_QUESTIONS'
      });
    }

    // Check if subject has assessments
    const assessments = await executeQuery(
      'SELECT id FROM assessments WHERE subject_id = ? LIMIT 1',
      [id]
    );

    if (assessments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete subject with existing assessments',
        code: 'SUBJECT_HAS_ASSESSMENTS'
      });
    }

    // Delete subject
    await executeQuery('DELETE FROM subjects WHERE id = ?', [id]);

    res.json({
      message: 'Subject deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({
      error: 'Failed to delete subject',
      code: 'DELETE_SUBJECT_ERROR'
    });
  }
};
