import { executeQuery, getConnection } from '../config/database.js';

// Create a new assignment (Standard or Adaptive)
export const createAssignment = async (req, res) => {
  try {
    const { mode, general, questions, assign } = req.body;
    const createdBy = req.user.id; // Admin user creating the assignment

    // Validate required fields
    if (!mode || !general || !assign) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS'
      });
    }

    if (mode === 'Standard' && (!questions || questions.length === 0)) {
      return res.status(400).json({
        error: 'Standard mode requires at least one question',
        code: 'NO_QUESTIONS'
      });
    }

    // Validate general data
    if (!general.title || !general.subjectId || !general.gradeId) {
      return res.status(400).json({
        error: 'Title, subject, and grade are required',
        code: 'MISSING_GENERAL_FIELDS'
      });
    }

    // Validate assign data
    if (!assign.selectedSchools || assign.selectedSchools.length === 0) {
      return res.status(400).json({
        error: 'At least one school must be selected',
        code: 'NO_SCHOOLS'
      });
    }

    if (!assign.selectedGrades || assign.selectedGrades.length === 0) {
      return res.status(400).json({
        error: 'At least one grade must be selected',
        code: 'NO_GRADES'
      });
    }

    if (!assign.startDate) {
      return res.status(400).json({
        error: 'Start date is required',
        code: 'MISSING_START_DATE'
      });
    }

    // Automatically set times: start at 00:00, end at 23:59
    const startTime = assign.startTime || '00:00';
    const endTime = assign.endTime || '23:59';

    // Validate date logic (endDate is optional - if not provided, assessment is unlimited)
    if (assign.endDate) {
      const startDateTime = new Date(`${assign.startDate}T00:00:00`);
      const endDateTime = new Date(`${assign.endDate}T23:59:59`);
      if (endDateTime <= startDateTime) {
        return res.status(400).json({
          error: 'End date must be after start date',
          code: 'INVALID_DATE_RANGE'
        });
      }
    }

    // Get connection for transaction
    const connection = await getConnection();

    try {
      // Start transaction (must use query, not execute for transaction commands)
      await connection.query('START TRANSACTION');

      // Create assignment record
      // Start date: automatically set to 00:00:00
      const startDateTime = `${assign.startDate} ${startTime}:00`;
      // End date: if provided, set to 23:59:59; if not provided, set to NULL (unlimited)
      const endDateTime = assign.endDate ? `${assign.endDate} ${endTime}:00` : null;
      
      const [assignmentResult] = await connection.execute(`
        INSERT INTO assignments 
        (name, description, subject_id, grade_id, created_by, time_limit_minutes, 
         total_questions, is_active, is_published, question_sequence, option_sequence, difficulty_level, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        general.title,
        general.description || null,
        general.subjectId,
        general.gradeId,
        createdBy,
        general.timeLimitMinutes,
        general.questionCount,
        1, // is_active
        1, // is_published (published by default)
        general.questionSequence || 'fixed',
        general.optionSequence || 'fixed',
        general.difficultyLevel || 225,
        startDateTime,
        endDateTime
      ]);

      const assignmentId = assignmentResult.insertId;

      // For Standard mode, add questions to assignment_questions
      if (mode === 'Standard' && questions && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          await connection.execute(`
            INSERT INTO assignment_questions 
            (assignment_id, question_id, question_order, points)
            VALUES (?, ?, ?, ?)
          `, [assignmentId, questions[i], i + 1, 1.00]);
        }
      }

      // Create assignment_students records for each school-grade combination
      // First, get all students for selected schools and grades
      const placeholders = assign.selectedGrades.map(() => '?').join(',');
      const [students] = await connection.execute(`
        SELECT id FROM users 
        WHERE role = 'student' 
        AND school_id IN (${assign.selectedSchools.map(() => '?').join(',')})
        AND grade_id IN (${placeholders})
      `, [...assign.selectedSchools, ...assign.selectedGrades]);

      // Create assignment_students records
      // due_date: if endDate is provided, use it with 23:59:59; if not, set to NULL (unlimited)
      const dueDate = assign.endDate ? `${assign.endDate} ${endTime}:00` : null;
      for (const student of students) {
        await connection.execute(`
          INSERT INTO assignment_students 
          (assignment_id, student_id, assigned_by, due_date)
          VALUES (?, ?, ?, ?)
        `, [
          assignmentId,
          student.id,
          createdBy,
          dueDate
        ]);
      }

      // Commit transaction
      await connection.query('COMMIT');

      // Get created assignment with details
      const createdAssignment = await executeQuery(`
        SELECT 
          a.id,
          a.name,
          a.description,
          a.subject_id as subjectId,
          a.grade_id as gradeId,
          a.time_limit_minutes as timeLimitMinutes,
          a.total_questions as totalQuestions,
          a.is_active as isActive,
          a.is_published as isPublished,
          a.question_sequence as questionSequence,
          a.option_sequence as optionSequence,
          a.difficulty_level as difficultyLevel,
          a.created_at as createdAt,
          s.name as subjectName,
          g.display_name as gradeName
        FROM assignments a
        JOIN subjects s ON a.subject_id = s.id
        JOIN grades g ON a.grade_id = g.id
        WHERE a.id = ?
      `, [assignmentId]);

      res.status(201).json({
        success: true,
        assignment: createdAssignment[0],
        message: 'Assignment created successfully'
      });
    } catch (error) {
      // Rollback on error
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      // Release connection
      connection.release();
    }
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      error: 'Failed to create assignment',
      code: 'CREATE_ASSIGNMENT_ERROR',
      details: error.message
    });
  }
};

// Get all assignments
export const getAllAssignments = async (req, res) => {
  try {
    const assignments = await executeQuery(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.subject_id as subjectId,
        a.grade_id as gradeId,
        a.time_limit_minutes as timeLimitMinutes,
        a.total_questions as totalQuestions,
        a.is_active as isActive,
        a.is_published as isPublished,
        a.question_sequence as questionSequence,
        a.option_sequence as optionSequence,
        a.difficulty_level as difficultyLevel,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        s.name as subjectName,
        g.display_name as gradeName,
        u.username as createdByName,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM assignment_questions aq WHERE aq.assignment_id = a.id
          ) THEN 'Standard'
          ELSE 'Adaptive'
        END as mode
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      JOIN grades g ON a.grade_id = g.id
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `);

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      error: 'Failed to fetch assignments',
      code: 'FETCH_ASSIGNMENTS_ERROR'
    });
  }
};

