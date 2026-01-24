import { executeQuery } from '../config/database.js';
import bcrypt from 'bcryptjs';

// Get all students
export const getStudents = async (req, res) => {
  try {
    const students = await executeQuery(`
      SELECT 
        u.id, 
        u.username, 
        u.first_name, 
        u.last_name,
        u.school_id,
        u.grade_id,
        s.name as school_name,
        g.display_name as grade_name
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.role = 'student'
      ORDER BY u.first_name, u.last_name, u.username
    `);
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      error: 'Failed to fetch students',
      code: 'FETCH_STUDENTS_ERROR'
    });
  }
};

// Get student growth data
export const getStudentGrowth = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    
    // Get student's school and grade information
    const studentInfo = await executeQuery(`
      SELECT u.school_id, u.grade_id, s.name as school_name, g.name as grade_name
      FROM users u
      JOIN schools s ON u.school_id = s.id
      JOIN grades g ON u.grade_id = g.id
      WHERE u.id = ?
    `, [studentId]);

    if (studentInfo.length === 0) {
      return res.status(404).json({
        error: 'Student information not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    const { school_id, grade_id, school_name, grade_name } = studentInfo[0];
    
    // Get subject name
    const subjectResult = await executeQuery('SELECT name FROM subjects WHERE id = ?', [subjectId]);
    if (subjectResult.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }
    const subjectName = subjectResult[0].name;

    // Get all assessments for this student and subject (student's Growth Metric progression)
    // Use window function to get only the latest assessment for each year+season combination
    const studentScores = await executeQuery(`
      SELECT 
        CONCAT(assessment_period, ' ', year) as period,
        year,
        assessment_period,
        rit_score,
        date_taken
      FROM (
        SELECT 
          assessment_period,
          year,
          rit_score,
          date_taken,
          ROW_NUMBER() OVER (
            PARTITION BY year, assessment_period 
            ORDER BY date_taken DESC, id DESC
          ) as rn
        FROM assessments 
        WHERE student_id = ? 
        AND subject_id = ? 
        AND rit_score IS NOT NULL
      ) ranked
      WHERE rn = 1
      ORDER BY year ASC, 
        CASE assessment_period 
          WHEN 'BOY' THEN 1 
          WHEN 'EOY' THEN 2 
        END ASC
    `, [studentId, subjectId]);

    // Get class averages for each period (filtered by school and grade)
    const classAverages = await executeQuery(`
      SELECT 
        CONCAT(a.assessment_period, ' ', a.year) as period,
        a.year,
        a.assessment_period,
        AVG(a.rit_score) as averageRITScore,
        COUNT(DISTINCT a.student_id) as studentCount
      FROM assessments a
      JOIN users u ON a.student_id = u.id
      WHERE a.subject_id = ? 
      AND a.rit_score IS NOT NULL
      AND u.school_id = ?
      AND u.grade_id = ?
      GROUP BY a.assessment_period, a.year
      ORDER BY a.year ASC, 
        CASE a.assessment_period 
          WHEN 'BOY' THEN 1 
          WHEN 'EOY' THEN 2 
        END ASC
    `, [subjectId, school_id, grade_id]);

    // Get district averages for each period (filtered by grade only, across all schools)
    const districtAverages = await executeQuery(`
      SELECT 
        CONCAT(a.assessment_period, ' ', a.year) as period,
        a.year,
        a.assessment_period,
        AVG(a.rit_score) as averageRITScore,
        COUNT(DISTINCT a.student_id) as studentCount
      FROM assessments a
      JOIN users u ON a.student_id = u.id
      WHERE a.subject_id = ? 
      AND a.rit_score IS NOT NULL
      AND u.grade_id = ?
      GROUP BY a.assessment_period, a.year
      ORDER BY a.year ASC, 
        CASE a.assessment_period 
          WHEN 'BOY' THEN 1 
          WHEN 'EOY' THEN 2 
        END ASC
    `, [subjectId, grade_id]);

    // Calculate student distribution by period and Growth Metric score ranges
    const periodDistributions = await executeQuery(`
      SELECT 
        a.assessment_period,
        a.year,
        COUNT(*) as total_students,
        SUM(CASE WHEN rit_score BETWEEN 100 AND 150 THEN 1 ELSE 0 END) as red_count,
        SUM(CASE WHEN rit_score BETWEEN 151 AND 200 THEN 1 ELSE 0 END) as orange_count,
        SUM(CASE WHEN rit_score BETWEEN 201 AND 250 THEN 1 ELSE 0 END) as yellow_count,
        SUM(CASE WHEN rit_score BETWEEN 251 AND 300 THEN 1 ELSE 0 END) as green_count,
        SUM(CASE WHEN rit_score BETWEEN 301 AND 350 THEN 1 ELSE 0 END) as blue_count
       FROM assessments a
      JOIN users u ON a.student_id = u.id
      WHERE a.subject_id = ? 
      AND a.rit_score IS NOT NULL
      AND u.school_id = ?
      AND u.grade_id = ?
      GROUP BY a.assessment_period, a.year
      ORDER BY a.year ASC, 
        CASE a.assessment_period 
          WHEN 'BOY' THEN 1 
          WHEN 'EOY' THEN 2 
        END ASC
    `, [subjectId, school_id, grade_id]);

    // Calculate percentages for each period
    const formattedDistributions = periodDistributions.map(period => ({
      period: `${period.assessment_period} ${period.year}`,
      year: period.year,
      assessmentPeriod: period.assessment_period,
      totalStudents: period.total_students,
      distributions: {
        red: Math.round((period.red_count / period.total_students) * 100),
        orange: Math.round((period.orange_count / period.total_students) * 100),
        yellow: Math.round((period.yellow_count / period.total_students) * 100),
        green: Math.round((period.green_count / period.total_students) * 100),
        blue: Math.round((period.blue_count / period.total_students) * 100)
      }
    }));

    res.json({
      subjectName,
      schoolName: school_name,
      gradeName: grade_name,
      studentScores: studentScores.map(score => ({
        period: score.period,
        year: score.year,
        assessmentPeriod: score.assessment_period,
        ritScore: score.rit_score,
        dateTaken: score.date_taken
      })),
      classAverages: classAverages.map(avg => ({
        period: avg.period,
        year: avg.year,
        assessmentPeriod: avg.assessment_period,
        averageRITScore: Math.round(avg.averageRITScore),
        studentCount: avg.studentCount
      })),
      districtAverages: districtAverages.map(avg => ({
        period: avg.period,
        year: avg.year,
        assessmentPeriod: avg.assessment_period,
        averageRITScore: Math.round(avg.averageRITScore),
        studentCount: avg.studentCount
      })),
      periodDistributions: formattedDistributions,
      totalAssessments: studentScores.length
    });

  } catch (error) {
    console.error('Error fetching student growth:', error);
    res.status(500).json({
      error: 'Failed to fetch student growth data',
      code: 'FETCH_GROWTH_ERROR'
    });
  }
};

// Get admin statistics
export const getAdminStats = async (req, res) => {
  try {
    // Get total questions
    const totalQuestionsResult = await executeQuery('SELECT COUNT(*) as count FROM questions');
    const totalQuestions = totalQuestionsResult[0].count;

    // Get total students
    const totalStudentsResult = await executeQuery("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const totalStudents = totalStudentsResult[0].count;

    // Get total assessments
    const totalAssessmentsResult = await executeQuery('SELECT COUNT(*) as count FROM assessments WHERE rit_score IS NOT NULL');
    const totalAssessments = totalAssessmentsResult[0].count;

    // Get difficulty distribution
    const difficultyDistribution = await executeQuery(`
      SELECT 
        CASE 
          WHEN difficulty_level BETWEEN 100 AND 150 THEN '100-150'
          WHEN difficulty_level BETWEEN 151 AND 200 THEN '151-200'
          WHEN difficulty_level BETWEEN 201 AND 250 THEN '201-250'
          WHEN difficulty_level BETWEEN 251 AND 300 THEN '251-300'
          WHEN difficulty_level BETWEEN 301 AND 350 THEN '301-350'
        END as difficulty_range,
        COUNT(*) as count
      FROM questions 
      GROUP BY 
        CASE 
          WHEN difficulty_level BETWEEN 100 AND 150 THEN '100-150'
          WHEN difficulty_level BETWEEN 151 AND 200 THEN '151-200'
          WHEN difficulty_level BETWEEN 201 AND 250 THEN '201-250'
          WHEN difficulty_level BETWEEN 251 AND 300 THEN '251-300'
          WHEN difficulty_level BETWEEN 301 AND 350 THEN '301-350'
        END
      ORDER BY difficulty_range
    `);

    // Get subject distribution
    const subjectDistribution = await executeQuery(`
      SELECT 
        s.id,
        s.name,
        COUNT(q.id) as question_count
      FROM subjects s
      LEFT JOIN questions q ON s.id = q.subject_id
      GROUP BY s.id, s.name
      ORDER BY s.name
    `);

    // Get performance by grade (average RIT score as percentage)
    const gradePerformance = await executeQuery(`
      SELECT 
        g.id,
        g.display_name,
        g.grade_level,
        COALESCE(AVG(a.rit_score), 0) as average_rit_score,
        COUNT(DISTINCT a.id) as assessment_count,
        COUNT(DISTINCT u.id) as student_count
      FROM grades g
      LEFT JOIN users u ON g.id = u.grade_id AND u.role = 'student'
      LEFT JOIN assessments a ON u.id = a.student_id AND a.rit_score IS NOT NULL
      WHERE g.is_active = 1
      GROUP BY g.id, g.display_name, g.grade_level
      ORDER BY COALESCE(g.grade_level, 999), g.display_name
    `);

    // Calculate performance percentage (normalize RIT scores to 0-100 scale)
    // Assuming RIT scores range from 100-350, we'll normalize to percentage
    const gradePerformanceWithPercentage = gradePerformance.map((grade) => {
      const avgRit = grade.average_rit_score || 0;
      // Normalize RIT score (100-350 range) to percentage (0-100)
      // If no assessments, return 0
      let percentage = 0;
      if (avgRit > 0) {
        // Normalize: (rit - 100) / (350 - 100) * 100
        percentage = Math.max(0, Math.min(100, ((avgRit - 100) / 250) * 100));
      }
      return {
        id: grade.id,
        display_name: grade.display_name,
        grade_level: grade.grade_level,
        average_rit_score: avgRit,
        performance_percentage: Math.round(percentage),
        assessment_count: grade.assessment_count,
        student_count: grade.student_count
      };
    });

    res.json({
      totalQuestions,
      totalStudents,
      totalAssessments,
      difficultyDistribution,
      subjectDistribution,
      gradePerformance: gradePerformanceWithPercentage
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      error: 'Failed to fetch admin statistics',
      code: 'FETCH_STATS_ERROR'
    });
  }
};

// Get top performing students
export const getTopPerformers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    // Get top performing students with their highest scores and school names
    // First get the highest score per student
    const topPerformers = await executeQuery(`
      SELECT 
        u.id as student_id,
        u.username,
        u.first_name,
        u.last_name,
        s.name as school_name,
        MAX(a.rit_score) as highest_score,
        (
          SELECT sub.name 
          FROM assessments a2
          JOIN subjects sub ON a2.subject_id = sub.id
          WHERE a2.student_id = u.id 
          AND a2.rit_score = MAX(a.rit_score)
          LIMIT 1
        ) as subject_name,
        (
          SELECT a2.date_taken
          FROM assessments a2
          WHERE a2.student_id = u.id 
          AND a2.rit_score = MAX(a.rit_score)
          ORDER BY a2.date_taken DESC
          LIMIT 1
        ) as date_taken
      FROM assessments a
      JOIN users u ON a.student_id = u.id
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE a.rit_score IS NOT NULL
      AND u.role = 'student'
      GROUP BY u.id, u.username, u.first_name, u.last_name, s.name
      ORDER BY highest_score DESC, date_taken DESC
      LIMIT ?
    `, [limit]);

    // Format the response
    const formatted = topPerformers.map((performer) => ({
      studentId: performer.student_id,
      studentName: `${performer.first_name || ''} ${performer.last_name || ''}`.trim() || performer.username,
      schoolName: performer.school_name || 'Unknown School',
      highestScore: performer.highest_score,
      subjectName: performer.subject_name || 'Unknown Subject',
      dateTaken: performer.date_taken
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      error: 'Failed to fetch top performers',
      code: 'FETCH_TOP_PERFORMERS_ERROR'
    });
  }
};

// Create bulk questions
export const createBulkQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    const userId = req.user.id;

    const createdQuestions = [];

    for (const questionData of questions) {
      const { subjectId, questionText, options, correctOptionIndex, difficultyLevel } = questionData;

      // Convert options to array if it's a string
      let optionsArray = options;
      if (typeof options === 'string') {
        optionsArray = options.split(',').map(opt => opt.trim());
      }

      // Validate correct option index
      if (correctOptionIndex < 0 || correctOptionIndex >= optionsArray.length) {
        return res.status(400).json({
          error: `Invalid correct option index for question: ${questionText}`,
          code: 'INVALID_CORRECT_OPTION'
        });
      }

      // Check if subject exists
      const subjects = await executeQuery(
        'SELECT id FROM subjects WHERE id = ?',
        [subjectId]
      );

      if (subjects.length === 0) {
        return res.status(404).json({
          error: `Subject not found for question: ${questionText}`,
          code: 'SUBJECT_NOT_FOUND'
        });
      }

      // Insert question
      const result = await executeQuery(
        'INSERT INTO questions (subject_id, question_text, options, correct_option_index, difficulty_level, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [subjectId, questionText, JSON.stringify(optionsArray), correctOptionIndex, difficultyLevel, userId]
      );

      // Get created question
      const questions = await executeQuery(
        'SELECT id, subject_id, question_text, options, correct_option_index, difficulty_level, created_at FROM questions WHERE id = ?',
        [result.insertId]
      );

      const question = questions[0];
      if (typeof question.options === 'string') {
        try {
          question.options = JSON.parse(question.options);
        } catch (parseError) {
          console.error('Error parsing options JSON:', parseError);
          question.options = [];
        }
      }

      createdQuestions.push({
        id: question.id,
        subjectId: question.subject_id,
        questionText: question.question_text,
        options: question.options,
        correctOptionIndex: question.correct_option_index,
        difficultyLevel: question.difficulty_level,
        createdAt: question.created_at
      });
    }

    res.status(201).json({
      message: `Successfully created ${createdQuestions.length} questions`,
      questions: createdQuestions
    });

  } catch (error) {
    console.error('Error creating bulk questions:', error);
    res.status(500).json({
      error: 'Failed to create questions',
      code: 'CREATE_BULK_QUESTIONS_ERROR'
    });
  }
};

