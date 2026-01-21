import { executeQuery } from '../config/database.js';

// Get all competencies
export const getAllCompetencies = async (req, res) => {
  try {
    const competencies = await executeQuery(
      'SELECT id, code, name, description, strong_threshold, neutral_threshold, is_active, created_at, updated_at FROM competencies ORDER BY code ASC'
    );
    res.json(competencies);
  } catch (error) {
    console.error('Error fetching competencies:', error);
    res.status(500).json({ error: 'Failed to fetch competencies', code: 'FETCH_COMPETENCIES_ERROR' });
  }
};

// Get active competencies only
export const getActiveCompetencies = async (req, res) => {
  try {
    const competencies = await executeQuery(
      'SELECT id, code, name, description, strong_threshold, neutral_threshold FROM competencies WHERE is_active = 1 ORDER BY code ASC'
    );
    res.json(competencies);
  } catch (error) {
    console.error('Error fetching active competencies:', error);
    res.status(500).json({ error: 'Failed to fetch active competencies', code: 'FETCH_ACTIVE_COMPETENCIES_ERROR' });
  }
};

// Get competency by ID
export const getCompetencyById = async (req, res) => {
  try {
    const { id } = req.params;
    const competencies = await executeQuery(
      'SELECT * FROM competencies WHERE id = ?',
      [id]
    );

    if (competencies.length === 0) {
      return res.status(404).json({
        error: 'Competency not found',
        code: 'COMPETENCY_NOT_FOUND'
      });
    }

    res.json(competencies[0]);
  } catch (error) {
    console.error('Error fetching competency:', error);
    res.status(500).json({ error: 'Failed to fetch competency', code: 'FETCH_COMPETENCY_ERROR' });
  }
};

// Create new competency
export const createCompetency = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      strong_description,
      neutral_description,
      growth_description,
      strong_threshold = 70,
      neutral_threshold = 50,
      is_active = 1
    } = req.body;

    // Check if competency code already exists
    const existingCode = await executeQuery(
      'SELECT id FROM competencies WHERE code = ?',
      [code]
    );

    if (existingCode.length > 0) {
      return res.status(400).json({
        error: 'Competency code already exists',
        code: 'COMPETENCY_CODE_EXISTS'
      });
    }

    // Check if competency name already exists
    const existingName = await executeQuery(
      'SELECT id FROM competencies WHERE name = ?',
      [name]
    );

    if (existingName.length > 0) {
      return res.status(400).json({
        error: 'Competency name already exists',
        code: 'COMPETENCY_NAME_EXISTS'
      });
    }

    // Validate thresholds
    if (strong_threshold <= neutral_threshold) {
      return res.status(400).json({
        error: 'Strong threshold must be greater than neutral threshold',
        code: 'INVALID_THRESHOLDS'
      });
    }

    const result = await executeQuery(
      `INSERT INTO competencies (
        code, name, description, strong_description, neutral_description, 
        growth_description, strong_threshold, neutral_threshold, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name, description, strong_description, neutral_description, 
       growth_description, strong_threshold, neutral_threshold, is_active]
    );

    // Fetch the created competency
    const newCompetency = await executeQuery(
      'SELECT * FROM competencies WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Competency created successfully',
      competency: newCompetency[0]
    });
  } catch (error) {
    console.error('Error creating competency:', error);
    res.status(500).json({ error: 'Failed to create competency', code: 'CREATE_COMPETENCY_ERROR' });
  }
};

// Update competency
export const updateCompetency = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      strong_description,
      neutral_description,
      growth_description,
      strong_threshold,
      neutral_threshold,
      is_active
    } = req.body;

    // Check if competency exists
    const existingCompetency = await executeQuery(
      'SELECT id FROM competencies WHERE id = ?',
      [id]
    );

    if (existingCompetency.length === 0) {
      return res.status(404).json({
        error: 'Competency not found',
        code: 'COMPETENCY_NOT_FOUND'
      });
    }

    // Check if code already exists (excluding current competency)
    if (code) {
      const existingCode = await executeQuery(
        'SELECT id FROM competencies WHERE code = ? AND id != ?',
        [code, id]
      );

      if (existingCode.length > 0) {
        return res.status(400).json({
          error: 'Competency code already exists',
          code: 'COMPETENCY_CODE_EXISTS'
        });
      }
    }

    // Check if name already exists (excluding current competency)
    if (name) {
      const existingName = await executeQuery(
        'SELECT id FROM competencies WHERE name = ? AND id != ?',
        [name, id]
      );

      if (existingName.length > 0) {
        return res.status(400).json({
          error: 'Competency name already exists',
          code: 'COMPETENCY_NAME_EXISTS'
        });
      }
    }

    // Validate thresholds if both are provided
    if (strong_threshold !== undefined && neutral_threshold !== undefined) {
      if (strong_threshold <= neutral_threshold) {
        return res.status(400).json({
          error: 'Strong threshold must be greater than neutral threshold',
          code: 'INVALID_THRESHOLDS'
        });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(code);
    }
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (strong_description !== undefined) {
      updateFields.push('strong_description = ?');
      updateValues.push(strong_description);
    }
    if (neutral_description !== undefined) {
      updateFields.push('neutral_description = ?');
      updateValues.push(neutral_description);
    }
    if (growth_description !== undefined) {
      updateFields.push('growth_description = ?');
      updateValues.push(growth_description);
    }
    if (strong_threshold !== undefined) {
      updateFields.push('strong_threshold = ?');
      updateValues.push(strong_threshold);
    }
    if (neutral_threshold !== undefined) {
      updateFields.push('neutral_threshold = ?');
      updateValues.push(neutral_threshold);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        code: 'NO_FIELDS_TO_UPDATE'
      });
    }

    updateValues.push(id);

    await executeQuery(
      `UPDATE competencies SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Fetch the updated competency
    const updatedCompetency = await executeQuery(
      'SELECT * FROM competencies WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Competency updated successfully',
      competency: updatedCompetency[0]
    });
  } catch (error) {
    console.error('Error updating competency:', error);
    res.status(500).json({ error: 'Failed to update competency', code: 'UPDATE_COMPETENCY_ERROR' });
  }
};