// Get assignment by ID
export const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignments = await executeQuery(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.subject_id as subjectId,
        a.grade_id as gradeId,
        a.time_limit_minutes as timeLimitMinutes,
        a.total_questions as totalQuestions,
        a.is_active as isActive,
        a.is_published as isPublished,
        a.question_sequence as questionSequence,
        a.option_sequence as optionSequence,
        a.difficulty_level as difficultyLevel,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        s.name as subjectName,
        g.display_name as gradeName
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      JOIN grades g ON a.grade_id = g.id
      WHERE a.id = ?
    `, [id]);

    if (assignments.length === 0) {
      return res.status(404).json({
        error: 'Assignment not found',
        code: 'ASSIGNMENT_NOT_FOUND'
      });
    }

    // Get questions for this assignment
    const questions = await executeQuery(`
      SELECT 
        aq.id,
        aq.question_id as questionId,
        aq.question_order as questionOrder,
        aq.points,
        q.question_text as questionText,
        q.options,
        q.question_type as questionType,
        q.question_metadata as questionMetadata,
        q.correct_option_index as correctOptionIndex,
        q.correct_answer as correctAnswer,
        q.difficulty_level as difficultyLevel
      FROM assignment_questions aq
      JOIN questions q ON aq.question_id = q.id
      WHERE aq.assignment_id = ?
      ORDER BY aq.question_order ASC
    `, [id]);

    res.json({
      ...assignments[0],
      questions
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      error: 'Failed to fetch assignment',
      code: 'FETCH_ASSIGNMENT_ERROR'
    });
  }
};

// Update assignment
export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { general, questions, assign } = req.body;

    // Check if assignment exists
    const existing = await executeQuery('SELECT id FROM assignments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Assignment not found',
        code: 'ASSIGNMENT_NOT_FOUND'
      });
    }

    const connection = await getConnection();

    try {
      await connection.query('START TRANSACTION');

      // Update assignment
      if (general) {
        await connection.execute(`
          UPDATE assignments 
          SET name = ?, description = ?, subject_id = ?, grade_id = ?,
              time_limit_minutes = ?, total_questions = ?,
              question_sequence = ?, option_sequence = ?, difficulty_level = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          general.title,
          general.description || null,
          general.subjectId,
          general.gradeId,
          general.timeLimitMinutes,
          general.questionCount,
          general.questionSequence || 'fixed',
          general.optionSequence || 'fixed',
          general.difficultyLevel || 225,
          id
        ]);
      }

      // Update questions if provided (Standard mode)
      if (questions && Array.isArray(questions)) {
        // Delete existing questions
        await connection.execute('DELETE FROM assignment_questions WHERE assignment_id = ?', [id]);
        
        // Insert new questions
        for (let i = 0; i < questions.length; i++) {
          await connection.execute(`
            INSERT INTO assignment_questions 
            (assignment_id, question_id, question_order, points)
            VALUES (?, ?, ?, ?)
          `, [id, questions[i], i + 1, 1.00]);
        }
      }

      await connection.query('COMMIT');

      // Return updated assignment
      const updated = await executeQuery(`
        SELECT 
          a.id,
          a.name,
          a.description,
          a.subject_id as subjectId,
          a.grade_id as gradeId,
          a.time_limit_minutes as timeLimitMinutes,
          a.total_questions as totalQuestions,
          a.is_active as isActive,
          a.is_published as isPublished,
          a.question_sequence as questionSequence,
          a.option_sequence as optionSequence,
          a.difficulty_level as difficultyLevel,
          a.updated_at as updatedAt
        FROM assignments a
        WHERE a.id = ?
      `, [id]);

      res.json(updated[0]);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      error: 'Failed to update assignment',
      code: 'UPDATE_ASSIGNMENT_ERROR'
    });
  }
};