// Create new question
export const createQuestion = async (req, res) => {
  try {
    const { subjectId, gradeId, questionText, options, correctOptionIndex, difficultyLevel, dokLevel, competencies, questionType, correctAnswer, questionMetadata } = req.body;

    // Default to MCQ if not specified
    const qType = questionType || 'MCQ';

    // Handle options format - convert string to array if needed
    let optionsArray = options;
    if (qType === 'MCQ' || qType === 'MultipleSelect') {
      if (typeof options === 'string') {
        optionsArray = options.split(',').map(option => option.trim());
      } else if (!Array.isArray(options)) {
        return res.status(400).json({
          error: 'Options must be an array or comma-separated string',
          code: 'INVALID_OPTIONS_FORMAT'
        });
      }

      // Validate correct option index for MCQ
      if (qType === 'MCQ') {
        if (correctOptionIndex < 0 || correctOptionIndex >= optionsArray.length) {
          return res.status(400).json({
            error: 'Invalid correct option index',
            code: 'INVALID_OPTION_INDEX'
          });
        }
      } else if (qType === 'MultipleSelect') {
        // For MultipleSelect, validate correctAnswer is a JSON array of indices
        if (!correctAnswer) {
          return res.status(400).json({
            error: 'For MultipleSelect questions, correctAnswer must be a JSON array of correct option indices',
            code: 'INVALID_MULTIPLE_SELECT_ANSWER'
          });
        }
        let correctIndices;
        try {
          correctIndices = JSON.parse(correctAnswer);
          if (!Array.isArray(correctIndices) || correctIndices.length === 0) {
            return res.status(400).json({
              error: 'correctAnswer must be a non-empty array of indices',
              code: 'INVALID_MULTIPLE_SELECT_ANSWER'
            });
          }
          // Validate all indices are within range
          for (const idx of correctIndices) {
            if (idx < 0 || idx >= optionsArray.length) {
              return res.status(400).json({
                error: `Invalid correct answer index: ${idx}`,
                code: 'INVALID_OPTION_INDEX'
              });
            }
          }
        } catch (e) {
          return res.status(400).json({
            error: 'correctAnswer must be a valid JSON array',
            code: 'INVALID_MULTIPLE_SELECT_ANSWER'
          });
        }
      }
    } else if (qType === 'TrueFalse') {
      // For True/False, options are always ['True', 'False']
      optionsArray = ['True', 'False'];
      
      // Validate correctAnswer
      if (!correctAnswer || (correctAnswer !== 'true' && correctAnswer !== 'false')) {
        return res.status(400).json({
          error: 'For True/False questions, correctAnswer must be "true" or "false"',
          code: 'INVALID_TRUE_FALSE_ANSWER'
        });
      }
    } else if (qType === 'FillInBlank') {
      // For FillInBlank, validate questionMetadata contains blanks structure
      if (!questionMetadata) {
        return res.status(400).json({
          error: 'For FillInBlank questions, questionMetadata with blanks structure is required',
          code: 'MISSING_FILLINBLANK_METADATA'
        });
      }
      
      let metadata;
      try {
        metadata = typeof questionMetadata === 'string' ? JSON.parse(questionMetadata) : questionMetadata;
        if (!metadata.blanks || !Array.isArray(metadata.blanks) || metadata.blanks.length === 0) {
          return res.status(400).json({
            error: 'questionMetadata must contain a non-empty blanks array',
            code: 'INVALID_FILLINBLANK_METADATA'
          });
        }
        
        // Validate each blank has options and correctIndex
        for (let i = 0; i < metadata.blanks.length; i++) {
          const blank = metadata.blanks[i];
          if (!blank.options || !Array.isArray(blank.options) || blank.options.length < 2) {
            return res.status(400).json({
              error: `Blank ${i + 1} must have at least 2 options`,
              code: 'INVALID_BLANK_OPTIONS'
            });
          }
          if (blank.correctIndex === undefined || blank.correctIndex < 0 || blank.correctIndex >= blank.options.length) {
            return res.status(400).json({
              error: `Blank ${i + 1} must have a valid correctIndex`,
              code: 'INVALID_BLANK_CORRECT_INDEX'
            });
          }
        }
      } catch (e) {
        return res.status(400).json({
          error: 'questionMetadata must be valid JSON',
          code: 'INVALID_METADATA_JSON'
        });
      }
      
        // Options array is empty for FillInBlank (options are in metadata)
        optionsArray = [];
      } else if (qType === 'Matching') {
        // For Matching, validate questionMetadata contains matching structure
        if (!questionMetadata) {
          return res.status(400).json({
            error: 'For Matching questions, questionMetadata with leftItems, rightItems, and correctPairs is required',
            code: 'MISSING_MATCHING_METADATA'
          });
        }
        
        let metadata;
        try {
          metadata = typeof questionMetadata === 'string' ? JSON.parse(questionMetadata) : questionMetadata;
          if (!metadata.leftItems || !Array.isArray(metadata.leftItems) || metadata.leftItems.length < 2) {
            return res.status(400).json({
              error: 'questionMetadata must contain a leftItems array with at least 2 items',
              code: 'INVALID_MATCHING_METADATA'
            });
          }
          if (!metadata.rightItems || !Array.isArray(metadata.rightItems) || metadata.rightItems.length < 2) {
            return res.status(400).json({
              error: 'questionMetadata must contain a rightItems array with at least 2 items',
              code: 'INVALID_MATCHING_METADATA'
            });
          }
          if (!metadata.correctPairs || !Array.isArray(metadata.correctPairs) || metadata.correctPairs.length === 0) {
            return res.status(400).json({
              error: 'questionMetadata must contain a non-empty correctPairs array',
              code: 'INVALID_MATCHING_METADATA'
            });
          }
          
          // Validate correctPairs structure
          for (let i = 0; i < metadata.correctPairs.length; i++) {
            const pair = metadata.correctPairs[i];
            if (typeof pair.left !== 'number' || typeof pair.right !== 'number') {
              return res.status(400).json({
                error: `Correct pair ${i + 1} must have numeric left and right indices`,
                code: 'INVALID_MATCHING_PAIR'
              });
            }
            if (pair.left < 0 || pair.left >= metadata.leftItems.length) {
              return res.status(400).json({
                error: `Correct pair ${i + 1} has invalid left index`,
                code: 'INVALID_MATCHING_PAIR'
              });
            }
            if (pair.right < 0 || pair.right >= metadata.rightItems.length) {
              return res.status(400).json({
                error: `Correct pair ${i + 1} has invalid right index`,
                code: 'INVALID_MATCHING_PAIR'
              });
            }
          }
        } catch (e) {
          return res.status(400).json({
            error: 'questionMetadata must be valid JSON',
            code: 'INVALID_METADATA_JSON'
          });
        }
        
        // Options array is empty for Matching
        optionsArray = [];
      }

    // Validate difficulty level (Growth Metric Score) - required for all question types
    if (difficultyLevel < 100 || difficultyLevel > 350) {
      return res.status(400).json({
        error: 'Growth Metric Score (Difficulty level) must be between 100 and 350',
        code: 'INVALID_DIFFICULTY_LEVEL'
      });
    }

    // Validate DOK level - only required for ShortAnswer and Essay
    if (qType === 'ShortAnswer' || qType === 'Essay') {
      if (dokLevel === undefined || dokLevel === null || !Number.isInteger(dokLevel) || dokLevel < 1 || dokLevel > 4) {
        return res.status(400).json({
          error: 'DOK level is required and must be an integer between 1 and 4 for Short Answer and Essay questions',
          code: 'INVALID_DOK_LEVEL'
        });
      }
    } else if (dokLevel !== undefined && dokLevel !== null) {
      // If DOK is provided for other question types, don't allow it
      return res.status(400).json({
        error: 'DOK level is only applicable to Short Answer and Essay questions',
        code: 'INVALID_DOK_LEVEL'
      });
    }

    // Check if subject exists
    const subjects = await executeQuery(
      'SELECT id FROM subjects WHERE id = ?',
      [subjectId]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Check if grade exists
    const grades = await executeQuery(
      'SELECT id FROM grades WHERE id = ?',
      [gradeId]
    );

    if (grades.length === 0) {
      return res.status(404).json({
        error: 'Grade not found',
        code: 'GRADE_NOT_FOUND'
      });
    }

    // Prepare correct_option_index and correct_answer based on question type
    let finalCorrectOptionIndex = correctOptionIndex;
    let finalCorrectAnswer = null;

    if (qType === 'TrueFalse') {
      // For True/False: 0 = True, 1 = False
      finalCorrectOptionIndex = correctAnswer === 'true' ? 0 : 1;
      finalCorrectAnswer = correctAnswer;
    } else if (qType === 'MCQ') {
      finalCorrectOptionIndex = correctOptionIndex;
      finalCorrectAnswer = null; // MCQ uses correct_option_index
    } else if (qType === 'MultipleSelect') {
      // For MultipleSelect: store first index in correct_option_index for backward compatibility
      // Store all correct indices as JSON in correct_answer
      if (!correctAnswer) {
        return res.status(400).json({
          error: 'For MultipleSelect questions, correctAnswer is required',
          code: 'MISSING_MULTIPLE_SELECT_ANSWER'
        });
      }
      const correctIndices = JSON.parse(correctAnswer);
      finalCorrectOptionIndex = correctIndices[0] || 0;
      finalCorrectAnswer = correctAnswer; // Already a JSON string from frontend
      
      // Debug logging
      console.log('MultipleSelect question creation:', {
        correctAnswer,
        correctIndices,
        finalCorrectOptionIndex,
        finalCorrectAnswer
      });
    } else if (qType === 'FillInBlank') {
      // For FillInBlank: store correct indices array in correct_answer
      // Store blanks structure in question_metadata
      if (!correctAnswer) {
        return res.status(400).json({
          error: 'For FillInBlank questions, correctAnswer (array of correct indices) is required',
          code: 'MISSING_FILLINBLANK_ANSWER'
        });
      }
      const correctIndices = JSON.parse(correctAnswer);
      finalCorrectOptionIndex = correctIndices[0] || 0; // First blank's correct index for backward compatibility
      finalCorrectAnswer = correctAnswer; // JSON array of correct indices for each blank
    } else if (qType === 'Matching') {
      // For Matching: store correct pairs in correct_answer
      // Store matching structure in question_metadata
      if (!correctAnswer) {
        return res.status(400).json({
          error: 'For Matching questions, correctAnswer (array of correct pairs) is required',
          code: 'MISSING_MATCHING_ANSWER'
        });
      }
      const correctPairs = JSON.parse(correctAnswer);
      finalCorrectOptionIndex = correctPairs[0]?.right || 0; // First pair's right index for backward compatibility
      finalCorrectAnswer = correctAnswer; // JSON array of correct pairs
    } else if (qType === 'ShortAnswer' || qType === 'Essay') {
      // For ShortAnswer and Essay, no automatic validation
      finalCorrectOptionIndex = 0; // Default for backward compatibility
      finalCorrectAnswer = null; // No correct answer (automatic grading by AI)
    }

    // Prepare questionMetadata for insertion
    let finalQuestionMetadata = null;
    if ((qType === 'FillInBlank' || qType === 'Matching' || qType === 'ShortAnswer' || qType === 'Essay') && questionMetadata) {
      finalQuestionMetadata = typeof questionMetadata === 'string' ? questionMetadata : JSON.stringify(questionMetadata);
    }

    // Insert question - only set dok_level for ShortAnswer and Essay
    const finalDokLevel = (qType === 'ShortAnswer' || qType === 'Essay') ? dokLevel : null;
    const result = await executeQuery(
      'INSERT INTO questions (subject_id, grade_id, question_text, question_type, options, correct_option_index, correct_answer, question_metadata, difficulty_level, dok_level, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [subjectId, gradeId, questionText, qType, JSON.stringify(optionsArray), finalCorrectOptionIndex, finalCorrectAnswer, finalQuestionMetadata, difficultyLevel, finalDokLevel, req.user.id]
    );
    
    // Verify the inserted data
    if (qType === 'MultipleSelect') {
      const verifyQuestion = await executeQuery(
        'SELECT correct_option_index, correct_answer FROM questions WHERE id = ?',
        [result.insertId]
      );
      console.log('MultipleSelect question inserted:', verifyQuestion[0]);
    }

    // Insert competency relationships if provided
    if (competencies && Array.isArray(competencies) && competencies.length > 0) {
      for (const comp of competencies) {
        await executeQuery(
          'INSERT INTO questions_competencies (question_id, competency_id, weight) VALUES (?, ?, ?)',
          [result.insertId, comp.id, 100]
        );
      }
    }

    // Get the created question
    const questions = await executeQuery(
      'SELECT id, subject_id, grade_id, question_text, question_type, options, correct_option_index, correct_answer, question_metadata, difficulty_level, dok_level, created_at FROM questions WHERE id = ?',
      [result.insertId]
    );

    const question = questions[0];
    if (typeof question.options === 'string') {
      try {
        question.options = JSON.parse(question.options);
      } catch (parseError) {
        console.error('Error parsing options JSON:', parseError);
        question.options = [];
      }
    }

    // Parse question_metadata if present
    let parsedMetadata = question.question_metadata;
    if (parsedMetadata && typeof parsedMetadata === 'string') {
      try {
        parsedMetadata = JSON.parse(parsedMetadata);
      } catch (e) {
        console.error('Error parsing question_metadata:', e);
        parsedMetadata = null;
      }
    }

    res.status(201).json({
      message: 'Question created successfully',
      question: {
        id: question.id,
        subjectId: question.subject_id,
        gradeId: question.grade_id,
        questionText: question.question_text,
        questionType: question.question_type,
        options: question.options,
        correctOptionIndex: question.correct_option_index,
        correctAnswer: question.correct_answer,
        questionMetadata: parsedMetadata,
        difficultyLevel: question.difficulty_level,
        dokLevel: question.dok_level,
        createdAt: question.created_at
      }
    });

  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      error: 'Failed to create question',
      code: 'CREATE_QUESTION_ERROR'
    });
  }
};

