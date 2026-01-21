import { executeQuery } from '../config/database.js';

// Get all assessment configurations
export const getAllConfigurations = async (req, res) => {
  try {
    const configurations = await executeQuery(`
      SELECT 
        ac.id,
        ac.grade_id as gradeId,
        ac.subject_id as subjectId,
        ac.time_limit_minutes as timeLimitMinutes,
        ac.question_count as questionCount,
        ac.is_active as isActive,
        ac.default_mode as defaultMode,
        ac.created_at as createdAt,
        ac.updated_at as updatedAt,
        g.display_name as gradeName,
        s.name as subjectName
      FROM assessment_configurations ac
      JOIN grades g ON ac.grade_id = g.id
      JOIN subjects s ON ac.subject_id = s.id
      ORDER BY g.grade_level ASC, s.name ASC
    `);

    res.json(configurations);
  } catch (error) {
    console.error('Error fetching assessment configurations:', error);
    res.status(500).json({
      error: 'Failed to fetch assessment configurations',
      code: 'FETCH_CONFIGS_ERROR'
    });
  }
};

// Get configuration by ID
export const getConfigurationById = async (req, res) => {
  try {
    const { id } = req.params;

    const configurations = await executeQuery(`
      SELECT 
        ac.id,
        ac.grade_id as gradeId,
        ac.subject_id as subjectId,
        ac.time_limit_minutes as timeLimitMinutes,
        ac.question_count as questionCount,
        ac.is_active as isActive,
        ac.default_mode as defaultMode,
        ac.created_at as createdAt,
        ac.updated_at as updatedAt,
        g.display_name as gradeName,
        s.name as subjectName
      FROM assessment_configurations ac
      JOIN grades g ON ac.grade_id = g.id
      JOIN subjects s ON ac.subject_id = s.id
      WHERE ac.id = ?
    `, [id]);

    if (configurations.length === 0) {
      return res.status(404).json({
        error: 'Assessment configuration not found',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    res.json(configurations[0]);
  } catch (error) {
    console.error('Error fetching assessment configuration:', error);
    res.status(500).json({
      error: 'Failed to fetch assessment configuration',
      code: 'FETCH_CONFIG_ERROR'
    });
  }
};

// Get configuration by grade and subject
export const getConfigurationByGradeSubject = async (req, res) => {
  try {
    const { gradeId, subjectId } = req.params;

    const configurations = await executeQuery(`
      SELECT 
        ac.id,
        ac.grade_id as gradeId,
        ac.subject_id as subjectId,
        ac.time_limit_minutes as timeLimitMinutes,
        ac.question_count as questionCount,
        ac.is_active as isActive,
        ac.default_mode as defaultMode,
        ac.created_at as createdAt,
        ac.updated_at as updatedAt,
        g.display_name as gradeName,
        s.name as subjectName
      FROM assessment_configurations ac
      JOIN grades g ON ac.grade_id = g.id
      JOIN subjects s ON ac.subject_id = s.id
      WHERE ac.grade_id = ? AND ac.subject_id = ? AND ac.is_active = 1
    `, [gradeId, subjectId]);

    if (configurations.length === 0) {
      return res.status(404).json({
        error: 'Assessment configuration not found for this grade-subject combination',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    res.json(configurations[0]);
  } catch (error) {
    console.error('Error fetching assessment configuration:', error);
    res.status(500).json({
      error: 'Failed to fetch assessment configuration',
      code: 'FETCH_CONFIG_ERROR'
    });
  }
};

// Create new assessment configuration
export const createConfiguration = async (req, res) => {
  try {
    const { gradeId, subjectId, timeLimitMinutes, questionCount, isActive = true, defaultMode = 'Adaptive' } = req.body;

    // Validate required fields
    if (!gradeId || !subjectId || !timeLimitMinutes || !questionCount) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if configuration already exists for this grade-subject combination
    const existingConfig = await executeQuery(`
      SELECT id FROM assessment_configurations 
      WHERE grade_id = ? AND subject_id = ?
    `, [gradeId, subjectId]);

    if (existingConfig.length > 0) {
      return res.status(400).json({
        error: 'Configuration already exists for this grade-subject combination',
        code: 'CONFIG_EXISTS'
      });
    }

    // Validate grade exists
    const gradeExists = await executeQuery('SELECT id FROM grades WHERE id = ?', [gradeId]);
    if (gradeExists.length === 0) {
      return res.status(400).json({
        error: 'Grade not found',
        code: 'GRADE_NOT_FOUND'
      });
    }

    // Validate subject exists
    const subjectExists = await executeQuery('SELECT id FROM subjects WHERE id = ?', [subjectId]);
    if (subjectExists.length === 0) {
      return res.status(400).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Create configuration
    const result = await executeQuery(`
      INSERT INTO assessment_configurations 
      (grade_id, subject_id, time_limit_minutes, question_count, is_active, default_mode) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [gradeId, subjectId, timeLimitMinutes, questionCount, isActive, defaultMode]);

    const newConfig = await executeQuery(`
      SELECT 
        ac.id,
        ac.grade_id as gradeId,
        ac.subject_id as subjectId,
        ac.time_limit_minutes as timeLimitMinutes,
        ac.question_count as questionCount,
        ac.is_active as isActive,
        ac.default_mode as defaultMode,
        ac.created_at as createdAt,
        ac.updated_at as updatedAt,
        g.display_name as gradeName,
        s.name as subjectName
      FROM assessment_configurations ac
      JOIN grades g ON ac.grade_id = g.id
      JOIN subjects s ON ac.subject_id = s.id
      WHERE ac.id = ?
    `, [result.insertId]);

    res.status(201).json(newConfig[0]);
  } catch (error) {
    console.error('Error creating assessment configuration:', error);
    res.status(500).json({
      error: 'Failed to create assessment configuration',
      code: 'CREATE_CONFIG_ERROR'
    });
  }
};

// Update assessment configuration
export const updateConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const { gradeId, subjectId, timeLimitMinutes, questionCount, isActive, defaultMode } = req.body;

    // Check if configuration exists
    const existingConfig = await executeQuery(`
      SELECT id FROM assessment_configurations WHERE id = ?
    `, [id]);

    if (existingConfig.length === 0) {
      return res.status(404).json({
        error: 'Assessment configuration not found',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    // Check if another configuration exists for this grade-subject combination
    if (gradeId && subjectId) {
      const duplicateConfig = await executeQuery(`
        SELECT id FROM assessment_configurations 
        WHERE grade_id = ? AND subject_id = ? AND id != ?
      `, [gradeId, subjectId, id]);

      if (duplicateConfig.length > 0) {
        return res.status(400).json({
          error: 'Configuration already exists for this grade-subject combination',
          code: 'CONFIG_EXISTS'
        });
      }
    }

    // Update configuration
    await executeQuery(`
      UPDATE assessment_configurations 
      SET grade_id = ?, subject_id = ?, time_limit_minutes = ?, 
          question_count = ?, is_active = ?, default_mode = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [gradeId, subjectId, timeLimitMinutes, questionCount, isActive, defaultMode || 'Adaptive', id]);

    // Get updated configuration
    const updatedConfig = await executeQuery(`
      SELECT 
        ac.id,
        ac.grade_id as gradeId,
        ac.subject_id as subjectId,
        ac.time_limit_minutes as timeLimitMinutes,
        ac.question_count as questionCount,
        ac.is_active as isActive,
        ac.default_mode as defaultMode,
        ac.created_at as createdAt,
        ac.updated_at as updatedAt,
        g.display_name as gradeName,
        s.name as subjectName
      FROM assessment_configurations ac
      JOIN grades g ON ac.grade_id = g.id
      JOIN subjects s ON ac.subject_id = s.id
      WHERE ac.id = ?
    `, [id]);

    res.json(updatedConfig[0]);
  } catch (error) {
    console.error('Error updating assessment configuration:', error);
    res.status(500).json({
      error: 'Failed to update assessment configuration',
      code: 'UPDATE_CONFIG_ERROR'
    });
  }
};

// Delete assessment configuration
export const deleteConfiguration = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if configuration exists
    const existingConfig = await executeQuery(`
      SELECT id FROM assessment_configurations WHERE id = ?
    `, [id]);

    if (existingConfig.length === 0) {
      return res.status(404).json({
        error: 'Assessment configuration not found',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    // Delete configuration
    await executeQuery('DELETE FROM assessment_configurations WHERE id = ?', [id]);

    res.json({ message: 'Assessment configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment configuration:', error);
    res.status(500).json({
      error: 'Failed to delete assessment configuration',
      code: 'DELETE_CONFIG_ERROR'
    });
  }
};
