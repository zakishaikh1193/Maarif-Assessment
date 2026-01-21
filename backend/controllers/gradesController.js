import { executeQuery } from '../config/database.js';

// Get all grades
export const getAllGrades = async (req, res) => {
  try {
    const grades = await executeQuery(
      'SELECT id, name, display_name, grade_level, description, is_active, created_at FROM grades ORDER BY COALESCE(grade_level, 999), name'
    );

    res.json(grades);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({
      error: 'Failed to fetch grades',
      code: 'FETCH_GRADES_ERROR'
    });
  }
};

// Get grade by ID
export const getGradeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const grades = await executeQuery(
      'SELECT id, name, display_name, grade_level, description, is_active, created_at FROM grades WHERE id = ?',
      [id]
    );

    if (grades.length === 0) {
      return res.status(404).json({
        error: 'Grade not found',
        code: 'GRADE_NOT_FOUND'
      });
    }

    res.json(grades[0]);
  } catch (error) {
    console.error('Error fetching grade:', error);
    res.status(500).json({
      error: 'Failed to fetch grade',
      code: 'FETCH_GRADE_ERROR'
    });
  }
};

// Create new grade (admin only)
export const createGrade = async (req, res) => {
  try {
    const { name, display_name, grade_level, description, is_active = 1 } = req.body;

    // Check if grade already exists by name
    const existingGradesByName = await executeQuery(
      'SELECT id FROM grades WHERE name = ?',
      [name]
    );

    if (existingGradesByName.length > 0) {
      return res.status(409).json({
        error: 'Grade name already exists',
        code: 'GRADE_NAME_EXISTS'
      });
    }

    // Use display_name as name if not provided
    const finalDisplayName = display_name || name;
    const finalGradeLevel = grade_level || null;

    // Insert new grade
    const result = await executeQuery(
      'INSERT INTO grades (name, display_name, grade_level, description, is_active) VALUES (?, ?, ?, ?, ?)',
      [name, finalDisplayName, finalGradeLevel, description, is_active]
    );

    // Get the created grade
    const newGrades = await executeQuery(
      'SELECT id, name, display_name, grade_level, description, is_active, created_at FROM grades WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Grade created successfully',
      grade: newGrades[0]
    });

  } catch (error) {
    console.error('Error creating grade:', error);
    res.status(500).json({
      error: 'Failed to create grade',
      code: 'CREATE_GRADE_ERROR'
    });
  }
};

// Update grade (admin only)
export const updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_name, grade_level, description, is_active } = req.body;

    // Check if grade exists
    const existingGrades = await executeQuery(
      'SELECT id FROM grades WHERE id = ?',
      [id]
    );

    if (existingGrades.length === 0) {
      return res.status(404).json({
        error: 'Grade not found',
        code: 'GRADE_NOT_FOUND'
      });
    }

    // Check if name is already taken by another grade
    const nameCheck = await executeQuery(
      'SELECT id FROM grades WHERE name = ? AND id != ?',
      [name, id]
    );

    if (nameCheck.length > 0) {
      return res.status(409).json({
        error: 'Grade name already exists',
        code: 'GRADE_NAME_EXISTS'
      });
    }

    // Use display_name as name if not provided
    const finalDisplayName = display_name || name;
    const finalGradeLevel = grade_level || null;

    // Update grade
    await executeQuery(
      'UPDATE grades SET name = ?, display_name = ?, grade_level = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, finalDisplayName, finalGradeLevel, description, is_active, id]
    );

    // Get updated grade
    const updatedGrades = await executeQuery(
      'SELECT id, name, display_name, grade_level, description, is_active, created_at FROM grades WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Grade updated successfully',
      grade: updatedGrades[0]
    });

  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({
      error: 'Failed to update grade',
      code: 'UPDATE_GRADE_ERROR'
    });
  }
};

