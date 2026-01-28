/**
 * Gemini AI Service for grading Short Answer and Essay questions
 * Uses Google's Gemini API to evaluate student responses based on DOK levels
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Grade a student's answer using Gemini AI
 * @param {Object} params - Grading parameters
 * @param {string} params.questionText - The question text
 * @param {number} params.dokLevel - Depth of Knowledge level (1-4)
 * @param {string} params.description - Question description/instructions
 * @param {string} params.studentResponse - Student's answer text
 * @returns {Promise<{correct: number, reason: string}>} - Grading result (correct: 1 or 0, reason: explanation)
 */
export async function gradeAnswerWithAI({ questionText, dokLevel, description, studentResponse }) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  if (!apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is empty. Please add your Gemini API key to the .env file');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Create a comprehensive prompt that considers DOK level
    const prompt = createGradingPrompt({
      questionText,
      dokLevel,
      description,
      studentResponse
    });

    // Try gemini-2.5-flash-lite first (recommended by user), then fallback to other models
    let model;
    let result;
    let response;
    let text;
    
    try {
      // Primary model: Gemini 2.5 Flash Lite
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text();
    } catch (flashLiteError) {
      // If gemini-2.5-flash-lite fails, try gemini-1.5-pro
      if (flashLiteError.message?.includes('not found') || flashLiteError.message?.includes('404')) {
        console.log('gemini-2.5-flash-lite not available, trying gemini-1.5-pro...');
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
          result = await model.generateContent(prompt);
          response = await result.response;
          text = response.text();
        } catch (proError) {
          // If gemini-1.5-pro fails, try gemini-1.5-flash
          if (proError.message?.includes('not found') || proError.message?.includes('404')) {
            console.log('gemini-1.5-pro not available, trying gemini-1.5-flash...');
            try {
              model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
              result = await model.generateContent(prompt);
              response = await result.response;
              text = response.text();
            } catch (flashError) {
              throw new Error('None of the Gemini models are available. Please check your API key and model access.');
            }
          } else {
            throw proError;
          }
        }
      } else {
        throw flashLiteError;
      }
    }

    // Parse the JSON response
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // If it's an API key error, provide helpful message
    if (error.message?.includes('API_KEY') || error.message?.includes('api key')) {
      throw new Error('Invalid or missing Gemini API key. Please check your GEMINI_API_KEY in the .env file');
    }
    
    // If it's a model not found error, provide helpful message
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      throw new Error('Gemini model not available. Please check that your API key has access to Gemini models. Tried: gemini-2.5-flash-lite, gemini-1.5-pro, gemini-1.5-flash');
    }
    
    throw new Error(`AI grading failed: ${error.message}`);
  }
}

/**
 * Generate a descriptive explanation of a question and its importance
 * @param {Object} params - Question parameters
 * @param {string} params.questionText - The question text
 * @param {string} params.questionType - Type of question (MCQ, TrueFalse, etc.)
 * @param {number} params.dokLevel - Depth of Knowledge level (1-4)
 * @param {string} params.subject - Subject name (optional)
 * @param {string} params.standard - Standard/competency (optional)
 * @returns {Promise<string>} - A 2-line descriptive text about the question and its importance
 */
