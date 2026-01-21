import { executeQuery } from '../config/database.js';
import { activeSessions } from './studentController.js';

// Get assignments assigned to the current student
export const getStudentAssignments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Get student's school and grade
    const studentInfo = await executeQuery(
      'SELECT school_id, grade_id FROM users WHERE id = ?',
      [studentId]
    );

    if (studentInfo.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    const studentSchoolId = studentInfo[0].school_id;
    const studentGradeId = studentInfo[0].grade_id;

    // Get assignments assigned to this student
    // Check if assignment is published, active, and within date range
    const assignments = await executeQuery(`
      SELECT DISTINCT
        a.id,
        a.name,
        a.description,
        a.subject_id as subjectId,
        a.grade_id as gradeId,
        a.time_limit_minutes as timeLimitMinutes,
        a.total_questions as totalQuestions,
        a.question_sequence as questionSequence,
        a.option_sequence as optionSequence,
        a.difficulty_level as difficultyLevel,
        a.start_date as startDate,
        a.end_date as endDate,
        s.name as subjectName,
        g.display_name as gradeName,
        ast.due_date as dueDate,
        ast.is_completed as isCompleted,
        ast.completed_at as completedAt,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM assignment_questions aq WHERE aq.assignment_id = a.id
          ) THEN 'Standard'
          ELSE 'Adaptive'
        END as mode
      FROM assignments a
      JOIN assignment_students ast ON a.id = ast.assignment_id
      JOIN subjects s ON a.subject_id = s.id
      JOIN grades g ON a.grade_id = g.id
      WHERE ast.student_id = ?
        AND a.is_active = 1
        AND a.is_published = 1
        AND (a.start_date IS NULL OR a.start_date <= NOW())
        AND (a.end_date IS NULL OR a.end_date >= NOW())
        AND (ast.due_date IS NULL OR ast.due_date >= NOW())
        AND ast.is_completed = 0
      ORDER BY a.created_at DESC
    `, [studentId]);

    // Also get assignments by school and grade (if not already assigned individually)
    const schoolGradeAssignments = await executeQuery(`
      SELECT DISTINCT
        a.id,
        a.name,
        a.description,
        a.subject_id as subjectId,
        a.grade_id as gradeId,
        a.time_limit_minutes as timeLimitMinutes,
        a.total_questions as totalQuestions,
        a.question_sequence as questionSequence,
        a.option_sequence as optionSequence,
        a.difficulty_level as difficultyLevel,
        a.start_date as startDate,
        a.end_date as endDate,
        s.name as subjectName,
        g.display_name as gradeName,
        NULL as dueDate,
        0 as isCompleted,
        NULL as completedAt,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM assignment_questions aq WHERE aq.assignment_id = a.id
          ) THEN 'Standard'
          ELSE 'Adaptive'
        END as mode
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      JOIN grades g ON a.grade_id = g.id
      WHERE a.is_active = 1
        AND a.is_published = 1
        AND a.grade_id = ?
        AND (a.start_date IS NULL OR a.start_date <= NOW())
        AND (a.end_date IS NULL OR a.end_date >= NOW())
        AND NOT EXISTS (
          SELECT 1 FROM assignment_students ast 
          WHERE ast.assignment_id = a.id AND ast.student_id = ?
        )
      ORDER BY a.created_at DESC
    `, [studentGradeId, studentId]);

    // Combine and deduplicate
    const allAssignments = [...assignments, ...schoolGradeAssignments];
    const uniqueAssignments = allAssignments.filter((assignment, index, self) =>
      index === self.findIndex(a => a.id === assignment.id)
    );

    res.json(uniqueAssignments);
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.status(500).json({
      error: 'Failed to fetch student assignments',
      code: 'FETCH_STUDENT_ASSIGNMENTS_ERROR'
    });
  }
};