// Get single question by ID
export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question exists
    const questions = await executeQuery(`
      SELECT 
        q.id,
        q.subject_id,
        q.grade_id,
        q.question_text,
        q.question_type,
        q.options,
        q.correct_option_index,
        q.correct_answer,
        q.question_metadata,
        q.difficulty_level,
        q.dok_level,
        q.created_at,
        u.username as created_by_username,
        g.display_name as grade_name
      FROM questions q
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN grades g ON q.grade_id = g.id
      WHERE q.id = ?
    `, [id]);

    if (questions.length === 0) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    const question = questions[0];
    
    // Parse options JSON
    let parsedOptions = question.options;
    if (typeof question.options === 'string') {
      try {
        parsedOptions = JSON.parse(question.options);
      } catch (parseError) {
        console.error('Error parsing options JSON:', parseError);
        parsedOptions = [];
      }
    }

    // Get competency relationships
    const competencyRelationships = await executeQuery(`
      SELECT 
        c.id,
        c.code,
        c.name,
        qc.weight
      FROM questions_competencies qc
      JOIN competencies c ON qc.competency_id = c.id
      WHERE qc.question_id = ?
      ORDER BY qc.weight DESC
    `, [id]);

    // For True/False questions, set correctAnswer from correct_answer field
    let correctAnswer = question.correct_answer;
    if (question.question_type === 'TrueFalse' && !correctAnswer) {
      // Fallback: derive from correct_option_index (0 = True, 1 = False)
      correctAnswer = question.correct_option_index === 0 ? 'true' : 'false';
    } else if (question.question_type === 'MultipleSelect') {
      // For MultipleSelect, correctAnswer should already be a JSON string
      // If not, fallback to single index
      if (!correctAnswer) {
        correctAnswer = JSON.stringify([question.correct_option_index]);
      }
    }

    // Parse question_metadata if present
    let parsedMetadata = question.question_metadata;
    if (parsedMetadata && typeof parsedMetadata === 'string') {
      try {
        parsedMetadata = JSON.parse(parsedMetadata);
      } catch (e) {
        console.error('Error parsing question_metadata:', e);
        parsedMetadata = null;
      }
    }

    res.json({
      id: question.id,
      subjectId: question.subject_id,
      gradeId: question.grade_id,
      questionText: question.question_text,
      questionType: question.question_type || 'MCQ',
      options: parsedOptions,
      correctOptionIndex: question.correct_option_index,
      correctAnswer: correctAnswer,
      questionMetadata: parsedMetadata,
      difficultyLevel: question.difficulty_level,
      dokLevel: question.dok_level,
      competencies: competencyRelationships,
      createdAt: question.created_at,
      createdByUsername: question.created_by_username,
      gradeName: question.grade_name
    });

  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      error: 'Failed to fetch question',
      code: 'FETCH_QUESTION_ERROR'
    });
  }
};

// Get questions by subject with pagination
export const getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const gradeId = req.query.gradeId && req.query.gradeId !== 'null' ? parseInt(req.query.gradeId) : null;
    
    console.log(`Pagination params: page=${page}, limit=${limit}, offset=${offset}, gradeId=${gradeId}, raw gradeId from query: ${req.query.gradeId}`);

    // Check if subject exists
    const subjects = await executeQuery(
      'SELECT id FROM subjects WHERE id = ?',
      [subjectId]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Get total count of questions for this subject (with grade filter)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM questions q
      WHERE q.subject_id = ?
    `;
    let countParams = [subjectId];
    
    if (gradeId) {
      countQuery += ` AND q.grade_id = ?`;
      countParams.push(gradeId);
    }
    
    const countResult = await executeQuery(countQuery, countParams);

    const totalQuestions = countResult[0].total;
    const totalPages = Math.ceil(totalQuestions / limit);

    // Debug: Check what grades exist for this subject
    const gradeCheck = await executeQuery(`
      SELECT DISTINCT q.grade_id, g.display_name, COUNT(*) as question_count
      FROM questions q
      LEFT JOIN grades g ON q.grade_id = g.id
      WHERE q.subject_id = ?
      GROUP BY q.grade_id, g.display_name
      ORDER BY q.grade_id
    `, [subjectId]);
    
    console.log('Available grades for this subject:', gradeCheck);

    // Get questions with creator info and grade info (paginated with grade filter)
    let questionsQuery = `
      SELECT 
        q.id,
        q.subject_id,
        q.grade_id,
        q.question_text,
        q.question_type,
        q.options,
        q.correct_option_index,
        q.correct_answer,
        q.question_metadata,
        q.difficulty_level,
        q.dok_level,
        q.created_at,
        u.username as created_by_username,
        g.display_name as grade_name
      FROM questions q
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN grades g ON q.grade_id = g.id
      WHERE q.subject_id = ?
    `;
    let questionsParams = [subjectId];
    
    if (gradeId) {
      questionsQuery += ` AND q.grade_id = ?`;
      questionsParams.push(gradeId);
    }
    
    questionsQuery += ` ORDER BY q.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const questions = await executeQuery(questionsQuery, questionsParams);

    console.log(`Found ${questions.length} questions for subject ${subjectId} (page ${page})`);
    if (questions.length > 0) {
      console.log('First question:', questions[0]);
      console.log('Sample questions with grade info:');
      questions.slice(0, 3).forEach((q, i) => {
        console.log(`Question ${i + 1}: grade_id=${q.grade_id}, grade_name=${q.grade_name}`);
      });
    }

    // Parse options JSON and transform field names
    const formattedQuestions = questions.map(q => {
      let parsedOptions = q.options;
      if (typeof q.options === 'string') {
        try {
          parsedOptions = JSON.parse(q.options);
        } catch (parseError) {
          console.error('Error parsing options JSON:', parseError);
          parsedOptions = [];
        }
      }
      
      // For True/False questions, set correctAnswer from correct_answer field
      let correctAnswer = q.correct_answer;
      if (q.question_type === 'TrueFalse' && !correctAnswer) {
        // Fallback: derive from correct_option_index (0 = True, 1 = False)
        correctAnswer = q.correct_option_index === 0 ? 'true' : 'false';
      } else if (q.question_type === 'MultipleSelect') {
        // For MultipleSelect, correctAnswer should already be a JSON string
        // If not, fallback to single index
        if (!correctAnswer || correctAnswer === null) {
          // If correct_answer is NULL, try to construct from correct_option_index
          // But this shouldn't happen if the question was created correctly
          console.warn(`MultipleSelect question ${q.id} has no correct_answer, using fallback`);
          correctAnswer = JSON.stringify([q.correct_option_index]);
        }
        // Ensure it's a valid JSON string (it should already be from the database)
        // If it's already a string, keep it; if it's somehow an object, stringify it
        if (typeof correctAnswer !== 'string') {
          correctAnswer = JSON.stringify(correctAnswer);
        }
      }
      // Parse question_metadata if present
      let parsedMetadata = q.question_metadata;
      if (parsedMetadata && typeof parsedMetadata === 'string') {
        try {
          parsedMetadata = JSON.parse(parsedMetadata);
        } catch (e) {
          console.error('Error parsing question_metadata:', e);
          parsedMetadata = null;
        }
      }

      return {
        id: q.id,
        subjectId: q.subject_id,
        gradeId: q.grade_id,
        questionText: q.question_text,
        questionType: q.question_type || 'MCQ',
        options: parsedOptions,
        correctOptionIndex: q.correct_option_index,
        correctAnswer: correctAnswer,
        questionMetadata: parsedMetadata,
        difficultyLevel: q.difficulty_level,
        dokLevel: q.dok_level,
        createdBy: q.created_by,
        createdAt: q.created_at,
        createdByUsername: q.created_by_username,
        gradeName: q.grade_name
      };
    });

    res.json({
      questions: formattedQuestions,
      pagination: {
        currentPage: page,
        totalPages,
        totalQuestions,
        questionsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      error: 'Failed to fetch questions',
      code: 'FETCH_QUESTIONS_ERROR'
    });
  }
};