export async function generateQuestionDescription({ questionText, questionType, dokLevel, subject, standard }) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  if (!apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is empty. Please add your Gemini API key to the .env file');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const prompt = `You are an educational expert. Analyze the following question and provide a brief, informative description in exactly 2 lines.

**Question:** ${questionText}

**Question Type:** ${questionType || 'Multiple Choice'}
**DOK Level:** ${dokLevel || 'Not specified'}
${subject ? `**Subject:** ${subject}` : ''}
${standard ? `**Standard:** ${standard}` : ''}

**Your Task:**
Provide exactly 2 lines of descriptive text that:
1. First line: Briefly explains what this question is testing or asking about
2. Second line: Explains why this question is important for learning and skill development

**Requirements:**
- Keep each line concise (maximum 80 characters per line)
- Use clear, educational language
- Focus on learning value and importance
- Do not include the answer or hints
- Format as two separate lines, no bullet points or numbering

**Example Format:**
This question tests your understanding of basic mathematical operations and number relationships.
Mastering this concept is essential for solving more complex problems in algebra and real-world applications.

Now provide your 2-line description:`;

    // Try gemini-2.5-flash-lite first, then fallback to other models
    let model;
    let result;
    let response;
    let text;
    
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text();
    } catch (flashLiteError) {
      if (flashLiteError.message?.includes('not found') || flashLiteError.message?.includes('404')) {
        console.log('gemini-2.5-flash-lite not available, trying gemini-1.5-pro...');
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
          result = await model.generateContent(prompt);
          response = await result.response;
          text = response.text();
        } catch (proError) {
          if (proError.message?.includes('not found') || proError.message?.includes('404')) {
            console.log('gemini-1.5-pro not available, trying gemini-1.5-flash...');
            try {
              model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
              result = await model.generateContent(prompt);
              response = await result.response;
              text = response.text();
            } catch (flashError) {
              throw new Error('None of the Gemini models are available. Please check your API key and model access.');
            }
          } else {
            throw proError;
          }
        }
      } else {
        throw flashLiteError;
      }
    }

    // Clean up the response - remove markdown, extra whitespace, and ensure 2 lines
    let cleanedText = text.trim();
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```[\s\S]*?```/g, '').trim();
    
    // Split into lines and take first 2 meaningful lines
    const lines = cleanedText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 2);
    
    // If we have less than 2 lines, pad with a generic message
    while (lines.length < 2) {
      lines.push('This question helps develop critical thinking and problem-solving skills.');
    }
    
    // Join with line break
    return lines.join('\n');
  } catch (error) {
    console.error('Error generating question description:', error);
    
    // Fallback description
    return `This question tests your understanding of key concepts in this subject.\nMastering this topic is important for building a strong foundation in your studies.`;
  }
}

/**
 * Create a grading prompt for Gemini AI
 * The prompt emphasizes DOK level requirements
 */
function createGradingPrompt({ questionText, dokLevel, description, studentResponse }) {
  const dokLevelDescriptions = {
    1: 'Recall and Reproduction - Basic recall of facts, terms, or simple procedures. Simple one-step processes.',
    2: 'Skills and Concepts - Application of information, conceptual understanding, use of multiple steps.',
    3: 'Strategic Thinking - Complex reasoning, planning, using evidence, abstract thinking, multi-step problem-solving.',
    4: 'Extended Thinking - Investigation, research, complex reasoning over time, multiple sources, real-world application.'
  };

  const dokDescription = dokLevelDescriptions[dokLevel] || 'Unknown DOK level';

  return `You are an expert educational assessor. Your task is to evaluate a student's answer based on the Depth of Knowledge (DOK) level required.

**Question:** ${questionText}

**DOK Level:** ${dokLevel} - ${dokDescription}

**Instructions/Description:** ${description || 'No specific instructions provided.'}

**Student's Response:** ${studentResponse}

**Evaluation Criteria:**
- DOK Level ${dokLevel} requires: ${dokDescription}
- The answer must demonstrate the appropriate depth of knowledge for this DOK level
- A correct answer at DOK Level ${dokLevel} should show understanding appropriate to this level

**Important:** The same question can have different acceptable answers depending on the DOK level:
- At DOK Level 1: Simple, direct answers are acceptable (e.g., "4" for "What is 2+2?")
- At DOK Level 4: The same question requires detailed explanation, analysis, or application (e.g., explaining the mathematical concept, showing work, or applying it to real-world scenarios)

**Your Task:**
Evaluate whether the student's response meets the requirements for DOK Level ${dokLevel}.

**Response Format:**
You MUST respond with ONLY a valid JSON object in this exact format:
{
  "correct": 1,
  "reason": "Brief explanation (1-2 lines)"
}

Where:
- "correct" is either 1 (acceptable/correct) or 0 (unacceptable/incorrect)
- "reason" is a brief 1-2 line explanation of why the answer is acceptable or unacceptable based on the DOK level requirements

**Example Response:**
{
  "correct": 0,
  "reason": "The answer provides only a basic fact without the detailed analysis required for DOK Level 4. It lacks the strategic thinking and complex reasoning expected at this level."
}

Now evaluate the student's response and provide your JSON response:`;
}

/**
 * Parse AI response and extract JSON
 * Handles cases where AI might add extra text before/after JSON
 */