// Get completed assignments with scores
export const getCompletedAssignments = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student's grade
    const studentInfo = await executeQuery(
      'SELECT grade_id FROM users WHERE id = ?',
      [studentId]
    );

    if (studentInfo.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    const studentGradeId = studentInfo[0].grade_id;

    // Get completed assignments with assessment scores (individually assigned)
    const completedAssignments = await executeQuery(`
      SELECT DISTINCT
        a.id,
        a.name,
        a.description,
        a.subject_id as subjectId,
        a.grade_id as gradeId,
        a.time_limit_minutes as timeLimitMinutes,
        a.total_questions as totalQuestions,
        s.name as subjectName,
        g.display_name as gradeName,
        ast.completed_at as completedAt,
        ass.id as assessmentId,
        ass.rit_score as score,
        ass.correct_answers as correctAnswers,
        ass.total_questions as assessmentTotalQuestions,
        ass.duration_minutes as durationMinutes,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM assignment_questions aq WHERE aq.assignment_id = a.id
          ) THEN 'Standard'
          ELSE 'Adaptive'
        END as mode
      FROM assignments a
      JOIN assignment_students ast ON a.id = ast.assignment_id
      JOIN subjects s ON a.subject_id = s.id
      JOIN grades g ON a.grade_id = g.id
      LEFT JOIN assessments ass ON ass.assignment_id = a.id AND ass.student_id = ? AND ass.rit_score IS NOT NULL
      WHERE ast.student_id = ?
        AND ast.is_completed = 1
        AND a.is_active = 1
      ORDER BY ast.completed_at DESC
    `, [studentId, studentId]);

    // Also get completed assignments by grade (if not individually assigned)
    // These are assignments where student completed an assessment but wasn't individually assigned
    const completedByGrade = await executeQuery(`
      SELECT DISTINCT
        a.id,
        a.name,
        a.description,
        a.subject_id as subjectId,
        a.grade_id as gradeId,
        a.time_limit_minutes as timeLimitMinutes,
        a.total_questions as totalQuestions,
        s.name as subjectName,
        g.display_name as gradeName,
        ass.date_taken as completedAt,
        ass.id as assessmentId,
        ass.rit_score as score,
        ass.correct_answers as correctAnswers,
        ass.total_questions as assessmentTotalQuestions,
        ass.duration_minutes as durationMinutes,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM assignment_questions aq WHERE aq.assignment_id = a.id
          ) THEN 'Standard'
          ELSE 'Adaptive'
        END as mode
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      JOIN grades g ON a.grade_id = g.id
      JOIN assessments ass ON ass.assignment_id = a.id AND ass.student_id = ?
      WHERE a.grade_id = ?
        AND a.is_active = 1
        AND ass.rit_score IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM assignment_students ast 
          WHERE ast.assignment_id = a.id AND ast.student_id = ?
        )
      ORDER BY ass.date_taken DESC
    `, [studentId, studentGradeId, studentId]);

    // Combine and deduplicate
    const allCompleted = [...completedAssignments, ...completedByGrade];
    const uniqueCompleted = allCompleted.filter((assignment, index, self) =>
      index === self.findIndex(a => a.id === assignment.id)
    );

    res.json(uniqueCompleted);
  } catch (error) {
    console.error('Error fetching completed assignments:', error);
    res.status(500).json({
      error: 'Failed to fetch completed assignments',
      code: 'FETCH_COMPLETED_ASSIGNMENTS_ERROR'
    });
  }
};

