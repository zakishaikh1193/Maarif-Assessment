import { executeQuery } from '../config/database.js';

// Get all schools
export const getAllSchools = async (req, res) => {
  try {
    const schools = await executeQuery(
      'SELECT id, name, address, contact_email, contact_phone, created_at FROM schools ORDER BY name'
    );

    res.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({
      error: 'Failed to fetch schools',
      code: 'FETCH_SCHOOLS_ERROR'
    });
  }
};

// Get school by ID
export const getSchoolById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schools = await executeQuery(
      'SELECT id, name, address, contact_email, contact_phone, created_at FROM schools WHERE id = ?',
      [id]
    );

    if (schools.length === 0) {
      return res.status(404).json({
        error: 'School not found',
        code: 'SCHOOL_NOT_FOUND'
      });
    }

    res.json(schools[0]);
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({
      error: 'Failed to fetch school',
      code: 'FETCH_SCHOOL_ERROR'
    });
  }
};

// Create new school (admin only)
export const createSchool = async (req, res) => {
  try {
    const { name, address, contact_email, contact_phone } = req.body;

    // Check if school already exists
    const existingSchools = await executeQuery(
      'SELECT id FROM schools WHERE name = ?',
      [name]
    );

    if (existingSchools.length > 0) {
      return res.status(409).json({
        error: 'School already exists',
        code: 'SCHOOL_EXISTS'
      });
    }

    // Insert new school
    const result = await executeQuery(
      'INSERT INTO schools (name, address, contact_email, contact_phone) VALUES (?, ?, ?, ?)',
      [name, address, contact_email, contact_phone]
    );

    // Get the created school
    const newSchools = await executeQuery(
      'SELECT id, name, address, contact_email, contact_phone, created_at FROM schools WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'School created successfully',
      school: newSchools[0]
    });

  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({
      error: 'Failed to create school',
      code: 'CREATE_SCHOOL_ERROR'
    });
  }
};

// Update school (admin only)
export const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, contact_email, contact_phone } = req.body;

    // Check if school exists
    const existingSchools = await executeQuery(
      'SELECT id FROM schools WHERE id = ?',
      [id]
    );

    if (existingSchools.length === 0) {
      return res.status(404).json({
        error: 'School not found',
        code: 'SCHOOL_NOT_FOUND'
      });
    }

    // Check if name is already taken by another school
    const nameCheck = await executeQuery(
      'SELECT id FROM schools WHERE name = ? AND id != ?',
      [name, id]
    );

    if (nameCheck.length > 0) {
      return res.status(409).json({
        error: 'School name already exists',
        code: 'SCHOOL_NAME_EXISTS'
      });
    }

    // Update school
    await executeQuery(
      'UPDATE schools SET name = ?, address = ?, contact_email = ?, contact_phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, address, contact_email, contact_phone, id]
    );

    // Get updated school
    const updatedSchools = await executeQuery(
      'SELECT id, name, address, contact_email, contact_phone, created_at FROM schools WHERE id = ?',
      [id]
    );

    res.json({
      message: 'School updated successfully',
      school: updatedSchools[0]
    });

  } catch (error) {
    console.error('Error updating school:', error);
    res.status(500).json({
      error: 'Failed to update school',
      code: 'UPDATE_SCHOOL_ERROR'
    });
  }
};

// Delete school (admin only)
export const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if school exists
    const existingSchools = await executeQuery(
      'SELECT id FROM schools WHERE id = ?',
      [id]
    );

    if (existingSchools.length === 0) {
      return res.status(404).json({
        error: 'School not found',
        code: 'SCHOOL_NOT_FOUND'
      });
    }

    // Check if school has students
    const students = await executeQuery(
      'SELECT id FROM users WHERE school_id = ? AND role = "student" LIMIT 1',
      [id]
    );

    if (students.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete school with existing students',
        code: 'SCHOOL_HAS_STUDENTS'
      });
    }

    // Delete school
    await executeQuery('DELETE FROM schools WHERE id = ?', [id]);

    res.json({
      message: 'School deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting school:', error);
    res.status(500).json({
      error: 'Failed to delete school',
      code: 'DELETE_SCHOOL_ERROR'
    });
  }
};

// Get school statistics
export const getSchoolStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if school exists
    const schoolExists = await executeQuery(
      'SELECT id FROM schools WHERE id = ?',
      [id]
    );

    if (schoolExists.length === 0) {
      return res.status(404).json({
        error: 'School not found',
        code: 'SCHOOL_NOT_FOUND'
      });
    }

    // Get school statistics
    const stats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT a.id) as total_assessments,
        COUNT(DISTINCT CASE WHEN a.rit_score IS NOT NULL THEN a.id END) as completed_assessments,
        AVG(a.rit_score) as average_rit_score,
        COUNT(DISTINCT g.id) as total_grades
      FROM schools s
      LEFT JOIN users u ON s.id = u.school_id AND u.role = 'student'
      LEFT JOIN assessments a ON u.id = a.student_id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE s.id = ?
    `, [id]);

    // Get grade distribution
    const gradeDistribution = await executeQuery(`
      SELECT 
        g.display_name as grade_name,
        COUNT(u.id) as student_count
      FROM schools s
      LEFT JOIN users u ON s.id = u.school_id AND u.role = 'student'
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE s.id = ?
      GROUP BY g.id, g.display_name
      ORDER BY COALESCE(g.grade_level, 999), g.display_name
    `, [id]);

    // Get recent assessments
    const recentAssessments = await executeQuery(`
      SELECT 
        a.id,
        u.first_name,
        u.last_name,
        sub.name as subject_name,
        g.display_name as grade_name,
        a.rit_score,
        a.assessment_period,
        a.date_taken
      FROM schools s
      JOIN users u ON s.id = u.school_id AND u.role = 'student'
      JOIN assessments a ON u.id = a.student_id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN grades g ON a.grade_id = g.id
      WHERE s.id = ? AND a.rit_score IS NOT NULL
      ORDER BY a.date_taken DESC
      LIMIT 10
    `, [id]);

    res.json({
      school_id: parseInt(id),
      statistics: stats[0],
      grade_distribution: gradeDistribution,
      recent_assessments: recentAssessments
    });

  } catch (error) {
    console.error('Error fetching school stats:', error);
    res.status(500).json({
      error: 'Failed to fetch school statistics',
      code: 'FETCH_SCHOOL_STATS_ERROR'
    });
  }
};