function parseAIResponse(text) {
  try {
    // Try to find JSON in the response (might be wrapped in markdown code blocks or have extra text)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate structure
    if (typeof parsed.correct !== 'number' || (parsed.correct !== 0 && parsed.correct !== 1)) {
      throw new Error('Invalid "correct" value. Must be 0 or 1');
    }
    
    if (typeof parsed.reason !== 'string' || !parsed.reason.trim()) {
      throw new Error('Invalid or missing "reason" field');
    }
    
    return {
      correct: parsed.correct,
      reason: parsed.reason.trim()
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Raw AI response:', text);
    
    // Fallback: try to determine if it's correct based on keywords
    const lowerText = text.toLowerCase();
    const isCorrect = lowerText.includes('correct') || 
                     lowerText.includes('acceptable') || 
                     lowerText.includes('meets') ||
                     lowerText.includes('satisfactory');
    
    return {
      correct: isCorrect ? 1 : 0,
      reason: 'AI response parsing failed. Automatic fallback evaluation used. Original response: ' + text.substring(0, 200)
    };
  }
}

/**
 * Generate comprehensive performance analysis for an assessment
 * @param {Object} params - Analysis parameters
 * @param {Array} params.responses - Array of question responses with details
 * @param {Object} params.statistics - Overall statistics (accuracy, RIT score, etc.)
 * @param {string} params.subjectName - Subject name
 * @param {string} params.studentName - Student name
 * @returns {Promise<{overallAnalysis: string[], strengths: string[], areasOfImprovement: string[], studyTips: string[]}>}
 */
export async function generatePerformanceAnalysis({ responses, statistics, subjectName, studentName }) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  if (!apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is empty. Please add your Gemini API key to the .env file');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Prepare response data for analysis
    const responseSummary = responses.map((r, idx) => ({
      questionNumber: r.questionNumber || idx + 1,
      isCorrect: r.isCorrect,
      difficulty: r.difficulty,
      questionType: r.questionType,
      questionText: r.questionText?.substring(0, 100) || 'N/A', // Truncate for prompt
      aiGradingFeedback: r.aiGradingResult?.reason || null
    }));

    const prompt = `You are an expert educational analyst. Analyze the following assessment performance data and provide a comprehensive, personalized analysis for ${studentName || 'the student'}.

**Student Name:** ${studentName || 'Student'}
**Subject:** ${subjectName || 'General'}

**Overall Statistics:**
- Total Questions: ${statistics.totalQuestions}
- Correct Answers: ${statistics.correctAnswers}
- Incorrect Answers: ${statistics.incorrectAnswers}
- Accuracy: ${statistics.accuracy}%
- Current Growth Metric (RIT) Score: ${statistics.currentRIT}
- Previous Growth Metric (RIT) Score: ${statistics.previousRIT || 'N/A'}

**Question-by-Question Performance:**
${JSON.stringify(responseSummary, null, 2)}

**Your Task:**
Provide a comprehensive performance analysis in the following JSON format. Use ${studentName || 'you'} (second person) instead of "the student" or "the student's":
{
  "overallAnalysis": [
    "Key point 1 about performance (e.g., 'You achieved an accuracy of ${statistics.accuracy}%, demonstrating strong understanding of core concepts')",
    "Key point 2 about performance (e.g., 'Your RIT score is ${statistics.currentRIT}, ${statistics.previousRIT ? (statistics.currentRIT > statistics.previousRIT ? 'showing improvement' : 'indicating areas for growth') : ''}')",
    "Key point 3 about specific patterns or observations (e.g., 'You excelled in questions involving [specific topic]')",
    "Key point 4 about areas needing attention (e.g., 'Questions requiring higher-order thinking (DOK Level 3+) need more practice')"
  ],
  "strengths": [
    "Specific strength 1 (e.g., 'Strong in algebraic problem-solving')",
    "Specific strength 2 (e.g., 'Excellent understanding of geometric concepts')",
    "Specific strength 3 (e.g., 'Good grasp of basic arithmetic operations')"
  ],
  "areasOfImprovement": [
    "Specific area 1 that needs improvement (be specific and actionable)",
    "Specific area 2 that needs improvement",
    "Specific area 3 that needs improvement"
  ],
  "studyTips": [
    "Study tip 1 (e.g., 'Review questions you answered incorrectly to understand the concepts better')",
    "Study tip 2 (e.g., 'Practice regularly with questions of varying difficulty levels')",
    "Study tip 3 (e.g., 'Focus on understanding the underlying principles rather than memorizing')",
    "Study tip 4 (e.g., 'Take advantage of adaptive learning - the system adjusts to your level')"
  ]
}

**Guidelines:**
- Use second person ("you", "your") to address ${studentName || 'the student'} directly
- Format overallAnalysis as an array of key points (not paragraphs)
- Each point should be concise, specific, and highlight important information
- Identify patterns in incorrect answers (e.g., specific question types, difficulty levels, topics)
- Identify strengths based on questions answered correctly, especially at higher difficulty levels
- Consider the difficulty progression and how performance changed over time
- Look for common mistakes or misconceptions
- Provide concrete, actionable study tips
- Focus on learning and improvement opportunities
- Be encouraging but honest about areas needing work
- Highlight important metrics (accuracy, RIT scores, trends) in the analysis points

**Response Format:**
You MUST respond with ONLY a valid JSON object. No markdown, no code blocks, just the JSON object.`;

    // Try gemini-2.5-flash-lite first, then fallback to other models
    let model;
    let result;
    let response;
    let text;
    
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text();
    } catch (flashLiteError) {
      if (flashLiteError.message?.includes('not found') || flashLiteError.message?.includes('404')) {
        console.log('gemini-2.5-flash-lite not available, trying gemini-1.5-pro...');
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
          result = await model.generateContent(prompt);
          response = await result.response;
          text = response.text();
        } catch (proError) {
          if (proError.message?.includes('not found') || proError.message?.includes('404')) {
            console.log('gemini-1.5-pro not available, trying gemini-1.5-flash...');
            try {
              model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
              result = await model.generateContent(prompt);
              response = await result.response;
              text = response.text();
            } catch (flashError) {
              throw new Error('None of the Gemini models are available. Please check your API key and model access.');
            }
          } else {
            throw proError;
          }
        }
      } else {
        throw flashLiteError;
      }
    }

    // Parse the JSON response
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate structure
    if (!Array.isArray(parsed.overallAnalysis) || parsed.overallAnalysis.length === 0) {
      throw new Error('Invalid or missing "overallAnalysis" array');
    }
    
    if (!Array.isArray(parsed.strengths) || parsed.strengths.length === 0) {
      throw new Error('Invalid or missing "strengths" array');
    }
    
    if (!Array.isArray(parsed.areasOfImprovement) || parsed.areasOfImprovement.length === 0) {
      throw new Error('Invalid or missing "areasOfImprovement" array');
    }
    
    if (!Array.isArray(parsed.studyTips) || parsed.studyTips.length === 0) {
      throw new Error('Invalid or missing "studyTips" array');
    }
    
    return {
      overallAnalysis: parsed.overallAnalysis.map(item => item.trim()),
      strengths: parsed.strengths.map(item => item.trim()),
      areasOfImprovement: parsed.areasOfImprovement.map(item => item.trim()),
      studyTips: parsed.studyTips.map(item => item.trim())
    };
  } catch (error) {
    console.error('Error generating performance analysis:', error);
    
    // Fallback analysis
    const accuracy = statistics.accuracy || 0;
    const improvementAreas = [];
    const recommendations = [];
    
    if (accuracy < 50) {
      improvementAreas.push('Fundamental concepts need reinforcement');
      recommendations.push('Review basic concepts and practice foundational problems');
    } else if (accuracy < 75) {
      improvementAreas.push('Some concepts need more practice');
      recommendations.push('Focus on areas where mistakes were made and practice similar problems');
    }
    
    const strengths = accuracy >= 75 
      ? ['Strong overall performance', 'Good understanding of core concepts', 'Effective problem-solving skills']
      : accuracy >= 50
      ? ['Some areas of strength identified', 'Basic concepts understood']
      : ['Keep working hard - improvement is possible'];
    
    const analysisPoints = [
      `You completed ${statistics.totalQuestions} questions with an accuracy of ${accuracy}%`,
      accuracy >= 75 
        ? 'Great job! You\'re showing strong understanding of the material.'
        : accuracy >= 50
        ? 'Good effort! There are areas where you can improve.'
        : 'Keep practicing! Focus on understanding the concepts better.',
      statistics.previousRIT 
        ? `Your RIT score is ${statistics.currentRIT}${statistics.currentRIT > statistics.previousRIT ? ', showing improvement from your previous score of ' + statistics.previousRIT : ', compared to your previous score of ' + statistics.previousRIT}`
        : `Your current RIT score is ${statistics.currentRIT}`
    ];
    
    return {
      overallAnalysis: analysisPoints,
      strengths: strengths,
      areasOfImprovement: improvementAreas.length > 0 ? improvementAreas : ['Continue practicing to maintain and improve your skills'],
      studyTips: recommendations.length > 0 ? recommendations : ['Review questions you answered incorrectly', 'Practice regularly with questions of varying difficulty levels', 'Focus on understanding the underlying principles', 'Take advantage of adaptive learning']
    };
  }
}