// Start a Standard assignment
export const startStandardAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const studentId = req.user.id;

    if (!assignmentId) {
      return res.status(400).json({
        error: 'Assignment ID is required',
        code: 'MISSING_ASSIGNMENT_ID'
      });
    }

    // Get assignment details
    const assignments = await executeQuery(`
      SELECT 
        a.id,
        a.name,
        a.subject_id as subjectId,
        a.grade_id as gradeId,
        a.time_limit_minutes as timeLimitMinutes,
        a.total_questions as totalQuestions,
        a.question_sequence as questionSequence,
        a.option_sequence as optionSequence,
        s.name as subjectName
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.id = ? AND a.is_active = 1 AND a.is_published = 1
    `, [assignmentId]);

    if (assignments.length === 0) {
      return res.status(404).json({
        error: 'Assignment not found or not available',
        code: 'ASSIGNMENT_NOT_FOUND'
      });
    }

    const assignment = assignments[0];

    // Check if student is assigned to this assignment
    const studentAssignment = await executeQuery(`
      SELECT id, is_completed, due_date
      FROM assignment_students
      WHERE assignment_id = ? AND student_id = ?
    `, [assignmentId, studentId]);

    // If not individually assigned, check if student's grade matches
    if (studentAssignment.length === 0) {
      const studentInfo = await executeQuery(
        'SELECT grade_id FROM users WHERE id = ?',
        [studentId]
      );
      if (studentInfo.length === 0 || studentInfo[0].grade_id !== assignment.gradeId) {
        return res.status(403).json({
          error: 'You are not assigned to this assessment',
          code: 'NOT_ASSIGNED'
        });
      }
    } else if (studentAssignment[0].is_completed) {
      return res.status(400).json({
        error: 'You have already completed this assessment',
        code: 'ALREADY_COMPLETED'
      });
    }

    // Check if due date has passed
    if (studentAssignment.length > 0 && studentAssignment[0].due_date) {
      const dueDate = new Date(studentAssignment[0].due_date);
      if (dueDate < new Date()) {
        return res.status(400).json({
          error: 'This assessment is past its due date',
          code: 'PAST_DUE_DATE'
        });
      }
    }

    // Get questions for this assignment in order
    const questions = await executeQuery(`
      SELECT 
        q.id,
        q.question_text as questionText,
        q.options,
        q.correct_option_index as correctOptionIndex,
        q.difficulty_level as difficultyLevel,
        aq.question_order as questionOrder,
        aq.points
      FROM assignment_questions aq
      JOIN questions q ON aq.question_id = q.id
      WHERE aq.assignment_id = ?
      ORDER BY aq.question_order ASC
    `, [assignmentId]);

    if (questions.length === 0) {
      return res.status(400).json({
        error: 'No questions found for this assignment',
        code: 'NO_QUESTIONS'
      });
    }

    // Create assessment record
    const currentYear = new Date().getFullYear();
    const assessmentResult = await executeQuery(`
      INSERT INTO assessments 
      (student_id, subject_id, grade_id, assessment_period, year, 
       total_questions, time_limit_minutes, assessment_mode, assignment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      studentId,
      assignment.subjectId,
      assignment.gradeId,
      'Fall', // Default period for assignments
      currentYear,
      assignment.totalQuestions,
      assignment.timeLimitMinutes,
      'Standard',
      assignmentId
    ]);

    const assessmentId = assessmentResult.insertId;

    // If option sequence is random, shuffle options for each question
    let questionsToReturn = questions.map(q => {
      let options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      let correctIndex = q.correctOptionIndex;

      if (assignment.optionSequence === 'random') {
        // Shuffle options but track correct answer
        const optionsWithIndex = options.map((opt, idx) => ({ opt, idx }));
        for (let i = optionsWithIndex.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
        }
        options = optionsWithIndex.map((item) => item.opt);
        correctIndex = optionsWithIndex.findIndex((item) => item.idx === correctIndex);
      }

      return {
        id: q.id,
        text: q.questionText,
        options: options,
        correctOptionIndex: correctIndex,
        difficultyLevel: q.difficultyLevel,
        questionOrder: q.questionOrder,
        points: q.points
      };
    });

    // If question sequence is random, shuffle questions
    if (assignment.questionSequence === 'random') {
      questionsToReturn = questionsToReturn.sort(() => Math.random() - 0.5);
      // Update question order after shuffling
      questionsToReturn = questionsToReturn.map((q, index) => ({
        ...q,
        questionOrder: index + 1
      }));
    }

    res.json({
      assessmentId,
      assignmentId: assignment.id,
      assignmentName: assignment.name,
      mode: 'Standard',
      timeLimitMinutes: assignment.timeLimitMinutes,
      question: questionsToReturn[0],
      questionNumber: 1,
      totalQuestions: questionsToReturn.length,
      allQuestions: questionsToReturn // Send all questions for Standard mode
    });
  } catch (error) {
    console.error('Error starting standard assignment:', error);
    res.status(500).json({
      error: 'Failed to start assignment',
      code: 'START_ASSIGNMENT_ERROR'
    });
  }
};

// Start an Adaptive assignment (uses existing adaptive logic but linked to assignment)
export const startAdaptiveAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const studentId = req.user.id;

    if (!assignmentId) {
      return res.status(400).json({
        error: 'Assignment ID is required',
        code: 'MISSING_ASSIGNMENT_ID'
      });
    }

    // Get assignment details
    const assignments = await executeQuery(`
      SELECT 
        a.id,
        a.name,
        a.subject_id as subjectId,
        a.grade_id as gradeId,
        a.time_limit_minutes as timeLimitMinutes,
        a.total_questions as totalQuestions,
        a.difficulty_level as difficultyLevel
      FROM assignments a
      WHERE a.id = ? AND a.is_active = 1 AND a.is_published = 1
    `, [assignmentId]);

    if (assignments.length === 0) {
      return res.status(404).json({
        error: 'Assignment not found or not available',
        code: 'ASSIGNMENT_NOT_FOUND'
      });
    }

    const assignment = assignments[0];

    // Check if student is assigned
    const studentAssignment = await executeQuery(`
      SELECT id, is_completed, due_date
      FROM assignment_students
      WHERE assignment_id = ? AND student_id = ?
    `, [assignmentId, studentId]);

    if (studentAssignment.length === 0) {
      const studentInfo = await executeQuery(
        'SELECT grade_id FROM users WHERE id = ?',
        [studentId]
      );
      if (studentInfo.length === 0 || studentInfo[0].grade_id !== assignment.gradeId) {
        return res.status(403).json({
          error: 'You are not assigned to this assessment',
          code: 'NOT_ASSIGNED'
        });
      }
    } else if (studentAssignment[0].is_completed) {
      return res.status(400).json({
        error: 'You have already completed this assessment',
        code: 'ALREADY_COMPLETED'
      });
    }

    // Use existing adaptive assessment logic
    // Import the adaptive logic from studentController
    const { findClosestQuestion } = await import('./studentController.js');
    
    // Get starting difficulty from assignment or previous assessment
    let startingDifficulty = assignment.difficultyLevel || 225;
    
    const previousAssessments = await executeQuery(`
      SELECT rit_score 
      FROM assessments 
      WHERE student_id = ? AND subject_id = ? AND year = ?
      ORDER BY date_taken DESC LIMIT 1
    `, [studentId, assignment.subjectId, new Date().getFullYear()]);

    if (previousAssessments.length > 0) {
      startingDifficulty = previousAssessments[0].rit_score;
    }

    // Get student's grade
    const studentInfo = await executeQuery(
      'SELECT grade_id FROM users WHERE id = ?',
      [studentId]
    );
    const studentGradeId = studentInfo[0]?.grade_id || assignment.gradeId;

    // Get first question
    const firstQuestion = await findClosestQuestion(
      startingDifficulty,
      null,
      assignment.subjectId,
      null,
      studentGradeId
    );

    if (!firstQuestion) {
      return res.status(404).json({
        error: 'No questions available for this assignment',
        code: 'NO_QUESTIONS_AVAILABLE'
      });
    }

    // Create assessment record
    const currentYear = new Date().getFullYear();
    const assessmentResult = await executeQuery(`
      INSERT INTO assessments 
      (student_id, subject_id, grade_id, assessment_period, year, 
       total_questions, time_limit_minutes, assessment_mode, assignment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      studentId,
      assignment.subjectId,
      assignment.gradeId,
      'Fall',
      currentYear,
      assignment.totalQuestions,
      assignment.timeLimitMinutes,
      'Adaptive',
      assignmentId
    ]);

    const assessmentId = assessmentResult.insertId;

    // Create session for Adaptive mode (required for submitAnswer to work)
    const sessionId = `${studentId}_${assignment.subjectId}_assignment_${assignmentId}`;
    activeSessions.set(sessionId, {
      assessmentId: assessmentId,
      studentId: studentId,
      subjectId: assignment.subjectId,
      period: 'Fall', // Default period for assignments
      currentDifficulty: firstQuestion.difficulty_level,
      questionCount: 0,
      maxQuestions: assignment.totalQuestions,
      timeLimitMinutes: assignment.timeLimitMinutes,
      currentRIT: 0,
      highestCorrectDifficulty: 0,
      usedQuestions: new Set(),
      startTime: Date.now(),
      startingDifficulty: startingDifficulty
    });

    // Parse options if needed
    let options = firstQuestion.options;
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (e) {
        options = [];
      }
    }

    res.json({
      assessmentId,
      assignmentId: assignment.id,
      assignmentName: assignment.name,
      mode: 'Adaptive',
      timeLimitMinutes: assignment.timeLimitMinutes,
      question: {
        id: firstQuestion.id,
        text: firstQuestion.question_text,
        options: options,
        questionNumber: 1,
        totalQuestions: assignment.totalQuestions
      }
    });
  } catch (error) {
    console.error('Error starting adaptive assignment:', error);
    res.status(500).json({
      error: 'Failed to start assignment',
      code: 'START_ASSIGNMENT_ERROR'
    });
  }
};