// Update question
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectId, gradeId, questionText, options, correctOptionIndex, difficultyLevel, dokLevel, competencies, questionType, correctAnswer, questionMetadata } = req.body;

    // Check if question exists and get current question type
    const existingQuestions = await executeQuery(
      'SELECT id, question_type FROM questions WHERE id = ?',
      [id]
    );

    if (existingQuestions.length === 0) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    const currentQuestionType = existingQuestions[0].question_type;
    const qType = questionType || currentQuestionType || 'MCQ';

    // Check if subject exists
    const subjects = await executeQuery(
      'SELECT id FROM subjects WHERE id = ?',
      [subjectId]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Check if grade exists
    const grades = await executeQuery(
      'SELECT id FROM grades WHERE id = ?',
      [gradeId]
    );

    if (grades.length === 0) {
      return res.status(404).json({
        error: 'Grade not found',
        code: 'GRADE_NOT_FOUND'
      });
    }

    // Handle options format based on question type
    let optionsArray = options;
    if (qType === 'MCQ' || qType === 'MultipleSelect') {
      if (typeof options === 'string') {
        optionsArray = options.split(',').map(option => option.trim());
      } else if (!Array.isArray(options)) {
        return res.status(400).json({
          error: 'Options must be an array or comma-separated string',
          code: 'INVALID_OPTIONS_FORMAT'
        });
      }

      // Validate correct option index for MCQ
      if (qType === 'MCQ') {
        if (correctOptionIndex < 0 || correctOptionIndex >= optionsArray.length) {
          return res.status(400).json({
            error: 'Invalid correct option index',
            code: 'INVALID_OPTION_INDEX'
          });
        }
      } else if (qType === 'MultipleSelect') {
        // For MultipleSelect, validate correctAnswer is a JSON array of indices
        if (!correctAnswer) {
          return res.status(400).json({
            error: 'For MultipleSelect questions, correctAnswer must be a JSON array of correct option indices',
            code: 'INVALID_MULTIPLE_SELECT_ANSWER'
          });
        }
        let correctIndices;
        try {
          correctIndices = JSON.parse(correctAnswer);
          if (!Array.isArray(correctIndices) || correctIndices.length === 0) {
            return res.status(400).json({
              error: 'correctAnswer must be a non-empty array of indices',
              code: 'INVALID_MULTIPLE_SELECT_ANSWER'
            });
          }
          // Validate all indices are within range
          for (const idx of correctIndices) {
            if (idx < 0 || idx >= optionsArray.length) {
              return res.status(400).json({
                error: `Invalid correct answer index: ${idx}`,
                code: 'INVALID_OPTION_INDEX'
              });
            }
          }
        } catch (e) {
          return res.status(400).json({
            error: 'correctAnswer must be a valid JSON array',
            code: 'INVALID_MULTIPLE_SELECT_ANSWER'
          });
        }
      }
    } else if (qType === 'TrueFalse') {
        optionsArray = ['True', 'False'];
        
        // Validate correctAnswer for True/False
        if (!correctAnswer || (correctAnswer !== 'true' && correctAnswer !== 'false')) {
          return res.status(400).json({
            error: 'For True/False questions, correctAnswer must be "true" or "false"',
            code: 'INVALID_TRUE_FALSE_ANSWER'
          });
        }
      } else if (qType === 'FillInBlank') {
        // For FillInBlank, validate questionMetadata contains blanks structure
        if (!questionMetadata) {
          return res.status(400).json({
            error: 'For FillInBlank questions, questionMetadata with blanks structure is required',
            code: 'MISSING_FILLINBLANK_METADATA'
          });
        }
        
        let metadata;
        try {
          metadata = typeof questionMetadata === 'string' ? JSON.parse(questionMetadata) : questionMetadata;
          if (!metadata.blanks || !Array.isArray(metadata.blanks) || metadata.blanks.length === 0) {
            return res.status(400).json({
              error: 'questionMetadata must contain a non-empty blanks array',
              code: 'INVALID_FILLINBLANK_METADATA'
            });
          }
          
          // Validate each blank has options and correctIndex
          for (let i = 0; i < metadata.blanks.length; i++) {
            const blank = metadata.blanks[i];
            if (!blank.options || !Array.isArray(blank.options) || blank.options.length < 2) {
              return res.status(400).json({
                error: `Blank ${i + 1} must have at least 2 options`,
                code: 'INVALID_BLANK_OPTIONS'
              });
            }
            if (blank.correctIndex === undefined || blank.correctIndex < 0 || blank.correctIndex >= blank.options.length) {
              return res.status(400).json({
                error: `Blank ${i + 1} must have a valid correctIndex`,
                code: 'INVALID_BLANK_CORRECT_INDEX'
              });
            }
          }
        } catch (e) {
          return res.status(400).json({
            error: 'questionMetadata must be valid JSON',
            code: 'INVALID_METADATA_JSON'
          });
        }
        
        // Options array is empty for FillInBlank
        optionsArray = [];
      } else if (qType === 'Matching') {
        // For Matching, validate questionMetadata contains matching structure
        if (!questionMetadata) {
          return res.status(400).json({
            error: 'For Matching questions, questionMetadata with leftItems, rightItems, and correctPairs is required',
            code: 'MISSING_MATCHING_METADATA'
          });
        }
        
        let metadata;
        try {
          metadata = typeof questionMetadata === 'string' ? JSON.parse(questionMetadata) : questionMetadata;
          if (!metadata.leftItems || !Array.isArray(metadata.leftItems) || metadata.leftItems.length < 2) {
            return res.status(400).json({
              error: 'questionMetadata must contain a leftItems array with at least 2 items',
              code: 'INVALID_MATCHING_METADATA'
            });
          }
          if (!metadata.rightItems || !Array.isArray(metadata.rightItems) || metadata.rightItems.length < 2) {
            return res.status(400).json({
              error: 'questionMetadata must contain a rightItems array with at least 2 items',
              code: 'INVALID_MATCHING_METADATA'
            });
          }
          if (!metadata.correctPairs || !Array.isArray(metadata.correctPairs) || metadata.correctPairs.length === 0) {
            return res.status(400).json({
              error: 'questionMetadata must contain a non-empty correctPairs array',
              code: 'INVALID_MATCHING_METADATA'
            });
          }
          
          // Validate correctPairs structure
          for (let i = 0; i < metadata.correctPairs.length; i++) {
            const pair = metadata.correctPairs[i];
            if (typeof pair.left !== 'number' || typeof pair.right !== 'number') {
              return res.status(400).json({
                error: `Correct pair ${i + 1} must have numeric left and right indices`,
                code: 'INVALID_MATCHING_PAIR'
              });
            }
            if (pair.left < 0 || pair.left >= metadata.leftItems.length) {
              return res.status(400).json({
                error: `Correct pair ${i + 1} has invalid left index`,
                code: 'INVALID_MATCHING_PAIR'
              });
            }
            if (pair.right < 0 || pair.right >= metadata.rightItems.length) {
              return res.status(400).json({
                error: `Correct pair ${i + 1} has invalid right index`,
                code: 'INVALID_MATCHING_PAIR'
              });
            }
          }
        } catch (e) {
          return res.status(400).json({
            error: 'questionMetadata must be valid JSON',
            code: 'INVALID_METADATA_JSON'
          });
        }
        
        // Options array is empty for Matching
        optionsArray = [];
      }

    // Validate difficulty level (Growth Metric Score) - required for all question types
    if (difficultyLevel < 100 || difficultyLevel > 350) {
      return res.status(400).json({
        error: 'Growth Metric Score (Difficulty level) must be between 100 and 350',
        code: 'INVALID_DIFFICULTY_LEVEL'
      });
    }

    // Validate DOK level - only required for ShortAnswer and Essay
    if (qType === 'ShortAnswer' || qType === 'Essay') {
      if (dokLevel === undefined || dokLevel === null || !Number.isInteger(dokLevel) || dokLevel < 1 || dokLevel > 4) {
        return res.status(400).json({
          error: 'DOK level is required and must be an integer between 1 and 4 for Short Answer and Essay questions',
          code: 'INVALID_DOK_LEVEL'
        });
      }
    } else if (dokLevel !== undefined && dokLevel !== null) {
      // If DOK is provided for other question types, don't allow it
      return res.status(400).json({
        error: 'DOK level is only applicable to Short Answer and Essay questions',
        code: 'INVALID_DOK_LEVEL'
      });
    }

    // Prepare correct_option_index and correct_answer based on question type
    let finalCorrectOptionIndex = correctOptionIndex;
    let finalCorrectAnswer = null;

    if (qType === 'TrueFalse') {
      // For True/False: 0 = True, 1 = False
      finalCorrectOptionIndex = correctAnswer === 'true' ? 0 : 1;
      finalCorrectAnswer = correctAnswer;
    } else if (qType === 'MCQ') {
      finalCorrectOptionIndex = correctOptionIndex;
      finalCorrectAnswer = null; // MCQ uses correct_option_index
    } else if (qType === 'MultipleSelect') {
      // For MultipleSelect: store first index in correct_option_index for backward compatibility
      // Store all correct indices as JSON in correct_answer
      const correctIndices = JSON.parse(correctAnswer);
      finalCorrectOptionIndex = correctIndices[0] || 0;
      finalCorrectAnswer = correctAnswer; // Already a JSON string
    } else if (qType === 'FillInBlank') {
      // For FillInBlank: store correct indices array in correct_answer
      // Store blanks structure in question_metadata
      if (!correctAnswer) {
        return res.status(400).json({
          error: 'For FillInBlank questions, correctAnswer (array of correct indices) is required',
          code: 'MISSING_FILLINBLANK_ANSWER'
        });
      }
      const correctIndices = JSON.parse(correctAnswer);
      finalCorrectOptionIndex = correctIndices[0] || 0; // First blank's correct index for backward compatibility
      finalCorrectAnswer = correctAnswer; // JSON array of correct indices for each blank
    } else if (qType === 'Matching') {
      // For Matching: store correct pairs in correct_answer
      // Store matching structure in question_metadata
      if (!correctAnswer) {
        return res.status(400).json({
          error: 'For Matching questions, correctAnswer (array of correct pairs) is required',
          code: 'MISSING_MATCHING_ANSWER'
        });
      }
      const correctPairs = JSON.parse(correctAnswer);
      finalCorrectOptionIndex = correctPairs[0]?.right || 0; // First pair's right index for backward compatibility
      finalCorrectAnswer = correctAnswer; // JSON array of correct pairs
    } else if (qType === 'ShortAnswer' || qType === 'Essay') {
      // For ShortAnswer and Essay, no automatic validation
      finalCorrectOptionIndex = 0; // Default for backward compatibility
      finalCorrectAnswer = null; // No correct answer (automatic grading by AI)
    }

    // Prepare questionMetadata for update
    let finalQuestionMetadata = null;
    if ((qType === 'FillInBlank' || qType === 'Matching' || qType === 'ShortAnswer' || qType === 'Essay') && questionMetadata) {
      finalQuestionMetadata = typeof questionMetadata === 'string' ? questionMetadata : JSON.stringify(questionMetadata);
    }

    // Update question - only set dok_level for ShortAnswer and Essay
    const finalDokLevel = (qType === 'ShortAnswer' || qType === 'Essay') ? dokLevel : null;
    await executeQuery(
      'UPDATE questions SET subject_id = ?, grade_id = ?, question_text = ?, question_type = ?, options = ?, correct_option_index = ?, correct_answer = ?, question_metadata = ?, difficulty_level = ?, dok_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subjectId, gradeId, questionText, qType, JSON.stringify(optionsArray), finalCorrectOptionIndex, finalCorrectAnswer, finalQuestionMetadata, difficultyLevel, finalDokLevel, id]
    );

    // Update competency relationships
    // First, remove existing relationships
    await executeQuery('DELETE FROM questions_competencies WHERE question_id = ?', [id]);
    
    // Then, insert new relationships if provided
    if (competencies && Array.isArray(competencies) && competencies.length > 0) {
      for (const comp of competencies) {
        await executeQuery(
          'INSERT INTO questions_competencies (question_id, competency_id, weight) VALUES (?, ?, ?)',
          [id, comp.id, 100]
        );
      }
    }

    // Get updated question
    const updatedQuestions = await executeQuery(`
      SELECT 
        q.id,
        q.subject_id,
        q.grade_id,
        q.question_text,
        q.question_type,
        q.options,
        q.correct_option_index,
        q.correct_answer,
        q.question_metadata,
        q.difficulty_level,
        q.dok_level,
        q.created_at,
        u.username as created_by_username,
        g.display_name as grade_name
      FROM questions q
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN grades g ON q.grade_id = g.id
      WHERE q.id = ?
    `, [id]);

    const question = updatedQuestions[0];
    if (typeof question.options === 'string') {
      try {
        question.options = JSON.parse(question.options);
      } catch (parseError) {
        console.error('Error parsing options JSON:', parseError);
        question.options = [];
      }
    }

    // Parse question_metadata if present
    let parsedMetadata = question.question_metadata;
    if (parsedMetadata && typeof parsedMetadata === 'string') {
      try {
        parsedMetadata = JSON.parse(parsedMetadata);
      } catch (e) {
        console.error('Error parsing question_metadata:', e);
        parsedMetadata = null;
      }
    }

    res.json({
      message: 'Question updated successfully',
      question: {
        id: question.id,
        subjectId: question.subject_id,
        gradeId: question.grade_id,
        questionText: question.question_text,
        questionType: question.question_type,
        options: question.options,
        correctOptionIndex: question.correct_option_index,
        correctAnswer: question.correct_answer,
        questionMetadata: parsedMetadata,
        difficultyLevel: question.difficulty_level,
        dokLevel: question.dok_level,
        createdAt: question.created_at,
        createdByUsername: question.created_by_username
      }
    });

  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      error: 'Failed to update question',
      code: 'UPDATE_QUESTION_ERROR'
    });
  }
};