/**
 * Generate AI-powered competency recommendations based on competency scores
 * @param {Object} params - Analysis parameters
 * @param {Array} params.competencyScores - Array of competency scores with details
 * @param {string} params.studentName - Student name
 * @param {string} params.subjectName - Subject name
 * @returns {Promise<{strengths: string[], studyTips: string[], focusAreas: string[]}>}
 */
export async function generateCompetencyRecommendations({ competencyScores, studentName, subjectName }) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  if (!apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is empty. Please add your Gemini API key to the .env file');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Prepare competency data for analysis
    const competencySummary = competencyScores.map(score => ({
      competencyName: score.competencyName,
      competencyCode: score.competencyCode,
      finalScore: score.finalScore,
      questionsAttempted: score.questionsAttempted,
      questionsCorrect: score.questionsCorrect,
      feedbackType: score.feedbackType,
      accuracy: score.questionsAttempted > 0 ? Math.round((score.questionsCorrect / score.questionsAttempted) * 100) : 0
    }));

    const prompt = `You are an expert educational analyst and learning coach. Analyze the following competency performance data and provide detailed, personalized recommendations for ${studentName || 'the student'}.

**Student Name:** ${studentName || 'Student'}
**Subject:** ${subjectName || 'General'}

**Competency Performance Data:**
${JSON.stringify(competencySummary, null, 2)}

**Your Task:**
Provide comprehensive, detailed personalized competency recommendations in the following JSON format:
{
  "overallAnalysis": [
    "Point 1: Overall performance summary (e.g., 'You demonstrated strong understanding in 2 out of 4 competencies, showing particular strength in problem-solving areas')",
    "Point 2: Key achievement highlight (e.g., 'Your highest score of 66.67% in Competency 4 shows solid foundational knowledge')",
    "Point 3: Growth opportunity (e.g., 'Focusing on Competency 1 and Competency 3 will help you achieve more balanced performance across all skill areas')",
    "Point 4: Encouragement and next steps (e.g., 'With continued practice, you can improve your scores in areas needing support')"
  ],
  "strengths": [
    "Competency name where student is excelling (e.g., 'Competency 4: Problem-Solving')",
    "Another strong competency"
  ],
  "detailedStrengths": [
    {
      "competency": "Competency 4",
      "description": "Detailed explanation of why this is a strength and what it means (e.g., 'You scored 66.67% in Competency 4, demonstrating solid understanding of problem-solving concepts. You correctly answered 2 out of 3 questions, showing good grasp of the fundamental principles.')",
      "score": 66.67
    }
  ],
  "focusAreas": [
    "Competency name that needs attention (e.g., 'Competency 1: Basic Concepts')",
    "Another area for improvement"
  ],
  "detailedFocusAreas": [
    {
      "competency": "Competency 1",
      "description": "Detailed explanation of why this needs focus (e.g., 'Competency 1 shows 0% score with 0 out of 2 questions answered correctly. This indicates a need to review fundamental concepts and build foundational understanding.')",
      "score": 0,
      "improvementTips": [
        "Specific tip 1 for this competency (e.g., 'Start with basic concept review materials and practice foundational problems')",
        "Specific tip 2 (e.g., 'Focus on understanding core principles before attempting advanced questions')",
        "Specific tip 3 (e.g., 'Practice regularly with simpler questions to build confidence')"
      ]
    }
  ],
  "studyTips": [
    "General study tip 1 (e.g., 'Review questions you answered incorrectly to understand the concepts better')",
    "General study tip 2 (e.g., 'Practice regularly with questions of varying difficulty levels')",
    "General study tip 3 (e.g., 'Focus on understanding the underlying principles rather than memorizing')",
    "General study tip 4 (e.g., 'Take advantage of adaptive learning - the system adjusts to your level')"
  ]
}

**Guidelines:**
- Use second person ("you", "your") to address ${studentName || 'the student'} directly
- Be specific: Reference actual competency names, scores, and question counts from the data
- Be encouraging: Highlight achievements and frame improvements positively
- Be actionable: Provide concrete, specific advice that the student can follow
- Overall Analysis: 3-5 bullet points summarizing overall performance, achievements, and opportunities
- Detailed Strengths: For each strong competency (finalScore >= 70 or feedbackType === 'strong'), provide:
  - Competency name
  - Detailed description explaining the achievement
  - Actual score
- Detailed Focus Areas: For each weak competency (finalScore < 70 or feedbackType === 'growth'), provide:
  - Competency name
  - Detailed description explaining why it needs focus
  - Actual score
  - 2-3 specific improvement tips for that competency
- Study Tips: 4-5 general actionable tips relevant to overall performance
- Use actual data: Reference specific scores, question counts, and competency names from the provided data
- Keep descriptions concise but informative (2-3 sentences for detailed descriptions)

**Response Format:**
You MUST respond with ONLY a valid JSON object. No markdown, no code blocks, just the JSON object.`;

    // Try gemini-2.5-flash-lite first, then fallback to other models
    let model;
    let result;
    let response;
    let text;
    
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text();
    } catch (flashLiteError) {
      if (flashLiteError.message?.includes('not found') || flashLiteError.message?.includes('404')) {
        console.log('gemini-2.5-flash-lite not available, trying gemini-1.5-pro...');
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
          result = await model.generateContent(prompt);
          response = await result.response;
          text = response.text();
        } catch (proError) {
          if (proError.message?.includes('not found') || proError.message?.includes('404')) {
            console.log('gemini-1.5-pro not available, trying gemini-1.5-flash...');
            try {
              model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
              result = await model.generateContent(prompt);
              response = await result.response;
              text = response.text();
            } catch (flashError) {
              throw new Error('None of the Gemini models are available. Please check your API key and model access.');
            }
          } else {
            throw proError;
          }
        }
      } else {
        throw flashLiteError;
      }
    }

    // Parse the JSON response
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate structure
    if (!Array.isArray(parsed.strengths)) {
      throw new Error('Invalid or missing "strengths" array');
    }
    
    if (!Array.isArray(parsed.studyTips) || parsed.studyTips.length === 0) {
      throw new Error('Invalid or missing "studyTips" array');
    }
    
    if (!Array.isArray(parsed.focusAreas)) {
      throw new Error('Invalid or missing "focusAreas" array');
    }
    
    return {
      strengths: parsed.strengths.map(item => item.trim()),
      studyTips: parsed.studyTips.map(item => item.trim()),
      focusAreas: parsed.focusAreas.map(item => item.trim()),
      overallAnalysis: parsed.overallAnalysis ? parsed.overallAnalysis.map(item => item.trim()) : [],
      detailedStrengths: parsed.detailedStrengths || [],
      detailedFocusAreas: parsed.detailedFocusAreas || []
    };
  } catch (error) {
    console.error('Error generating competency recommendations:', error);
    
    // Fallback recommendations based on competency scores
    const strongCompetencies = competencyScores.filter(s => s.feedbackType === 'strong' || s.finalScore >= 70);
    const weakCompetencies = competencyScores.filter(s => s.feedbackType === 'growth' || s.finalScore < 70);
    
    return {
      strengths: strongCompetencies.length > 0 
        ? strongCompetencies.slice(0, 4).map(c => c.competencyName)
        : ['Continue building on your current skills'],
      studyTips: [
        'Review questions you answered incorrectly to understand the concepts better',
        'Practice regularly with questions of varying difficulty levels',
        'Focus on understanding the underlying principles rather than memorizing',
        'Take advantage of adaptive learning - the system adjusts to your level'
      ],
      focusAreas: weakCompetencies.length > 0
        ? weakCompetencies.slice(0, 3).map(c => c.competencyName)
        : ['Continue practicing to maintain and improve your skills']
    };
  }
}

