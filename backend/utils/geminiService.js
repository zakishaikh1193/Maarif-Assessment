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