// Debug endpoint to check all questions
export const debugQuestions = async (req, res) => {
  try {
    const questions = await executeQuery(`
      SELECT 
        q.id,
        q.subject_id,
        q.question_text,
        q.options,
        q.correct_option_index,
        q.difficulty_level,
        s.name as subject_name
      FROM questions q
      JOIN subjects s ON q.subject_id = s.id
      ORDER BY q.subject_id, q.id
    `);

    res.json({
      totalQuestions: questions.length,
      questions: questions.map(q => ({
        ...q,
        options: (() => {
          if (typeof q.options === 'string') {
            try {
              return JSON.parse(q.options);
            } catch (parseError) {
              return [];
            }
          }
          return q.options;
        })()
      }))
    });

  } catch (error) {
    console.error('Error in debug questions:', error);
    res.status(500).json({
      error: 'Failed to fetch debug questions',
      code: 'DEBUG_QUESTIONS_ERROR'
    });
  }
};

// Delete question
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question exists
    const questions = await executeQuery(
      'SELECT id FROM questions WHERE id = ?',
      [id]
    );

    if (questions.length === 0) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    // Check if question is used in assessments
    const responses = await executeQuery(
      'SELECT id FROM assessment_responses WHERE question_id = ? LIMIT 1',
      [id]
    );

    if (responses.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete question that has been used in assessments',
        code: 'QUESTION_USED_IN_ASSESSMENTS'
      });
    }

    // Delete question
    await executeQuery('DELETE FROM questions WHERE id = ?', [id]);

    res.json({
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      error: 'Failed to delete question',
      code: 'DELETE_QUESTION_ERROR'
    });
  }
};