/**
 * Generate personalized feedback for a single competency
 * @param {Object} params - Parameters for generating feedback
 * @param {Object} params.competency - Competency data (name, code, score, etc.)
 * @param {string} params.studentName - Student's name
 * @param {string} params.subjectName - Subject name
 * @returns {Promise<string>} - Personalized feedback text
 */
export async function generateCompetencyFeedback({ competency, studentName, subjectName }) {
  try {
    const accuracy = competency.questionsAttempted > 0 
      ? Math.round((competency.questionsCorrect / competency.questionsAttempted) * 100) 
      : 0;
    
    const prompt = `You are an educational assessment AI assistant. Generate personalized, encouraging feedback for a student's performance in a specific competency.

**Student Information:**
- Name: ${studentName}
- Subject: ${subjectName}

**Competency Performance:**
- Competency Name: ${competency.competencyName}
- Competency Code: ${competency.competencyCode}
- Final Score: ${competency.finalScore}%
- Questions Attempted: ${competency.questionsAttempted}
- Questions Correct: ${competency.questionsCorrect}
- Accuracy: ${accuracy}%
- Performance Level: ${competency.feedbackType === 'strong' ? 'Strong' : competency.feedbackType === 'neutral' ? 'Developing' : 'Needs Support'}

**Requirements:**
- Generate a concise, personalized feedback message (2-3 sentences maximum)
- Be encouraging and constructive
- If score is low (< 50%), acknowledge the challenge and provide motivation
- If score is moderate (50-70%), recognize progress and suggest next steps
- If score is high (>= 70%), celebrate achievement and encourage continued growth
- Use the student's name naturally in the feedback
- Focus on actionable insights specific to this competency
- Keep the tone positive and supportive

**Response Format:**
Respond with ONLY the feedback text. No markdown, no quotes, no JSON, just the plain feedback message.`;

    // Try gemini-2.5-flash-lite first, then fallback to other models
    let model;
    let result;
    let response;
    let text;
    
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text();
    } catch (flashLiteError) {
      if (flashLiteError.message?.includes('not found') || flashLiteError.message?.includes('404')) {
        console.log('gemini-2.5-flash-lite not available, trying gemini-1.5-pro...');
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
          result = await model.generateContent(prompt);
          response = await result.response;
          text = response.text();
        } catch (proError) {
          if (proError.message?.includes('not found') || proError.message?.includes('404')) {
            console.log('gemini-1.5-pro not available, trying gemini-1.5-flash...');
            try {
              model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
              result = await model.generateContent(prompt);
              response = await result.response;
              text = response.text();
            } catch (flashError) {
              throw new Error('None of the Gemini models are available. Please check your API key and model access.');
            }
          } else {
            throw proError;
          }
        }
      } else {
        throw flashLiteError;
      }
    }

    // Clean up the response text
    let feedback = text.trim();
    
    // Remove markdown formatting if present
    feedback = feedback.replace(/```/g, '').replace(/\*\*/g, '').trim();
    
    // Remove quotes if the entire response is wrapped in quotes
    if ((feedback.startsWith('"') && feedback.endsWith('"')) || 
        (feedback.startsWith("'") && feedback.endsWith("'"))) {
      feedback = feedback.slice(1, -1);
    }
    
    return feedback;
  } catch (error) {
    console.error('Error generating competency feedback:', error);
    
    // Fallback feedback based on performance level
    if (competency.feedbackType === 'strong') {
      return `${competency.competencyName} is one of your strong areas! You're demonstrating solid understanding with a ${competency.finalScore}% score. Keep building on this foundation to maintain your excellent performance.`;
    } else if (competency.feedbackType === 'neutral') {
      return `You're making progress in ${competency.competencyName} with a ${competency.finalScore}% score. Continue practicing to strengthen your skills in this area and reach the next level.`;
    } else {
      return `${competency.competencyName} is an area where you can grow. With a ${competency.finalScore}% score, focus on reviewing the concepts and practicing more questions to improve your understanding.`;
    }
  }
}