// Delete competency
export const deleteCompetency = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if competency exists
    const existingCompetency = await executeQuery(
      'SELECT id FROM competencies WHERE id = ?',
      [id]
    );

    if (existingCompetency.length === 0) {
      return res.status(404).json({
        error: 'Competency not found',
        code: 'COMPETENCY_NOT_FOUND'
      });
    }

    // Check if competency is linked to any questions
    const linkedQuestions = await executeQuery(
      'SELECT COUNT(*) as count FROM questions_competencies WHERE competency_id = ?',
      [id]
    );

    if (linkedQuestions[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete competency that is linked to questions',
        code: 'COMPETENCY_LINKED_TO_QUESTIONS'
      });
    }

    // Check if competency has any student scores
    const studentScores = await executeQuery(
      'SELECT COUNT(*) as count FROM student_competency_scores WHERE competency_id = ?',
      [id]
    );

    if (studentScores[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete competency that has student scores',
        code: 'COMPETENCY_HAS_STUDENT_SCORES'
      });
    }

    await executeQuery('DELETE FROM competencies WHERE id = ?', [id]);

    res.json({
      message: 'Competency deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting competency:', error);
    res.status(500).json({ error: 'Failed to delete competency', code: 'DELETE_COMPETENCY_ERROR' });
  }
};

// Get competency statistics
export const getCompetencyStats = async (req, res) => {
  try {
    const stats = await executeQuery(`
      SELECT 
        c.id,
        c.code,
        c.name,
        COUNT(DISTINCT qc.question_id) as questions_linked,
        COUNT(DISTINCT scs.student_id) as students_assessed,
        AVG(scs.final_score) as average_score,
        COUNT(CASE WHEN scs.feedback_type = 'strong' THEN 1 END) as strong_count,
        COUNT(CASE WHEN scs.feedback_type = 'neutral' THEN 1 END) as neutral_count,
        COUNT(CASE WHEN scs.feedback_type = 'growth' THEN 1 END) as growth_count
      FROM competencies c
      LEFT JOIN questions_competencies qc ON c.id = qc.competency_id
      LEFT JOIN student_competency_scores scs ON c.id = scs.competency_id
      GROUP BY c.id, c.code, c.name
      ORDER BY c.code ASC
    `);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching competency stats:', error);
    res.status(500).json({ error: 'Failed to fetch competency statistics', code: 'FETCH_COMPETENCY_STATS_ERROR' });
  }
};

// Get questions linked to a competency
export const getCompetencyQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    
    const questions = await executeQuery(`
      SELECT 
        q.id,
        q.question_text,
        q.difficulty_level,
        qc.weight,
        s.name as subject_name,
        q.created_at
      FROM questions q
      JOIN questions_competencies qc ON q.id = qc.question_id
      JOIN subjects s ON q.subject_id = s.id
      WHERE qc.competency_id = ?
      ORDER BY q.difficulty_level ASC
    `, [id]);

    res.json(questions);
  } catch (error) {
    console.error('Error fetching competency questions:', error);
    res.status(500).json({ error: 'Failed to fetch competency questions', code: 'FETCH_COMPETENCY_QUESTIONS_ERROR' });
  }
};