// Delete grade (admin only)
export const deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if grade exists
    const existingGrades = await executeQuery(
      'SELECT id FROM grades WHERE id = ?',
      [id]
    );

    if (existingGrades.length === 0) {
      return res.status(404).json({
        error: 'Grade not found',
        code: 'GRADE_NOT_FOUND'
      });
    }

    // Check if grade has students
    const students = await executeQuery(
      'SELECT id FROM users WHERE grade_id = ? AND role = "student" LIMIT 1',
      [id]
    );

    if (students.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete grade with existing students',
        code: 'GRADE_HAS_STUDENTS'
      });
    }

    // Check if grade has questions
    const questions = await executeQuery(
      'SELECT id FROM questions WHERE grade_id = ? LIMIT 1',
      [id]
    );

    if (questions.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete grade with existing questions',
        code: 'GRADE_HAS_QUESTIONS'
      });
    }

    // Check if grade has assessments
    const assessments = await executeQuery(
      'SELECT id FROM assessments WHERE grade_id = ? LIMIT 1',
      [id]
    );

    if (assessments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete grade with existing assessments',
        code: 'GRADE_HAS_ASSESSMENTS'
      });
    }

    // Delete grade
    await executeQuery('DELETE FROM grades WHERE id = ?', [id]);

    res.json({
      message: 'Grade deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({
      error: 'Failed to delete grade',
      code: 'DELETE_GRADE_ERROR'
    });
  }
};

// Get grade statistics
export const getGradeStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if grade exists
    const gradeExists = await executeQuery(
      'SELECT id, display_name FROM grades WHERE id = ?',
      [id]
    );

    if (gradeExists.length === 0) {
      return res.status(404).json({
        error: 'Grade not found',
        code: 'GRADE_NOT_FOUND'
      });
    }

    // Get grade statistics
    const stats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT q.id) as total_questions,
        COUNT(DISTINCT a.id) as total_assessments,
        COUNT(DISTINCT CASE WHEN a.rit_score IS NOT NULL THEN a.id END) as completed_assessments,
        AVG(a.rit_score) as average_rit_score,
        COUNT(DISTINCT s.id) as total_schools
      FROM grades g
      LEFT JOIN users u ON g.id = u.grade_id AND u.role = 'student'
      LEFT JOIN questions q ON g.id = q.grade_id
      LEFT JOIN assessments a ON u.id = a.student_id
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE g.id = ?
    `, [id]);

    // Get subject distribution for this grade
    const subjectDistribution = await executeQuery(`
      SELECT 
        sub.name as subject_name,
        COUNT(q.id) as question_count,
        COUNT(DISTINCT a.id) as assessment_count
      FROM grades g
      LEFT JOIN questions q ON g.id = q.grade_id
      LEFT JOIN subjects sub ON q.subject_id = sub.id
      LEFT JOIN assessments a ON g.id = a.grade_id AND q.subject_id = a.subject_id
      WHERE g.id = ?
      GROUP BY sub.id, sub.name
      ORDER BY sub.name
    `, [id]);

    // Get school distribution for this grade
    const schoolDistribution = await executeQuery(`
      SELECT 
        s.name as school_name,
        COUNT(u.id) as student_count
      FROM grades g
      LEFT JOIN users u ON g.id = u.grade_id AND u.role = 'student'
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE g.id = ?
      GROUP BY s.id, s.name
      ORDER BY s.name
    `, [id]);

    // Get recent assessments for this grade
    const recentAssessments = await executeQuery(`
      SELECT 
        a.id,
        u.first_name,
        u.last_name,
        s.name as school_name,
        sub.name as subject_name,
        a.rit_score,
        a.assessment_period,
        a.date_taken
      FROM grades g
      JOIN users u ON g.id = u.grade_id AND u.role = 'student'
      JOIN assessments a ON u.id = a.student_id
      JOIN schools s ON u.school_id = s.id
      JOIN subjects sub ON a.subject_id = sub.id
      WHERE g.id = ? AND a.rit_score IS NOT NULL
      ORDER BY a.date_taken DESC
      LIMIT 10
    `, [id]);

    res.json({
      grade_id: parseInt(id),
      grade_name: gradeExists[0].display_name,
      statistics: stats[0],
      subject_distribution: subjectDistribution,
      school_distribution: schoolDistribution,
      recent_assessments: recentAssessments
    });

  } catch (error) {
    console.error('Error fetching grade stats:', error);
    res.status(500).json({
      error: 'Failed to fetch grade statistics',
      code: 'FETCH_GRADE_STATS_ERROR'
    });
  }
};

// Get active grades only
export const getActiveGrades = async (req, res) => {
  try {
    const grades = await executeQuery(
      'SELECT id, name, display_name, grade_level, description FROM grades WHERE is_active = 1 ORDER BY COALESCE(grade_level, 999), name'
    );

    res.json(grades);
  } catch (error) {
    console.error('Error fetching active grades:', error);
    res.status(500).json({
      error: 'Failed to fetch active grades',
      code: 'FETCH_ACTIVE_GRADES_ERROR'
    });
  }
};