/**
 * Geocode an address to get latitude and longitude using Gemini API
 * @param {string} address - The address to geocode (e.g., "Riyadh, Saudi Arabia")
 * @returns {Promise<{latitude: number, longitude: number}>} - Coordinates
 */
export async function geocodeAddress(address) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  if (!apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is empty. Please add your Gemini API key to the .env file');
  }

  if (!address || !address.trim()) {
    throw new Error('Address is required for geocoding');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const prompt = `You are a geocoding assistant. Convert the following address to precise latitude and longitude coordinates.

**Address:** ${address}

**Requirements:**
- The address is in Saudi Arabia
- Provide the most accurate coordinates possible
- If the address is vague, use the city center coordinates
- Return ONLY a valid JSON object in this exact format:
{
  "latitude": 24.7136,
  "longitude": 46.6753
}

**Important:**
- Latitude must be between 16.0 and 32.0 (Saudi Arabia's latitude range)
- Longitude must be between 34.0 and 55.0 (Saudi Arabia's longitude range)
- Use decimal degrees format
- Be as precise as possible based on the address provided

Now provide the coordinates for: ${address}`;

    // Try gemini-2.5-flash-lite first, then fallback to other models
    let model;
    let result;
    let response;
    let text;
    
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text();
    } catch (flashLiteError) {
      if (flashLiteError.message?.includes('not found') || flashLiteError.message?.includes('404')) {
        console.log('gemini-2.5-flash-lite not available, trying gemini-1.5-pro...');
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
          result = await model.generateContent(prompt);
          response = await result.response;
          text = response.text();
        } catch (proError) {
          if (proError.message?.includes('not found') || proError.message?.includes('404')) {
            console.log('gemini-1.5-pro not available, trying gemini-1.5-flash...');
            try {
              model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
              result = await model.generateContent(prompt);
              response = await result.response;
              text = response.text();
            } catch (flashError) {
              throw new Error('None of the Gemini models are available. Please check your API key and model access.');
            }
          } else {
            throw proError;
          }
        }
      } else {
        throw flashLiteError;
      }
    }

    // Parse the JSON response
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate coordinates
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') {
      throw new Error('Invalid coordinate format');
    }
    
    // Validate Saudi Arabia bounds
    if (parsed.latitude < 16.0 || parsed.latitude > 32.0 || 
        parsed.longitude < 34.0 || parsed.longitude > 55.0) {
      // If out of bounds, use Riyadh as default
      console.warn(`Coordinates ${parsed.latitude}, ${parsed.longitude} are outside Saudi Arabia bounds. Using Riyadh default.`);
      return { latitude: 24.7136, longitude: 46.6753 };
    }
    
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    
    // Fallback to city-based coordinates
    const cityCoordinates = {
      'riyadh': { latitude: 24.7136, longitude: 46.6753 },
      'jeddah': { latitude: 21.4858, longitude: 39.1925 },
      'dammam': { latitude: 26.4207, longitude: 50.0888 },
      'mecca': { latitude: 21.3891, longitude: 39.8579 },
      'makkah': { latitude: 21.3891, longitude: 39.8579 },
      'medina': { latitude: 24.5247, longitude: 39.5692 },
      'madinah': { latitude: 24.5247, longitude: 39.5692 },
      'taif': { latitude: 21.2703, longitude: 40.4158 },
      'khobar': { latitude: 26.2794, longitude: 50.2080 },
      'abha': { latitude: 18.2164, longitude: 42.5042 },
      'tabuk': { latitude: 28.3998, longitude: 36.5700 },
      'buraydah': { latitude: 26.3260, longitude: 43.9750 },
      'hail': { latitude: 27.5114, longitude: 41.7208 },
      'jazan': { latitude: 16.8894, longitude: 42.5706 },
      'najran': { latitude: 17.4924, longitude: 44.1277 }
    };
    
    const addressLower = address.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (addressLower.includes(city)) {
        return coords;
      }
    }
    
    // Default to Riyadh if no match
    return { latitude: 24.7136, longitude: 46.6753 };
  }
}