// Create new student (admin only)
export const createStudent = async (req, res) => {
  try {
    const { username, password, firstName, lastName, schoolId, gradeId } = req.body;

    // Check if username already exists
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Username already exists',
        code: 'USERNAME_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new student
    const result = await executeQuery(
      'INSERT INTO users (username, password, first_name, last_name, role, school_id, grade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, firstName, lastName, 'student', schoolId, gradeId]
    );

    // Get the created student with school and grade info
    const newStudents = await executeQuery(`
      SELECT 
        u.id, u.username, u.first_name, u.last_name, u.role, u.created_at,
        s.name as school_name, s.id as school_id,
        g.display_name as grade_name, g.id as grade_id, g.grade_level
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Student created successfully',
      student: newStudents[0]
    });

  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      error: 'Failed to create student',
      code: 'CREATE_STUDENT_ERROR'
    });
  }
};

// Update student (admin only)
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, schoolId, gradeId, password } = req.body;

    // Check if student exists
    const existingStudents = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "student"',
      [id]
    );

    if (existingStudents.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    // Build update query
    let updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, school_id = ?, grade_id = ?';
    let queryParams = [firstName, lastName, schoolId, gradeId];

    // Add password update if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      queryParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(id);

    // Update student
    await executeQuery(updateQuery, queryParams);

    // Get updated student with school and grade info
    const updatedStudents = await executeQuery(`
      SELECT 
        u.id, u.username, u.first_name, u.last_name, u.role, u.created_at,
        s.name as school_name, s.id as school_id,
        g.display_name as grade_name, g.id as grade_id, g.grade_level
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.id = ?
    `, [id]);

    res.json({
      message: 'Student updated successfully',
      student: updatedStudents[0]
    });

  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      error: 'Failed to update student',
      code: 'UPDATE_STUDENT_ERROR'
    });
  }
};

// Delete student (admin only)
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student exists
    const existingStudents = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "student"',
      [id]
    );

    if (existingStudents.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    // Check if student has assessments
    const assessments = await executeQuery(
      'SELECT id FROM assessments WHERE student_id = ? LIMIT 1',
      [id]
    );

    if (assessments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete student with existing assessments',
        code: 'STUDENT_HAS_ASSESSMENTS'
      });
    }

    // Delete student
    await executeQuery('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      error: 'Failed to delete student',
      code: 'DELETE_STUDENT_ERROR'
    });
  }
};

// Get students by school and grade
export const getStudentsBySchoolAndGrade = async (req, res) => {
  try {
    const { schoolId, gradeId } = req.params;

    const students = await executeQuery(`
      SELECT 
        u.id, 
        u.username, 
        u.first_name, 
        u.last_name, 
        u.role, 
        u.created_at,
        s.name as school_name, 
        s.id as school_id,
        g.display_name as grade_name, 
        g.id as grade_id, 
        g.grade_level
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.role = 'student'
      AND u.school_id = ?
      AND u.grade_id = ?
      ORDER BY u.first_name, u.last_name, u.username
    `, [schoolId, gradeId]);

    res.json(students);
  } catch (error) {
    console.error('Error fetching students by school and grade:', error);
    res.status(500).json({
      error: 'Failed to fetch students',
      code: 'FETCH_STUDENTS_ERROR'
    });
  }
};

// Performance Analytics Functions
export const getSubjectPerformanceDashboard = async (req, res) => {
  try {
    const { schoolId, gradeId, year } = req.query;
    
    // Build where clause
    let whereClause = 'WHERE a.rit_score IS NOT NULL';
    let params = [];
    
    if (schoolId) {
      whereClause += ' AND u.school_id = ?';
      params.push(schoolId);
    }
    if (gradeId) {
      whereClause += ' AND u.grade_id = ?';
      params.push(gradeId);
    }
    if (year) {
      // Try both year column and created_at year
      whereClause += ' AND (a.year = ? OR YEAR(a.created_at) = ?)';
      params.push(year, year);
    }

    let subjectPerformance = [];
    let growthRates = [];
    let yearTrends = [];

    // Debug: Check what assessment periods exist
    try {
      const periodCheck = await executeQuery(`
        SELECT DISTINCT assessment_period, COUNT(*) as count 
        FROM assessments 
        WHERE rit_score IS NOT NULL 
        GROUP BY assessment_period
      `);
      console.log('Available assessment periods:', periodCheck);
    } catch (e) {
      console.log('Could not check assessment periods:', e.message);
    }

    try {
      // Get average scores by subject
      subjectPerformance = await executeQuery(`
        SELECT 
          s.id as subject_id,
          s.name as subject_name,
          AVG(a.rit_score) as average_rit_score,
          COUNT(DISTINCT a.student_id) as student_count,
          MIN(a.rit_score) as min_score,
          MAX(a.rit_score) as max_score,
          IFNULL(STDDEV_POP(a.rit_score), 0) as standard_deviation
        FROM assessments a
        JOIN users u ON a.student_id = u.id
        JOIN subjects s ON a.subject_id = s.id
        ${whereClause}
        GROUP BY s.id, s.name
        HAVING AVG(a.rit_score) > 0
        ORDER BY AVG(a.rit_score) DESC
      `, params);
      
      console.log(`Found ${subjectPerformance.length} subjects with performance data`);

      // Get growth rates - handle both BOY/EOY and Fall/Spring/Winter periods
      // Use subquery to avoid MySQL alias reference issues in HAVING/ORDER BY
      growthRates = await executeQuery(`
        SELECT 
          subject_id,
          subject_name,
          boy_avg,
          eoy_avg,
          student_count,
          (eoy_avg - boy_avg) as growth
        FROM (
          SELECT 
            s.id as subject_id,
            s.name as subject_name,
            AVG(CASE 
              WHEN a.assessment_period IN ('BOY', 'Fall') THEN a.rit_score 
              ELSE NULL 
            END) as boy_avg,
            AVG(CASE 
              WHEN a.assessment_period IN ('EOY', 'Spring') THEN a.rit_score 
              ELSE NULL 
            END) as eoy_avg,
            COUNT(DISTINCT a.student_id) as student_count
          FROM assessments a
          JOIN users u ON a.student_id = u.id
          JOIN subjects s ON a.subject_id = s.id
          ${whereClause}
          GROUP BY s.id, s.name
        ) as subquery
        WHERE boy_avg IS NOT NULL AND eoy_avg IS NOT NULL AND boy_avg > 0 AND eoy_avg > 0
        ORDER BY (eoy_avg - boy_avg) DESC
      `, params);

      // Get year-over-year trends - use year column if exists, otherwise use created_at
      yearTrends = await executeQuery(`
        SELECT 
          s.id as subject_id,
          s.name as subject_name,
          COALESCE(a.year, YEAR(a.created_at)) as year,
          AVG(a.rit_score) as average_rit_score,
          COUNT(DISTINCT a.student_id) as student_count
        FROM assessments a
        JOIN users u ON a.student_id = u.id
        JOIN subjects s ON a.subject_id = s.id
        ${whereClause}
        GROUP BY s.id, s.name, COALESCE(a.year, YEAR(a.created_at))
        HAVING AVG(a.rit_score) > 0
        ORDER BY s.name, COALESCE(a.year, YEAR(a.created_at))
      `, params);
      
      console.log(`Found ${growthRates.length} growth rate records and ${yearTrends.length} year trend records`);

    } catch (queryError) {
      console.error('Query error in getSubjectPerformanceDashboard:', queryError);
      console.error('Query error details:', {
        message: queryError.message,
        code: queryError.code,
        sqlState: queryError.sqlState,
        sqlMessage: queryError.sqlMessage,
        errno: queryError.errno
      });
      
      // Return empty arrays if query fails - don't throw 500 error
      subjectPerformance = [];
      growthRates = [];
      yearTrends = [];
    }

    // Always return success with data (even if empty)
    res.json({
      subjectPerformance: subjectPerformance || [],
      growthRates: growthRates || [],
      yearTrends: yearTrends || []
    });
  } catch (error) {
    console.error('Error in getSubjectPerformanceDashboard:', error);
    console.error('Full error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });
    
    // Return empty data instead of 500 error so frontend can still render
    res.json({
      subjectPerformance: [],
      growthRates: [],
      yearTrends: [],
      error: 'Failed to fetch data',
      message: error.message
    });
  }
};

export const getAchievementGapAnalysis = async (req, res) => {
  try {
    const { schoolId, gradeId, year } = req.query;
    
    let whereClause = 'WHERE a.rit_score IS NOT NULL';
    let params = [];
    
    if (schoolId) {
      whereClause += ' AND u.school_id = ?';
      params.push(schoolId);
    }
    if (gradeId) {
      whereClause += ' AND u.grade_id = ?';
      params.push(gradeId);
    }
    if (year) {
      whereClause += ' AND a.year = ?';
      params.push(year);
    }

    // Performance by school
    const schoolGaps = await executeQuery(`
      SELECT 
        s.id as school_id,
        s.name as school_name,
        AVG(a.rit_score) as average_rit_score,
        COUNT(DISTINCT a.student_id) as student_count,
        STDDEV_POP(a.rit_score) as standard_deviation
      FROM assessments a
      JOIN users u ON a.student_id = u.id
      JOIN schools s ON u.school_id = s.id
      ${whereClause}
      GROUP BY s.id, s.name
      ORDER BY average_rit_score DESC
    `, params);

    // Performance by grade
    const gradeGaps = await executeQuery(`
      SELECT 
        g.id as grade_id,
        g.display_name as grade_name,
        AVG(a.rit_score) as average_rit_score,
        COUNT(DISTINCT a.student_id) as student_count,
        STDDEV_POP(a.rit_score) as standard_deviation
      FROM assessments a
      JOIN users u ON a.student_id = u.id
      JOIN grades g ON u.grade_id = g.id
      ${whereClause}
      GROUP BY g.id, g.display_name
      ORDER BY average_rit_score DESC
    `, params);

    // Performance by subject
    const subjectGaps = await executeQuery(`
      SELECT 
        s.id as subject_id,
        s.name as subject_name,
        AVG(a.rit_score) as average_rit_score,
        COUNT(DISTINCT a.student_id) as student_count,
        STDDEV_POP(a.rit_score) as standard_deviation
      FROM assessments a
      JOIN users u ON a.student_id = u.id
      JOIN subjects s ON a.subject_id = s.id
      ${whereClause}
      GROUP BY s.id, s.name
      ORDER BY average_rit_score DESC
    `, params);

    res.json({
      schoolGaps,
      gradeGaps,
      subjectGaps
    });
  } catch (error) {
    console.error('Error in getAchievementGapAnalysis:', error);
    res.status(500).json({ error: 'Failed to fetch achievement gap data' });
  }
};

// Competency-Based Analytics Functions
export const getCompetencyMasteryReport = async (req, res) => {
  try {
    const { schoolId, gradeId, subjectId, year } = req.query;
    
    let whereClause = 'WHERE scs.final_score IS NOT NULL';
    let params = [];
    
    if (schoolId) {
      whereClause += ' AND u.school_id = ?';
      params.push(schoolId);
    }
    if (gradeId) {
      whereClause += ' AND u.grade_id = ?';
      params.push(gradeId);
    }
    if (subjectId) {
      whereClause += ' AND a.subject_id = ?';
      params.push(subjectId);
    }
    if (year) {
      whereClause += ' AND a.year = ?';
      params.push(year);
    }

    // Competency mastery by competency (latest assessment only)
    const competencyMastery = await executeQuery(`
      SELECT 
        c.id as competency_id,
        c.code as competency_code,
        c.name as competency_name,
        AVG(scs.final_score) as average_score,
        COUNT(DISTINCT scs.student_id) as student_count,
        SUM(CASE WHEN scs.final_score >= 75 THEN 1 ELSE 0 END) as proficient_count,
        SUM(CASE WHEN scs.final_score < 50 THEN 1 ELSE 0 END) as struggling_count,
        STDDEV_POP(scs.final_score) as standard_deviation
      FROM student_competency_scores scs
      JOIN assessments a ON scs.assessment_id = a.id
      JOIN users u ON a.student_id = u.id
      JOIN competencies c ON scs.competency_id = c.id
      JOIN (
        SELECT 
          student_id, 
          subject_id, 
          MAX(date_taken) as latest_date
        FROM assessments 
        WHERE rit_score IS NOT NULL
        GROUP BY student_id, subject_id
      ) latest_assessments ON a.student_id = latest_assessments.student_id 
        AND a.subject_id = latest_assessments.subject_id 
        AND a.date_taken = latest_assessments.latest_date
      ${whereClause}
      GROUP BY c.id, c.code, c.name
      ORDER BY average_score ASC
    `, params);

    // Competency mastery by school (overall average per school - latest assessment only)
    const schoolCompetencyMastery = await executeQuery(`
      SELECT 
        s.id as school_id,
        s.name as school_name,
        AVG(scs.final_score) as average_score,
        COUNT(DISTINCT scs.student_id) as student_count
      FROM student_competency_scores scs
      JOIN assessments a ON scs.assessment_id = a.id
      JOIN users u ON a.student_id = u.id
      JOIN schools s ON u.school_id = s.id
      JOIN (
        SELECT 
          student_id, 
          subject_id, 
          MAX(date_taken) as latest_date
        FROM assessments 
        WHERE rit_score IS NOT NULL
        GROUP BY student_id, subject_id
      ) latest_assessments ON a.student_id = latest_assessments.student_id 
        AND a.subject_id = latest_assessments.subject_id 
        AND a.date_taken = latest_assessments.latest_date
      ${whereClause}
      GROUP BY s.id, s.name
      ORDER BY s.name
    `, params);

    // Competency mastery by grade (overall average per grade - latest assessment only)
    const gradeCompetencyMastery = await executeQuery(`
      SELECT 
        g.id as grade_id,
        g.display_name as grade_name,
        AVG(scs.final_score) as average_score,
        COUNT(DISTINCT scs.student_id) as student_count
      FROM student_competency_scores scs
      JOIN assessments a ON scs.assessment_id = a.id
      JOIN users u ON a.student_id = u.id
      JOIN grades g ON u.grade_id = g.id
      JOIN (
        SELECT 
          student_id, 
          subject_id, 
          MAX(date_taken) as latest_date
        FROM assessments 
        WHERE rit_score IS NOT NULL
        GROUP BY student_id, subject_id
      ) latest_assessments ON a.student_id = latest_assessments.student_id 
        AND a.subject_id = latest_assessments.subject_id 
        AND a.date_taken = latest_assessments.latest_date
      ${whereClause}
      GROUP BY g.id, g.display_name
      ORDER BY g.display_name
    `, params);

    // Debug: Check what competencies exist
    const competencyCheck = await executeQuery(`
      SELECT id, code, name FROM competencies ORDER BY id
    `);
    console.log('Available competencies:', competencyCheck);
    
    console.log('Competency Mastery Data:', competencyMastery);
    console.log('School Competency Mastery Data:', schoolCompetencyMastery);
    console.log('Grade Competency Mastery Data:', gradeCompetencyMastery);
    
    res.json({
      competencyMastery,
      schoolCompetencyMastery,
      gradeCompetencyMastery
    });
  } catch (error) {
    console.error('Error in getCompetencyMasteryReport:', error);
    res.status(500).json({ error: 'Failed to fetch competency mastery data' });
  }
};

export const getCompetencyGrowthTracking = async (req, res) => {
  try {
    const { schoolId, gradeId, subjectId, competencyId } = req.query;
    
    let whereClause = 'WHERE scs.final_score IS NOT NULL';
    let params = [];
    
    if (schoolId) {
      whereClause += ' AND u.school_id = ?';
      params.push(schoolId);
    }
    if (gradeId) {
      whereClause += ' AND u.grade_id = ?';
      params.push(gradeId);
    }
    if (subjectId) {
      whereClause += ' AND a.subject_id = ?';
      params.push(subjectId);
    }
    if (competencyId) {
      whereClause += ' AND c.id = ?';
      params.push(competencyId);
    }

    // Competency growth over time
    const competencyGrowth = await executeQuery(`
      SELECT 
        c.id as competency_id,
        c.name as competency_name,
        a.assessment_period,
        a.year,
        AVG(scs.final_score) as average_score,
        COUNT(DISTINCT scs.student_id) as student_count
      FROM student_competency_scores scs
      JOIN assessments a ON scs.assessment_id = a.id
      JOIN users u ON a.student_id = u.id
      JOIN competencies c ON scs.competency_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name, a.assessment_period, a.year
      ORDER BY c.name, a.year, 
        CASE a.assessment_period 
          WHEN 'BOY' THEN 1 
          WHEN 'EOY' THEN 2 
        END
    `, params);

    // Competency correlation with overall Growth Metric scores
    const competencyCorrelation = await executeQuery(`
      SELECT 
        c.id as competency_id,
        c.name as competency_name,
        AVG(scs.final_score) as avg_competency_score,
        AVG(a.rit_score) as avg_rit_score,
        COUNT(DISTINCT scs.student_id) as student_count,
        CORR(scs.final_score, a.rit_score) as correlation_coefficient
      FROM student_competency_scores scs
      JOIN assessments a ON scs.assessment_id = a.id
      JOIN users u ON a.student_id = u.id
      JOIN competencies c ON scs.competency_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name
      ORDER BY ABS(correlation_coefficient) DESC
    `, params);

    res.json({
      competencyGrowth,
      competencyCorrelation
    });
  } catch (error) {
    console.error('Error in getCompetencyGrowthTracking:', error);
    res.status(500).json({ error: 'Failed to fetch competency growth data' });
  }
};

// Get student competency scores for admin
export const getStudentCompetencyScores = async (req, res) => {
  try {
    const { studentId, assessmentId } = req.query;
    
    if (!studentId && !assessmentId) {
      return res.status(400).json({
        error: 'Either studentId or assessmentId is required',
        code: 'MISSING_PARAMETER'
      });
    }

    let query, params;

    if (assessmentId) {
      // Get competency scores for a specific assessment
      query = `
        SELECT 
          scs.id,
          scs.competency_id as competencyId,
          c.code as competencyCode,
          c.name as competencyName,
          scs.questions_attempted as questionsAttempted,
          scs.questions_correct as questionsCorrect,
          scs.raw_score as rawScore,
          scs.weighted_score as weightedScore,
          scs.final_score as finalScore,
          scs.feedback_type as feedbackType,
          scs.feedback_text as feedbackText,
          scs.date_calculated as dateCalculated
        FROM student_competency_scores scs
        JOIN competencies c ON scs.competency_id = c.id
        WHERE scs.assessment_id = ?
        ORDER BY scs.final_score DESC
      `;
      params = [assessmentId];
    } else {
      // Get latest competency scores for a student
      query = `
        SELECT 
          scs.id,
          scs.competency_id as competencyId,
          c.code as competencyCode,
          c.name as competencyName,
          scs.questions_attempted as questionsAttempted,
          scs.questions_correct as questionsCorrect,
          scs.raw_score as rawScore,
          scs.weighted_score as weightedScore,
          scs.final_score as finalScore,
          scs.feedback_type as feedbackType,
          scs.feedback_text as feedbackText,
          scs.date_calculated as dateCalculated,
          a.id as assessmentId,
          a.assessment_period,
          a.year,
          s.name as subjectName
        FROM student_competency_scores scs
        JOIN competencies c ON scs.competency_id = c.id
        JOIN assessments a ON scs.assessment_id = a.id
        JOIN subjects s ON a.subject_id = s.id
        WHERE scs.student_id = ?
        ORDER BY a.date_taken DESC, scs.final_score DESC
      `;
      params = [studentId];
    }

    let competencyScores = await executeQuery(query, params);

    console.log('Admin - Competency scores from student_competency_scores:', competencyScores);

    // If no data in student_competency_scores, try assessment_competency_breakdown
    if (competencyScores.length === 0 && assessmentId) {
      const breakdownScores = await executeQuery(`
        SELECT 
          acb.id,
          acb.competency_id as competencyId,
          c.code as competencyCode,
          c.name as competencyName,
          acb.questions_attempted as questionsAttempted,
          acb.questions_correct as questionsCorrect,
          CASE WHEN acb.questions_attempted > 0 THEN (acb.questions_correct / acb.questions_attempted) * 100 ELSE 0 END as rawScore,
          CASE WHEN acb.total_weight > 0 THEN (acb.weighted_correct / acb.total_weight) * 100 ELSE 0 END as weightedScore,
          acb.competency_score as finalScore,
          CASE 
            WHEN acb.competency_score >= c.strong_threshold THEN 'strong'
            WHEN acb.competency_score >= c.neutral_threshold THEN 'neutral'
            ELSE 'growth'
          END as feedbackType,
          CASE 
            WHEN acb.competency_score >= c.strong_threshold THEN c.strong_description
            WHEN acb.competency_score >= c.neutral_threshold THEN c.neutral_description
            ELSE c.growth_description
          END as feedbackText,
          acb.created_at as dateCalculated
        FROM assessment_competency_breakdown acb
        JOIN competencies c ON acb.competency_id = c.id
        WHERE acb.assessment_id = ?
        ORDER BY acb.competency_score DESC
      `, [assessmentId]);

      competencyScores = breakdownScores;
    }

    console.log('Admin - Final competency scores being sent:', competencyScores);
    res.json(competencyScores);
  } catch (error) {
    console.error('Error fetching student competency scores:', error);
    res.status(500).json({
      error: 'Failed to fetch student competency scores',
      code: 'FETCH_STUDENT_COMPETENCY_ERROR'
    });
  }
};

// Import students from CSV
export const importStudentsFromCSV = async (req, res) => {
  try {
    const { csvData } = req.body;
    
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return res.status(400).json({
        error: 'CSV data is required and must be an array',
        code: 'INVALID_CSV_DATA'
      });
    }

    const results = {
      success: [],
      errors: [],
      summary: {
        total: csvData.length,
        successful: 0,
        failed: 0
      }
    };

    // Get all schools and grades for matching
    const schools = await executeQuery('SELECT id, name FROM schools');
    const grades = await executeQuery('SELECT id, display_name FROM grades');

    // Create lookup maps
    const schoolMap = new Map();
    const gradeMap = new Map();
    
    schools.forEach(school => {
      // Store both exact match and normalized versions
      schoolMap.set(school.name.toLowerCase().trim(), school.id);
      schoolMap.set(school.name.trim(), school.id);
    });
    
    grades.forEach(grade => {
      // Store both exact match and normalized versions
      gradeMap.set(grade.display_name.toLowerCase().trim(), grade.id);
      gradeMap.set(grade.display_name.trim(), grade.id);
    });

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 1; // 1-based row number for error reporting
      
      try {
        // Validate required fields
        if (!row.firstName || !row.lastName || !row.username || !row.password) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required fields: firstName, lastName, username, and password are required',
            data: row
          });
          results.summary.failed++;
          continue;
        }

        // Clean and validate data
        const firstName = row.firstName.trim();
        const lastName = row.lastName.trim();
        const username = row.username.trim();
        const password = row.password.trim();
        const schoolName = row.school ? row.school.trim() : '';
        const gradeName = row.grade ? row.grade.trim() : '';

        // Validate username uniqueness
        const existingUser = await executeQuery(
          'SELECT id FROM users WHERE username = ?',
          [username]
        );

        if (existingUser.length > 0) {
          results.errors.push({
            row: rowNumber,
            error: `Username '${username}' already exists`,
            data: row
          });
          results.summary.failed++;
          continue;
        }

        // Find school ID
        let schoolId = null;
        if (schoolName) {
          const normalizedSchoolName = schoolName.toLowerCase();
          schoolId = schoolMap.get(normalizedSchoolName) || schoolMap.get(schoolName);
          
          if (!schoolId) {
            // Try fuzzy matching
            const fuzzyMatch = schools.find(school => 
              school.name.toLowerCase().includes(normalizedSchoolName) ||
              normalizedSchoolName.includes(school.name.toLowerCase())
            );
            if (fuzzyMatch) {
              schoolId = fuzzyMatch.id;
            }
          }
        }

        // Find grade ID
        let gradeId = null;
        if (gradeName) {
          const normalizedGradeName = gradeName.toLowerCase();
          gradeId = gradeMap.get(normalizedGradeName) || gradeMap.get(gradeName);
          
          if (!gradeId) {
            // Try fuzzy matching for common grade patterns
            const fuzzyMatch = grades.find(grade => {
              const gradeLower = grade.display_name.toLowerCase();
              return gradeLower.includes(normalizedGradeName) ||
                     normalizedGradeName.includes(gradeLower) ||
                     gradeLower.replace(/\s+/g, '') === normalizedGradeName.replace(/\s+/g, '');
            });
            if (fuzzyMatch) {
              gradeId = fuzzyMatch.id;
            }
          }
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const insertResult = await executeQuery(
          'INSERT INTO users (username, password, first_name, last_name, role, school_id, grade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [username, hashedPassword, firstName, lastName, 'student', schoolId, gradeId]
        );

        const newUserId = insertResult.insertId;

        results.success.push({
          row: rowNumber,
          userId: newUserId,
          username,
          firstName,
          lastName,
          schoolId,
          gradeId,
          schoolName: schoolId ? schools.find(s => s.id === schoolId)?.name : null,
          gradeName: gradeId ? grades.find(g => g.id === gradeId)?.display_name : null
        });

        results.summary.successful++;

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error occurred',
          data: row
        });
        results.summary.failed++;
      }
    }

    res.json({
      message: 'CSV import completed',
      results
    });

  } catch (error) {
    console.error('Error importing students from CSV:', error);
    res.status(500).json({
      error: 'Failed to import students from CSV',
      code: 'CSV_IMPORT_ERROR'
    });
  }
};

// Import questions from CSV
export const importQuestionsFromCSV = async (req, res) => {
  try {
    const { csvData } = req.body;
    const userId = req.user.id;
    
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return res.status(400).json({
        error: 'CSV data is required and must be an array',
        code: 'INVALID_CSV_DATA'
      });
    }

    const results = {
      success: [],
      errors: [],
      summary: {
        total: csvData.length,
        successful: 0,
        failed: 0
      }
    };

    // Get all subjects, grades, and competencies for matching
    const subjects = await executeQuery('SELECT id, name FROM subjects');
    const grades = await executeQuery('SELECT id, display_name FROM grades');
    const competencies = await executeQuery('SELECT id, code FROM competencies WHERE is_active = 1');

    // Create lookup maps
    const subjectMap = new Map();
    const gradeMap = new Map();
    const competencyMap = new Map();
    
    subjects.forEach(subject => {
      subjectMap.set(subject.name.toLowerCase().trim(), subject.id);
      subjectMap.set(subject.name.trim(), subject.id);
    });
    
    grades.forEach(grade => {
      gradeMap.set(grade.display_name.toLowerCase().trim(), grade.id);
      gradeMap.set(grade.display_name.trim(), grade.id);
    });
    
    competencies.forEach(competency => {
      competencyMap.set(competency.code.trim(), competency.id);
    });

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 1; // 1-based row number for error reporting
      
      try {
        // Determine question type
        const questionType = (row.questionType || '').trim().toLowerCase();
        const isMultipleSelect = questionType === 'multipleselect' || questionType === 'multiple select' || !!row.correctAnswers;
        const isShortAnswer = questionType === 'shortanswer' || questionType === 'short answer';
        const isEssay = questionType === 'essay';
        const isFillInBlank = questionType === 'fillinblank' || questionType === 'fill in blank' || questionType === 'fill-in-blank' || !!row.blankOptions;
        const isTextBased = isShortAnswer || isEssay;
        
        let qType = 'MCQ';
        if (isMultipleSelect) {
          qType = 'MultipleSelect';
        } else if (isShortAnswer) {
          qType = 'ShortAnswer';
        } else if (isEssay) {
          qType = 'Essay';
        } else if (isFillInBlank) {
          qType = 'FillInBlank';
        }

        // Validate required fields
        if (!row.subject || !row.grade || !row.questionText || !row.difficultyLevel) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required fields: subject, grade, questionText, and difficultyLevel are required',
            data: row
          });
          results.summary.failed++;
          continue;
        }

        // For text-based and FillInBlank questions, questionType is required
        if ((isTextBased || isFillInBlank) && !row.questionType) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required field: questionType is required for Short Answer, Essay, and Fill in the Blanks questions',
            data: row
          });
          results.summary.failed++;
          continue;
        }

        // Validate correct answer(s) based on question type
        if (isMultipleSelect && !row.correctAnswers) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required field: correctAnswers is required for Multiple Select questions',
            data: row
          });
          results.summary.failed++;
          continue;
        } else if (isFillInBlank && (!row.blankOptions || !row.blankCorrects)) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required fields: blankOptions and blankCorrects are required for Fill in the Blanks questions',
            data: row
          });
          results.summary.failed++;
          continue;
        } else if (!isMultipleSelect && !isTextBased && !isFillInBlank && !row.correctAnswer) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required field: correctAnswer is required for MCQ questions',
            data: row
          });
          results.summary.failed++;
          continue;
        }

        // Validate options (not required for ShortAnswer/Essay/FillInBlank)
        if (!isTextBased && !isFillInBlank) {
          if (!row.optionA || !row.optionB || !row.optionC || !row.optionD) {
            results.errors.push({
              row: rowNumber,
              error: 'Missing required options: optionA, optionB, optionC, and optionD are required',
              data: row
            });
            results.summary.failed++;
            continue;
          }
        }

        // Clean and validate data
        const subjectName = row.subject.trim();
        const gradeName = row.grade.trim();
        const questionText = row.questionText.trim();
        const optionA = row.optionA ? row.optionA.trim() : '';
        const optionB = row.optionB ? row.optionB.trim() : '';
        const optionC = row.optionC ? row.optionC.trim() : '';
        const optionD = row.optionD ? row.optionD.trim() : '';
        const description = row.description ? row.description.trim() : '';
        const difficultyLevel = parseInt(row.difficultyLevel);
        const dokLevel = row.dokLevel ? parseInt(row.dokLevel) : null;

        // Extract competency codes - handle both single and multiple codes
        const competencyCodes = [];
        if (row.competencyCodes) {
          // Split by comma and clean each code
          const codes = row.competencyCodes.split(',').map(code => code.trim()).filter(code => code);
          competencyCodes.push(...codes);
        }

        // Validate and process correct answer(s) based on question type
        let correctOptionIndices = [];
        let correctAnswerJSON = null;
        let questionMetadata = null;

        if (isFillInBlank) {
          // For FillInBlank: parse blankOptions and blankCorrects
          // blankOptions format: "opt1,opt2,opt3;opt1,opt2,opt3" (semicolon separates blanks)
          // blankCorrects format: "A;B" or "0;1" (semicolon separates correct answers)
          const blankOptionsStr = row.blankOptions.trim();
          const blankCorrectsStr = row.blankCorrects.trim();
          
          // Split by semicolon to get options for each blank
          const blankOptionsArray = blankOptionsStr.split(';').map(blk => blk.trim()).filter(blk => blk);
          const blankCorrectsArray = blankCorrectsStr.split(';').map(blk => blk.trim()).filter(blk => blk);
          
          if (blankOptionsArray.length === 0 || blankCorrectsArray.length === 0) {
            results.errors.push({
              row: rowNumber,
              error: 'Fill in the Blanks questions must have at least one blank with options and correct answer',
              data: row
            });
            results.summary.failed++;
            continue;
          }
          
          if (blankOptionsArray.length !== blankCorrectsArray.length) {
            results.errors.push({
              row: rowNumber,
              error: `Number of blanks in blankOptions (${blankOptionsArray.length}) does not match blankCorrects (${blankCorrectsArray.length})`,
              data: row
            });
            results.summary.failed++;
            continue;
          }
          
          // Parse each blank
          const blanks = [];
          const allCorrectIndices = [];
          let hasError = false;
          
          for (let i = 0; i < blankOptionsArray.length; i++) {
            const optionsForBlank = blankOptionsArray[i].split(',').map(opt => opt.trim()).filter(opt => opt);
            const correctForBlank = blankCorrectsArray[i].trim().toUpperCase();
            
            if (optionsForBlank.length < 2) {
              results.errors.push({
                row: rowNumber,
                error: `Blank ${i + 1} must have at least 2 options`,
                data: row
              });
              hasError = true;
              break;
            }
            
            // Convert correct answer to index (A=0, B=1, C=2, D=3, or numeric 0,1,2,3)
            let correctIndex;
            if (['A', 'B', 'C', 'D'].includes(correctForBlank)) {
              correctIndex = correctForBlank === 'A' ? 0 : correctForBlank === 'B' ? 1 : correctForBlank === 'C' ? 2 : 3;
            } else if (!isNaN(parseInt(correctForBlank))) {
              correctIndex = parseInt(correctForBlank);
            } else {
              results.errors.push({
                row: rowNumber,
                error: `Blank ${i + 1} correct answer must be A, B, C, D, or a number (0-${optionsForBlank.length - 1})`,
                data: row
              });
              hasError = true;
              break;
            }
            
            if (correctIndex < 0 || correctIndex >= optionsForBlank.length) {
              results.errors.push({
                row: rowNumber,
                error: `Blank ${i + 1} correct index ${correctIndex} is out of range (0-${optionsForBlank.length - 1})`,
                data: row
              });
              hasError = true;
              break;
            }
            
            blanks.push({
              options: optionsForBlank,
              correctIndex: correctIndex
            });
            allCorrectIndices.push(correctIndex);
          }
          
          if (hasError) {
            results.summary.failed++;
            continue;
          }
          
          // Store in questionMetadata
          questionMetadata = {
            blanks: blanks
          };
          correctAnswerJSON = JSON.stringify(allCorrectIndices);
          correctOptionIndices = [allCorrectIndices[0]]; // First blank's index for backward compatibility
          
        } else if (isTextBased) {
          // For ShortAnswer and Essay, no correct answer needed
          // Store description in questionMetadata
          questionMetadata = {
            description: description,
            maxWords: isShortAnswer ? 100 : null // ShortAnswer has 100 word limit
          };
          correctOptionIndices = [0]; // Default for backward compatibility
          correctAnswerJSON = null;
        } else if (isMultipleSelect) {
          // For Multiple Select: parse comma-separated answers (e.g., "A,B" or "A,B,C")
          const correctAnswersStr = row.correctAnswers.trim().toUpperCase();
          const answerLetters = correctAnswersStr.split(',').map(a => a.trim()).filter(a => a);
          
          if (answerLetters.length === 0) {
            results.errors.push({
              row: rowNumber,
              error: 'Multiple Select questions must have at least one correct answer',
              data: row
            });
            results.summary.failed++;
            continue;
          }

          // Convert letters to indices
          for (const letter of answerLetters) {
            if (!['A', 'B', 'C', 'D'].includes(letter)) {
              results.errors.push({
                row: rowNumber,
                error: `Invalid correct answer letter: '${letter}'. Must be A, B, C, or D`,
                data: row
              });
              results.summary.failed++;
              continue;
            }
            const index = letter === 'A' ? 0 : letter === 'B' ? 1 : letter === 'C' ? 2 : 3;
            if (!correctOptionIndices.includes(index)) {
              correctOptionIndices.push(index);
            }
          }

          if (correctOptionIndices.length === 0) {
            results.summary.failed++;
            continue;
          }

          // Store as JSON array for Multiple Select
          correctAnswerJSON = JSON.stringify(correctOptionIndices);
        } else {
          // For MCQ: single answer
          const correctAnswer = row.correctAnswer.trim().toUpperCase();
          if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
            results.errors.push({
              row: rowNumber,
              error: `Invalid correct answer: '${correctAnswer}'. Must be A, B, C, or D`,
              data: row
            });
            results.summary.failed++;
            continue;
          }
          const correctOptionIndex = correctAnswer === 'A' ? 0 : 
                                    correctAnswer === 'B' ? 1 : 
                                    correctAnswer === 'C' ? 2 : 3;
          correctOptionIndices = [correctOptionIndex];
        }

        // Validate difficulty level
        if (isNaN(difficultyLevel) || difficultyLevel < 100 || difficultyLevel > 350) {
          results.errors.push({
            row: rowNumber,
            error: `Invalid difficulty level: ${row.difficultyLevel}. Must be between 100 and 350`,
            data: row
          });
          results.summary.failed++;
          continue;
        }

        // Validate DOK level - only required for ShortAnswer and Essay
        if (isShortAnswer || isEssay) {
          if (dokLevel === null || isNaN(dokLevel) || dokLevel < 1 || dokLevel > 4) {
            results.errors.push({
              row: rowNumber,
              error: `DOK level is required and must be between 1 and 4 for Short Answer and Essay questions`,
              data: row
            });
            results.summary.failed++;
            continue;
          }
        } else if (dokLevel !== null && (isNaN(dokLevel) || dokLevel < 1 || dokLevel > 4)) {
          // If DOK is provided for non-ShortAnswer/Essay questions, validate it but don't require it
          results.errors.push({
            row: rowNumber,
            error: `Invalid DOK level: ${row.dokLevel}. DOK level is only applicable to Short Answer and Essay questions`,
            data: row
          });
          results.summary.failed++;
          continue;
        }

        // Find subject ID
        const normalizedSubjectName = subjectName.toLowerCase();
        let subjectId = subjectMap.get(normalizedSubjectName) || subjectMap.get(subjectName);
        
        if (!subjectId) {
          // Try fuzzy matching
          const fuzzyMatch = subjects.find(subject => 
            subject.name.toLowerCase().includes(normalizedSubjectName) ||
            normalizedSubjectName.includes(subject.name.toLowerCase())
          );
          if (fuzzyMatch) {
            subjectId = fuzzyMatch.id;
          }
        }

        if (!subjectId) {
          results.errors.push({
            row: rowNumber,
            error: `Subject not found: '${subjectName}'`,
            data: row
          });
          results.summary.failed++;
          continue;
        }

        // Find grade ID
        const normalizedGradeName = gradeName.toLowerCase();
        let gradeId = gradeMap.get(normalizedGradeName) || gradeMap.get(gradeName);
        
        if (!gradeId) {
          // Try fuzzy matching for common grade patterns
          const fuzzyMatch = grades.find(grade => {
            const gradeLower = grade.display_name.toLowerCase();
            return gradeLower.includes(normalizedGradeName) ||
                   normalizedGradeName.includes(gradeLower) ||
                   gradeLower.replace(/\s+/g, '') === normalizedGradeName.replace(/\s+/g, '');
          });
          if (fuzzyMatch) {
            gradeId = fuzzyMatch.id;
          }
        }

        if (!gradeId) {
          results.errors.push({
            row: rowNumber,
            error: `Grade not found: '${gradeName}'`,
            data: row
          });
          results.summary.failed++;
          continue;
        }

        // Create options array (empty for text-based and FillInBlank questions)
        const options = (isTextBased || isFillInBlank) ? [] : [optionA, optionB, optionC, optionD];

        // For Multiple Select, store first index in correct_option_index for backward compatibility
        // and all indices as JSON in correct_answer
        const correctOptionIndex = correctOptionIndices[0];
        const finalCorrectAnswer = isMultipleSelect ? correctAnswerJSON : null;
        const finalQuestionMetadata = questionMetadata ? JSON.stringify(questionMetadata) : null;

        // Insert question - only set dok_level for ShortAnswer and Essay
        const finalDokLevel = (isShortAnswer || isEssay) ? dokLevel : null;
        const insertResult = await executeQuery(
          'INSERT INTO questions (subject_id, grade_id, question_text, question_type, options, correct_option_index, correct_answer, question_metadata, difficulty_level, dok_level, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [subjectId, gradeId, questionText, qType, JSON.stringify(options), correctOptionIndex, finalCorrectAnswer, finalQuestionMetadata, difficultyLevel, finalDokLevel, userId]
        );

        const newQuestionId = insertResult.insertId;

        // Process competency codes and create relationships
        const competencyIds = [];
        const foundCompetencies = [];
        const notFoundCompetencies = [];

        for (const code of competencyCodes) {
          const competencyId = competencyMap.get(code);
          if (competencyId) {
            competencyIds.push(competencyId);
            foundCompetencies.push(code);
          } else {
            notFoundCompetencies.push(code);
          }
        }

        // Insert competency relationships with equal weight distribution
        if (competencyIds.length > 0) {
          const weightPerCompetency = 100 / competencyIds.length; // Distribute weight equally
          
          for (const competencyId of competencyIds) {
            await executeQuery(
              'INSERT INTO questions_competencies (question_id, competency_id, weight) VALUES (?, ?, ?)',
              [newQuestionId, competencyId, weightPerCompetency]
            );
          }
        }

        // Format correct answer for display
        let correctAnswerDisplay = '-';
        if (isFillInBlank) {
          correctAnswerDisplay = row.blankCorrects || '-';
        } else if (isTextBased) {
          correctAnswerDisplay = description || 'AI Graded';
        } else if (isMultipleSelect) {
          correctAnswerDisplay = correctOptionIndices.map(idx => ['A', 'B', 'C', 'D'][idx]).join(',');
        } else {
          correctAnswerDisplay = ['A', 'B', 'C', 'D'][correctOptionIndex];
        }

        results.success.push({
          row: rowNumber,
          questionId: newQuestionId,
          questionText,
          subjectName: subjects.find(s => s.id === subjectId)?.name,
          gradeName: grades.find(g => g.id === gradeId)?.display_name,
          correctAnswer: correctAnswerDisplay,
          difficultyLevel,
          competencyCount: competencyIds.length,
          foundCompetencies,
          notFoundCompetencies
        });

        results.summary.successful++;

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error occurred',
          data: row
        });
        results.summary.failed++;
      }
    }

    res.json({
      message: 'CSV import completed',
      results
    });

  } catch (error) {
    console.error('Error importing questions from CSV:', error);
    res.status(500).json({
      error: 'Failed to import questions from CSV',
      code: 'CSV_IMPORT_ERROR'
    });
  }
};

// Get student competency growth for admin
export const getStudentCompetencyGrowth = async (req, res) => {
  try {
    const { studentId, subjectId } = req.query;
    
    if (!studentId || !subjectId) {
      return res.status(400).json({
        error: 'Both studentId and subjectId are required',
        code: 'MISSING_PARAMETER'
      });
    }

    // Get all competency scores for this student and subject
    const competencyScores = await executeQuery(`
      SELECT 
        scs.competency_id as competencyId,
        c.code as competencyCode,
        c.name as competencyName,
        a.id as assessmentId,
        a.assessment_period as assessmentPeriod,
        a.year,
        a.date_taken as dateTaken,
        scs.final_score as finalScore,
        scs.feedback_type as feedbackType
      FROM student_competency_scores scs
      JOIN competencies c ON scs.competency_id = c.id
      JOIN assessments a ON scs.assessment_id = a.id
      WHERE scs.student_id = ? AND scs.subject_id = ?
      ORDER BY c.name, a.year, 
        CASE a.assessment_period 
          WHEN 'BOY' THEN 1 
          WHEN 'EOY' THEN 2 
        END
    `, [studentId, subjectId]);

    // Group by competency and calculate growth trends
    const competencyGrowth = [];
    const competencyGroups = {};

    // Group scores by competency
    competencyScores.forEach(score => {
      if (!competencyGroups[score.competencyId]) {
        competencyGroups[score.competencyId] = {
          competencyId: score.competencyId,
          competencyCode: score.competencyCode,
          competencyName: score.competencyName,
          scores: []
        };
      }
      competencyGroups[score.competencyId].scores.push({
        assessmentId: score.assessmentId,
        assessmentPeriod: score.assessmentPeriod,
        year: score.year,
        dateTaken: score.dateTaken,
        finalScore: score.finalScore,
        feedbackType: score.feedbackType
      });
    });

    // Calculate growth trends and average scores
    Object.values(competencyGroups).forEach(competency => {
      const scores = competency.scores;
      const averageScore = scores.reduce((sum, s) => sum + s.finalScore, 0) / scores.length;
      
      // Determine growth trend
      let growthTrend = 'stable';
      if (scores.length >= 2) {
        const firstScore = scores[0].finalScore;
        const lastScore = scores[scores.length - 1].finalScore;
        const difference = lastScore - firstScore;
        
        if (difference > 5) {
          growthTrend = 'improving';
        } else if (difference < -5) {
          growthTrend = 'declining';
        }
      }

      // Generate overall feedback
      let overallFeedback = '';
      if (averageScore >= 80) {
        overallFeedback = `Excellent performance in ${competency.competencyName}. This student consistently demonstrates strong mastery of this skill area.`;
      } else if (averageScore >= 60) {
        overallFeedback = `Good performance in ${competency.competencyName}. This student shows solid understanding with room for continued growth.`;
      } else {
        overallFeedback = `Focus on improving ${competency.competencyName}. This area offers significant opportunities for development.`;
      }

      competencyGrowth.push({
        ...competency,
        averageScore: Math.round(averageScore * 10) / 10,
        growthTrend,
        overallFeedback
      });
    });

    res.json(competencyGrowth);
  } catch (error) {
    console.error('Error fetching student competency growth:', error);
    res.status(500).json({
      error: 'Failed to fetch student competency growth data',
      code: 'FETCH_STUDENT_COMPETENCY_GROWTH_ERROR'
    });
  }
};