// Delete assignment
export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if assignment exists
    const existing = await executeQuery('SELECT id FROM assignments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Assignment not found',
        code: 'ASSIGNMENT_NOT_FOUND'
      });
    }

    const connection = await getConnection();

    try {
      await connection.query('START TRANSACTION');

      // Delete related records
      await connection.execute('DELETE FROM assignment_students WHERE assignment_id = ?', [id]);
      await connection.execute('DELETE FROM assignment_questions WHERE assignment_id = ?', [id]);
      await connection.execute('DELETE FROM assignments WHERE id = ?', [id]);

      await connection.query('COMMIT');

      res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      error: 'Failed to delete assignment',
      code: 'DELETE_ASSIGNMENT_ERROR'
    });
  }
};

// Get students who took an assignment and their assessment results
export const getAssignmentStudents = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if assignment exists
    const assignment = await executeQuery(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.subject_id as subjectId,
        a.grade_id as gradeId,
        s.name as subjectName,
        g.display_name as gradeName
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      JOIN grades g ON a.grade_id = g.id
      WHERE a.id = ?
    `, [id]);

    if (assignment.length === 0) {
      return res.status(404).json({
        error: 'Assignment not found',
        code: 'ASSIGNMENT_NOT_FOUND'
      });
    }

    // Get all students who took this assignment with their assessment results
    const students = await executeQuery(`
      SELECT 
        u.id as studentId,
        u.username,
        u.first_name as firstName,
        u.last_name as lastName,
        s.name as schoolName,
        g.display_name as gradeName,
        ast.assigned_at as assignedAt,
        ast.due_date as dueDate,
        ast.is_completed as isCompleted,
        ast.completed_at as completedAt,
        ass.id as assessmentId,
        ass.rit_score as ritScore,
        ass.correct_answers as correctAnswers,
        ass.total_questions as totalQuestions,
        ass.date_taken as dateTaken,
        ass.duration_minutes as durationMinutes
      FROM assignment_students ast
      JOIN users u ON ast.student_id = u.id
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      LEFT JOIN assessments ass ON ass.assignment_id = ast.assignment_id 
        AND ass.student_id = u.id 
        AND ass.rit_score IS NOT NULL
      WHERE ast.assignment_id = ?
      ORDER BY 
        CASE WHEN ass.date_taken IS NOT NULL THEN 0 ELSE 1 END,
        ass.date_taken DESC,
        u.first_name, u.last_name, u.username
    `, [id]);

    res.json({
      assignment: assignment[0],
      students: students
    });
  } catch (error) {
    console.error('Error fetching assignment students:', error);
    res.status(500).json({
      error: 'Failed to fetch assignment students',
      code: 'FETCH_ASSIGNMENT_STUDENTS_ERROR'
    });
  }
};