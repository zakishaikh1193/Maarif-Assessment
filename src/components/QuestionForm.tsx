import React, { useState, useEffect } from 'react';
import { Subject, Question, Grade, Competency, QuestionType } from '../types';
import { adminAPI, gradesAPI, competenciesAPI } from '../services/api';
import { AlertCircle, Save, X, Plus, Trash2, List, CheckCircle2, Type, FileText, ArrowLeftRight, Droplets, Minus } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface QuestionFormProps {
  subjects: Subject[];
  selectedSubject: Subject;
  editingQuestion?: Question | null;
  onQuestionCreated: () => void;
  onQuestionUpdated: () => void;
  onCancel: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  subjects,
  selectedSubject,
  editingQuestion,
  onQuestionCreated,
  onQuestionUpdated,
  onCancel
}) => {
  const [questionType, setQuestionType] = useState<QuestionType | null>(null);
  const [formData, setFormData] = useState({
    subjectId: selectedSubject.id,
    gradeId: 0,
    questionText: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    correctAnswer: '', // For True/False and other non-MCQ types
    correctAnswerIndices: [] as number[], // For MultipleSelect - array of correct option indices
    fillInBlanks: [] as Array<{ options: string[]; correctIndex: number }>, // For FillInBlank - array of blanks with options
    matchingPairs: [] as Array<{ leftItem: string; rightItem: string; correctMatch: number }>, // For Matching - left items, right items, and correct matches
    description: '', // For ShortAnswer and Essay - additional description/instructions
    difficultyLevel: 200,
    dokLevel: undefined as number | undefined, // Depth of Knowledge level (1-4)
    competencies: [] as Array<{ id: number; code: string; name: string }>
  });
  const [grades, setGrades] = useState<Grade[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gradesData, competenciesData] = await Promise.all([
          gradesAPI.getActive(),
          competenciesAPI.getActive()
        ]);
        setGrades(gradesData);
        setCompetencies(competenciesData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    console.log('QuestionForm useEffect - editingQuestion:', editingQuestion);
    if (editingQuestion) {
      console.log('Setting form data for editing:', {
        subjectId: editingQuestion.subjectId,
        gradeId: editingQuestion.gradeId,
        questionText: editingQuestion.questionText,
        options: editingQuestion.options,
        correctOptionIndex: editingQuestion.correctOptionIndex,
        difficultyLevel: editingQuestion.difficultyLevel,
        questionType: editingQuestion.questionType
      });
      setQuestionType(editingQuestion.questionType || 'MCQ');
      
      // For True/False questions, set correctAnswer from correctAnswer or derive from correctOptionIndex
      let correctAnswer = editingQuestion.correctAnswer || '';
      if (editingQuestion.questionType === 'TrueFalse' && !correctAnswer) {
        // Derive from correctOptionIndex (0 = True, 1 = False)
        correctAnswer = editingQuestion.correctOptionIndex === 0 ? 'true' : 'false';
      }
      
      // For MultipleSelect, parse correctAnswer JSON or use correctOptionIndex as fallback
      let correctAnswerIndices: number[] = [];
      if (editingQuestion.questionType === 'MultipleSelect') {
        if (editingQuestion.correctAnswer) {
          try {
            correctAnswerIndices = JSON.parse(editingQuestion.correctAnswer);
          } catch (e) {
            // Fallback: use correctOptionIndex as single correct answer
            correctAnswerIndices = [editingQuestion.correctOptionIndex];
          }
        } else {
          correctAnswerIndices = [editingQuestion.correctOptionIndex];
        }
      }
      
      // For FillInBlank, parse questionMetadata to get blanks
      let fillInBlanks: Array<{ options: string[]; correctIndex: number }> = [];
      if (editingQuestion.questionType === 'FillInBlank' && editingQuestion.questionMetadata) {
        try {
          const metadata = typeof editingQuestion.questionMetadata === 'string' 
            ? JSON.parse(editingQuestion.questionMetadata)
            : editingQuestion.questionMetadata;
          if (metadata && metadata.blanks && Array.isArray(metadata.blanks)) {
            fillInBlanks = metadata.blanks;
          }
        } catch (e) {
          console.error('Error parsing FillInBlank metadata:', e);
        }
      }
      
      // For Matching, parse questionMetadata to get matching pairs
      let matchingPairs: Array<{ leftItem: string; rightItem: string; correctMatch: number }> = [];
      if (editingQuestion.questionType === 'Matching' && editingQuestion.questionMetadata) {
        try {
          const metadata = typeof editingQuestion.questionMetadata === 'string' 
            ? JSON.parse(editingQuestion.questionMetadata)
            : editingQuestion.questionMetadata;
          if (metadata && metadata.leftItems && metadata.rightItems && metadata.correctPairs) {
            // Reconstruct pairs from leftItems, rightItems, and correctPairs
            const leftItems = metadata.leftItems;
            const rightItems = metadata.rightItems;
            const correctPairs = metadata.correctPairs; // Array of {left: index, right: index}
            
            matchingPairs = leftItems.map((leftItem: string, leftIdx: number) => {
              const pair = correctPairs.find((p: any) => p.left === leftIdx);
              const rightIdx = pair ? pair.right : -1;
              return {
                leftItem: leftItem,
                rightItem: rightIdx >= 0 ? rightItems[rightIdx] : '',
                correctMatch: rightIdx
              };
            });
          }
        } catch (e) {
          console.error('Error parsing Matching metadata:', e);
        }
      }

      setFormData({
        subjectId: editingQuestion.subjectId,
        gradeId: editingQuestion.gradeId || 0,
        questionText: editingQuestion.questionText,
        options: [...editingQuestion.options],
        correctOptionIndex: editingQuestion.correctOptionIndex,
        correctAnswer: correctAnswer,
        correctAnswerIndices: correctAnswerIndices,
        fillInBlanks: fillInBlanks,
        matchingPairs: matchingPairs,
        description: editingQuestion.questionMetadata?.description || '',
        difficultyLevel: editingQuestion.difficultyLevel,
        dokLevel: editingQuestion.dokLevel,
        competencies: editingQuestion.competencies || []
      });
      
      // For FillInBlank, also auto-detect blanks from question text if not already set
      if (editingQuestion.questionType === 'FillInBlank' && fillInBlanks.length === 0) {
        const blankMatches = editingQuestion.questionText.match(/___|\{[0-9]+\}/g);
        const blankCount = blankMatches ? blankMatches.length : 0;
        if (blankCount > 0) {
          const autoBlanks = Array(blankCount).fill(null).map(() => ({ options: ['', ''], correctIndex: 0 }));
          setFormData(prev => ({ ...prev, fillInBlanks: autoBlanks }));
        }
      }
      
      // For Matching, initialize with at least 2 pairs if empty
      if (editingQuestion.questionType === 'Matching' && matchingPairs.length === 0) {
        setFormData(prev => ({ 
          ...prev, 
          matchingPairs: [
            { leftItem: '', rightItem: '', correctMatch: 0 },
            { leftItem: '', rightItem: '', correctMatch: 0 }
          ]
        }));
      }
    } else {
      setQuestionType(null);
      setFormData({
        subjectId: selectedSubject.id,
        gradeId: 0,
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        correctAnswer: '',
        correctAnswerIndices: [],
        fillInBlanks: [],
        matchingPairs: [
          { leftItem: '', rightItem: '', correctMatch: 0 },
          { leftItem: '', rightItem: '', correctMatch: 0 }
        ],
        description: '',
        difficultyLevel: 200,
        dokLevel: undefined,
        competencies: []
      });
    }
  }, [editingQuestion, selectedSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!questionType) {
        throw new Error('Please select a question type');
      }

      // Strip HTML tags for validation (but keep rich text in storage)
      const textContent = formData.questionText.replace(/<[^>]*>/g, '').trim();
      if (!textContent) {
        throw new Error('Question text is required');
      }

      // Validate based on question type
      if (questionType === 'MCQ') {
        if (formData.options.some(option => !option.trim())) {
          throw new Error('All options must be filled');
        }
      } else if (questionType === 'TrueFalse') {
        if (!formData.correctAnswer) {
          throw new Error('Please select the correct answer (True or False)');
        }
      } else if (questionType === 'MultipleSelect') {
        if (formData.options.some(option => !option.trim())) {
          throw new Error('All options must be filled');
        }
        if (formData.correctAnswerIndices.length === 0) {
          throw new Error('Please select at least one correct answer');
        }
      } else if (questionType === 'FillInBlank') {
        // Strip HTML for blank detection
        const textContent = formData.questionText.replace(/<[^>]*>/g, '').trim();
        if (!textContent) {
          throw new Error('Question text is required');
        }
        // Count blanks in question text (___ or {0}, {1}, etc.)
        const blankMatches = textContent.match(/___|\{[0-9]+\}/g);
        const blankCount = blankMatches ? blankMatches.length : 0;
        if (blankCount === 0) {
          throw new Error('Question text must contain at least one blank (use ___ or {0}, {1}, etc.)');
        }
        if (formData.fillInBlanks.length !== blankCount) {
          throw new Error(`Number of blanks (${blankCount}) does not match configured blanks (${formData.fillInBlanks.length})`);
        }
        // Validate each blank has options and correct answer
        for (let i = 0; i < formData.fillInBlanks.length; i++) {
          const blank = formData.fillInBlanks[i];
          if (!blank.options || blank.options.length < 2) {
            throw new Error(`Blank ${i + 1} must have at least 2 options`);
          }
          if (blank.options.some(opt => !opt.trim())) {
            throw new Error(`Blank ${i + 1} has empty options`);
          }
          if (blank.correctIndex < 0 || blank.correctIndex >= blank.options.length) {
            throw new Error(`Blank ${i + 1} must have a valid correct answer selected`);
          }
        }
      } else if (questionType === 'Matching') {
        const textContent = formData.questionText.replace(/<[^>]*>/g, '').trim();
        if (!textContent) {
          throw new Error('Question text is required');
        }
        if (formData.matchingPairs.length < 2) {
          throw new Error('Matching questions must have at least 2 pairs');
        }
        // Validate each pair has both left and right items
        for (let i = 0; i < formData.matchingPairs.length; i++) {
          const pair = formData.matchingPairs[i];
          if (!pair.leftItem.trim()) {
            throw new Error(`Pair ${i + 1} left item is required`);
          }
          if (!pair.rightItem.trim()) {
            throw new Error(`Pair ${i + 1} right item is required`);
          }
          if (pair.correctMatch < 0 || pair.correctMatch >= formData.matchingPairs.length) {
            throw new Error(`Pair ${i + 1} must have a valid match selected`);
          }
        }
        // Validate all left items are unique
        const leftItems = formData.matchingPairs.map(p => p.leftItem.trim().toLowerCase());
        const uniqueLeftItems = new Set(leftItems);
        if (leftItems.length !== uniqueLeftItems.size) {
          throw new Error('Left column items must be unique');
        }
        // Validate all right items are unique
        const rightItems = formData.matchingPairs.map(p => p.rightItem.trim().toLowerCase());
        const uniqueRightItems = new Set(rightItems);
        if (rightItems.length !== uniqueRightItems.size) {
          throw new Error('Right column items must be unique');
        }
      } else if (questionType === 'ShortAnswer' || questionType === 'Essay') {
        const textContent = formData.questionText.replace(/<[^>]*>/g, '').trim();
        if (!textContent) {
          throw new Error('Question text is required');
        }
        // Description is optional but can be provided
      }

      if (formData.difficultyLevel < 100 || formData.difficultyLevel > 350) {
        throw new Error('Growth Metric Score (Difficulty level) must be between 100 and 350');
      }

      // DOK level is only required for ShortAnswer and Essay
      if (questionType === 'ShortAnswer' || questionType === 'Essay') {
        if (formData.dokLevel === undefined || formData.dokLevel < 1 || formData.dokLevel > 4) {
          throw new Error('DOK level is required and must be between 1 and 4 for Short Answer and Essay questions');
        }
      }

      const questionData: any = {
        subjectId: formData.subjectId,
        gradeId: formData.gradeId,
        questionText: formData.questionText, // Keep HTML for rich text
        questionType: questionType,
        difficultyLevel: formData.difficultyLevel,
        dokLevel: formData.dokLevel,
        competencies: formData.competencies.length > 0 ? formData.competencies.map(c => ({ id: c.id })) : undefined
      };

      // Add type-specific fields
      if (questionType === 'MCQ') {
        questionData.options = formData.options.map(opt => opt.trim());
        questionData.correctOptionIndex = formData.correctOptionIndex;
      } else if (questionType === 'TrueFalse') {
        questionData.options = ['True', 'False'];
        questionData.correctOptionIndex = formData.correctAnswer === 'true' ? 0 : 1;
        questionData.correctAnswer = formData.correctAnswer;
      } else if (questionType === 'MultipleSelect') {
        questionData.options = formData.options.map(opt => opt.trim());
        questionData.correctOptionIndex = formData.correctAnswerIndices[0] || 0; // Store first index for backward compatibility
        questionData.correctAnswer = JSON.stringify(formData.correctAnswerIndices); // Store all correct indices as JSON
        
        // Debug logging
        console.log('MultipleSelect question data being sent:', {
          correctAnswerIndices: formData.correctAnswerIndices,
          correctAnswer: questionData.correctAnswer,
          correctOptionIndex: questionData.correctOptionIndex,
          options: questionData.options
        });
      } else if (questionType === 'FillInBlank') {
        // For FillInBlank, store blanks structure in questionMetadata
        // Store correct indices for each blank in correctAnswer
        const correctIndices = formData.fillInBlanks.map(blank => blank.correctIndex);
        questionData.correctAnswer = JSON.stringify(correctIndices);
        questionData.questionMetadata = JSON.stringify({
          blanks: formData.fillInBlanks.map(blank => ({
            options: blank.options.map(opt => opt.trim()),
            correctIndex: blank.correctIndex
          }))
        });
        // Store first blank's first option index for backward compatibility
        questionData.correctOptionIndex = formData.fillInBlanks[0]?.correctIndex || 0;
        // Options can be empty or store all unique options from all blanks
        questionData.options = [];
      } else if (questionType === 'Matching') {
        // For Matching, store left items, right items, and correct pairs in questionMetadata
        const leftItems = formData.matchingPairs.map(pair => pair.leftItem.trim());
        const rightItems = formData.matchingPairs.map(pair => pair.rightItem.trim());
        const correctPairs = formData.matchingPairs.map((pair, leftIdx) => ({
          left: leftIdx,
          right: pair.correctMatch
        }));
        
        questionData.questionMetadata = JSON.stringify({
          leftItems: leftItems,
          rightItems: rightItems,
          correctPairs: correctPairs
        });
        // Store correct pairs in correctAnswer as JSON
        questionData.correctAnswer = JSON.stringify(correctPairs);
        // Store first pair's right index for backward compatibility
        questionData.correctOptionIndex = formData.matchingPairs[0]?.correctMatch || 0;
        // Options can be empty for Matching
        questionData.options = [];
      } else if (questionType === 'ShortAnswer' || questionType === 'Essay') {
        // For ShortAnswer and Essay, store description in questionMetadata
        // No correct answer (will be manually graded later with AI)
        questionData.questionMetadata = JSON.stringify({
          description: formData.description.trim(),
          maxWords: questionType === 'ShortAnswer' ? 100 : null // ShortAnswer has 100 word limit
        });
        questionData.correctAnswer = null; // No automatic validation
        questionData.correctOptionIndex = 0; // Default for backward compatibility
        questionData.options = []; // No options for these types
      }

      if (editingQuestion) {
        await adminAPI.updateQuestion(editingQuestion.id, questionData);
        onQuestionUpdated();
      } else {
        await adminAPI.createQuestion(questionData);
        onQuestionCreated();
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 150) return 'Easy';
    if (level <= 200) return 'Medium-Low';
    if (level <= 250) return 'Medium-High';
    return 'Hard';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {editingQuestion ? 'Edit Question' : 'Add New Question'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          <select
            value={formData.subjectId}
            onChange={(e) => setFormData({ ...formData, subjectId: Number(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!questionType}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grade *
          </label>
          <select
            value={formData.gradeId === 0 ? '' : formData.gradeId}
            onChange={(e) => setFormData({ ...formData, gradeId: Number(e.target.value) })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!questionType}
          >
            <option value="">Select a grade</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* Question Type Selector */}
        {!questionType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Question Type *
            </label>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
              {/* Multiple Choice */}
              <button
                type="button"
                onClick={() => setQuestionType('MCQ')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <List className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-xs font-medium text-gray-700">Multiple Choice</span>
              </button>

              {/* True/False */}
              <button
                type="button"
                onClick={() => setQuestionType('TrueFalse')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-xs font-medium text-gray-700">True/False</span>
              </button>

              {/* Short Answer */}
              <button
                type="button"
                onClick={() => setQuestionType('ShortAnswer')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <Type className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-xs font-medium text-gray-700">Short Answer</span>
              </button>

              {/* Essay */}
              <button
                type="button"
                onClick={() => setQuestionType('Essay')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <FileText className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-xs font-medium text-gray-700">Essay</span>
              </button>

              {/* Matching */}
              <button
                type="button"
                onClick={() => {
                  setQuestionType('Matching');
                  // Initialize with 2 pairs if empty
                  if (formData.matchingPairs.length === 0) {
                    setFormData({
                      ...formData,
                      matchingPairs: [
                        { leftItem: '', rightItem: '', correctMatch: 0 },
                        { leftItem: '', rightItem: '', correctMatch: 0 }
                      ]
                    });
                  }
                }}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <ArrowLeftRight className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-xs font-medium text-gray-700">Matching</span>
              </button>

              {/* Fill in Blank */}
              <button
                type="button"
                onClick={() => setQuestionType('FillInBlank')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <Droplets className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-xs font-medium text-gray-700">Fill in Blank</span>
              </button>

              {/* Multiple Select */}
              <button
                type="button"
                onClick={() => setQuestionType('MultipleSelect')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <List className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-xs font-medium text-gray-700">Multiple Select</span>
              </button>
            </div>
          </div>
        )}

        {/* Selected Question Type Display */}
        {questionType && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              {questionType === 'MCQ' && <List className="h-5 w-5 text-blue-600" />}
              {questionType === 'TrueFalse' && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
              {questionType === 'MultipleSelect' && <List className="h-5 w-5 text-blue-600" />}
              {questionType === 'FillInBlank' && <Droplets className="h-5 w-5 text-blue-600" />}
              {questionType === 'Matching' && <ArrowLeftRight className="h-5 w-5 text-blue-600" />}
              {questionType === 'ShortAnswer' && <Type className="h-5 w-5 text-blue-600" />}
              {questionType === 'Essay' && <FileText className="h-5 w-5 text-blue-600" />}
              <span className="text-sm font-medium text-gray-900">
                Question Type: {questionType === 'MCQ' ? 'Multiple Choice' : questionType === 'TrueFalse' ? 'True/False' : questionType === 'MultipleSelect' ? 'Multiple Select' : questionType === 'FillInBlank' ? 'Fill in the Blanks' : questionType === 'Matching' ? 'Matching' : questionType === 'ShortAnswer' ? 'Short Answer' : questionType === 'Essay' ? 'Essay' : questionType}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuestionType(null);
                setFormData({
                  ...formData,
                  options: ['', '', '', ''],
                  correctOptionIndex: 0,
                  correctAnswer: '',
                  correctAnswerIndices: [],
                  fillInBlanks: [],
                  matchingPairs: [],
                  description: '',
                  dokLevel: undefined
                });
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Change Type
            </button>
          </div>
        )}

        {questionType && questionType !== 'FillInBlank' && questionType !== 'Matching' && questionType !== 'ShortAnswer' && questionType !== 'Essay' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <RichTextEditor
              value={formData.questionText}
              onChange={(value) => setFormData({ ...formData, questionText: value })}
              placeholder="Enter the question text... You can add images, videos, audio, and format text."
              height="250px"
            />
            <p className="mt-2 text-sm text-gray-500">
              Tip: Use the toolbar to add images, videos, audio, and format your question text.
            </p>
          </div>
        )}

        {/* Answer Options - Conditional Rendering */}
        {questionType === 'MCQ' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer Options
            </label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={formData.correctOptionIndex === index}
                    onChange={() => setFormData({ ...formData, correctOptionIndex: index })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-500 w-8">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    required
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Select the radio button for the correct answer
            </p>
          </div>
        )}

        {questionType === 'TrueFalse' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer *
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                <input
                  type="radio"
                  name="trueFalseAnswer"
                  value="true"
                  checked={formData.correctAnswer === 'true'}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  required
                />
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">True</span>
              </label>
              <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                <input
                  type="radio"
                  name="trueFalseAnswer"
                  value="false"
                  checked={formData.correctAnswer === 'false'}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  required
                />
                <X className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-900">False</span>
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Select the correct answer for this True/False question
            </p>
          </div>
        )}

        {questionType === 'MultipleSelect' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer Options
            </label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.correctAnswerIndices.includes(index)}
                    onChange={(e) => {
                      const newIndices = e.target.checked
                        ? [...formData.correctAnswerIndices, index]
                        : formData.correctAnswerIndices.filter(i => i !== index);
                      setFormData({ ...formData, correctAnswerIndices: newIndices });
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-500 w-8">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    required
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Select all correct answers using checkboxes. All selected answers must be correct for the question to be marked correct.
            </p>
            {formData.correctAnswerIndices.length > 0 && (
              <p className="mt-1 text-sm text-blue-600 font-medium">
                {formData.correctAnswerIndices.length} correct answer(s) selected
              </p>
            )}
          </div>
        )}

        {questionType === 'FillInBlank' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text with Blanks *
              </label>
              <textarea
                value={formData.questionText}
                onChange={(e) => {
                  const text = e.target.value;
                  // Count blanks (___ or {0}, {1}, etc.)
                  const blankMatches = text.match(/___|\{[0-9]+\}/g);
                  const blankCount = blankMatches ? blankMatches.length : 0;
                  
                  // Auto-create blanks if count increased
                  let newBlanks = [...formData.fillInBlanks];
                  while (newBlanks.length < blankCount) {
                    newBlanks.push({ options: ['', ''], correctIndex: 0 });
                  }
                  // Remove extra blanks if count decreased
                  if (newBlanks.length > blankCount) {
                    newBlanks = newBlanks.slice(0, blankCount);
                  }
                  
                  setFormData({ ...formData, questionText: text, fillInBlanks: newBlanks });
                }}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="Example: 8 is divisible by ___ and ___.&#10;Or: She {0} reading a book while her brother {1} outside."
                required
              />
              <p className="mt-2 text-sm text-gray-600">
                Use <code className="bg-gray-100 px-1 py-0.5 rounded">___</code> or <code className="bg-gray-100 px-1 py-0.5 rounded">{'{0}'}</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">{'{1}'}</code>, etc. to mark blanks
              </p>
              {formData.questionText && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Detected Blanks: {formData.fillInBlanks.length}</p>
                  <p className="text-sm text-blue-800">
                    Configure options for each blank below
                  </p>
                </div>
              )}
            </div>

            {formData.fillInBlanks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Configure Options for Each Blank
                </label>
                <div className="space-y-4">
                  {formData.fillInBlanks.map((blank, blankIndex) => (
                    <div key={blankIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Blank #{blankIndex + 1}
                        </h4>
                        {formData.fillInBlanks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newBlanks = formData.fillInBlanks.filter((_, i) => i !== blankIndex);
                              setFormData({ ...formData, fillInBlanks: newBlanks });
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Remove this blank"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {blank.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name={`blank-${blankIndex}-correct`}
                              checked={blank.correctIndex === optionIndex}
                              onChange={() => {
                                const newBlanks = [...formData.fillInBlanks];
                                newBlanks[blankIndex].correctIndex = optionIndex;
                                setFormData({ ...formData, fillInBlanks: newBlanks });
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newBlanks = [...formData.fillInBlanks];
                                newBlanks[blankIndex].options[optionIndex] = e.target.value;
                                setFormData({ ...formData, fillInBlanks: newBlanks });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={`Option ${optionIndex + 1}`}
                              required
                            />
                            {blank.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newBlanks = [...formData.fillInBlanks];
                                  newBlanks[blankIndex].options = newBlanks[blankIndex].options.filter((_, i) => i !== optionIndex);
                                  // Adjust correctIndex if needed
                                  if (newBlanks[blankIndex].correctIndex >= newBlanks[blankIndex].options.length) {
                                    newBlanks[blankIndex].correctIndex = newBlanks[blankIndex].options.length - 1;
                                  }
                                  setFormData({ ...formData, fillInBlanks: newBlanks });
                                }}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Remove this option"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newBlanks = [...formData.fillInBlanks];
                            newBlanks[blankIndex].options.push('');
                            setFormData({ ...formData, fillInBlanks: newBlanks });
                          }}
                          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors mt-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Option</span>
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-600">
                        Select the radio button for the correct answer for this blank
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {questionType === 'Matching' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text *
              </label>
              <RichTextEditor
                value={formData.questionText}
                onChange={(value) => setFormData({ ...formData, questionText: value })}
                placeholder="Enter the question text (e.g., 'Match the following words with their meanings')... You can add images, videos, audio, and format text."
                height="200px"
              />
              <p className="mt-2 text-sm text-gray-500">
                Tip: Use the toolbar to add images, videos, audio, and format your question text.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Matching Pairs *
              </label>
              <div className="space-y-4">
                {formData.matchingPairs.map((pair, pairIndex) => (
                  <div key={pairIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Pair #{pairIndex + 1}
                      </h4>
                      {formData.matchingPairs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPairs = formData.matchingPairs.filter((_, i) => i !== pairIndex);
                            // Reset correctMatch indices for remaining pairs
                            const updatedPairs = newPairs.map((p) => ({
                              ...p,
                              correctMatch: p.correctMatch >= newPairs.length ? 0 : p.correctMatch
                            }));
                            setFormData({ ...formData, matchingPairs: updatedPairs });
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Remove this pair"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column Item */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Column A (Left Item) *
                        </label>
                        <input
                          type="text"
                          value={pair.leftItem}
                          onChange={(e) => {
                            const newPairs = [...formData.matchingPairs];
                            newPairs[pairIndex].leftItem = e.target.value;
                            setFormData({ ...formData, matchingPairs: newPairs });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Left item ${pairIndex + 1}`}
                          required
                        />
                      </div>
                      
                      {/* Right Column Item */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Column B (Right Item) *
                        </label>
                        <input
                          type="text"
                          value={pair.rightItem}
                          onChange={(e) => {
                            const newPairs = [...formData.matchingPairs];
                            newPairs[pairIndex].rightItem = e.target.value;
                            setFormData({ ...formData, matchingPairs: newPairs });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Right item ${pairIndex + 1}`}
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Match Selection */}
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Correct Match: This left item matches with which right item? *
                      </label>
                      <select
                        value={pair.correctMatch}
                        onChange={(e) => {
                          const newPairs = [...formData.matchingPairs];
                          newPairs[pairIndex].correctMatch = Number(e.target.value);
                          setFormData({ ...formData, matchingPairs: newPairs });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select match...</option>
                        {formData.matchingPairs.map((_, rightIdx) => (
                          <option key={rightIdx} value={rightIdx}>
                            {formData.matchingPairs[rightIdx].rightItem || `Right item ${rightIdx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => {
                    const newPairs = [...formData.matchingPairs];
                    newPairs.push({ leftItem: '', rightItem: '', correctMatch: 0 });
                    setFormData({ ...formData, matchingPairs: newPairs });
                  }}
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors mt-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Pair</span>
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Add pairs for Column A and Column B. Select which right item matches each left item.
              </p>
            </div>
          </div>
        )}

        {(questionType === 'ShortAnswer' || questionType === 'Essay') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text *
              </label>
              <RichTextEditor
                value={formData.questionText}
                onChange={(value) => setFormData({ ...formData, questionText: value })}
                placeholder="Enter the question text... You can add images, videos, audio, and format text."
                height="250px"
              />
              <p className="mt-2 text-sm text-gray-500">
                Tip: Use the toolbar to add images, videos, audio, and format your question text.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description / Instructions
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={questionType === 'ShortAnswer' ? 'Additional instructions (e.g., "Answer in 2-3 sentences", "Maximum 100 words")' : 'Additional instructions (e.g., "Write a detailed essay", "Include examples")'}
              />
              {questionType === 'ShortAnswer' && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Note:</span> Short Answer questions have a maximum limit of 100 words. Answers will be automatically graded by AI based on Question and Description provided.
                </p>
              )}
              {questionType === 'Essay' && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Note:</span> Essay questions have no word limit. Answers will be automatically graded by AI based on Question and Description provided.
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Growth Metric Score (Difficulty Level): {formData.difficultyLevel} ({getDifficultyLabel(formData.difficultyLevel)})
          </label>
          <input
            type="range"
            min="100"
            max="350"
            value={formData.difficultyLevel}
            onChange={(e) => setFormData({ ...formData, difficultyLevel: Number(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!questionType}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100 (Easy)</span>
            <span>200 (Medium)</span>
            <span>350 (Hard)</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Growth Metric Score is required for all question types and indicates the difficulty level.
          </p>
        </div>

        {/* DOK Level - Only for Short Answer and Essay */}
        {(questionType === 'ShortAnswer' || questionType === 'Essay') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DOK Level (Depth of Knowledge) *
            </label>
            <select
              value={formData.dokLevel === undefined ? '' : formData.dokLevel}
              onChange={(e) => setFormData({ ...formData, dokLevel: e.target.value === '' ? undefined : Number(e.target.value) })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!questionType}
            >
              <option value="">Select DOK Level</option>
              <option value="1">Level 1 - Recall (Remember facts, terms, basic concepts)</option>
              <option value="2">Level 2 - Skill/Concept (Apply skills and concepts)</option>
              <option value="3">Level 3 - Strategic Thinking (Reasoning, planning, using evidence)</option>
              <option value="4">Level 4 - Extended Thinking (Complex reasoning, investigation, research)</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Select the Depth of Knowledge level for this question. DOK level is required for Short Answer and Essay questions.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Competencies
          </label>
          <div className="space-y-3">
            {formData.competencies.map((comp, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {comp.code} - {comp.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newCompetencies = formData.competencies.filter((_, i) => i !== index);
                    setFormData({ ...formData, competencies: newCompetencies });
                  }}
                  className="p-1 text-red-600 hover:text-red-800 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            <div className="flex items-center space-x-3">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const competencyId = Number(e.target.value);
                    const competency = competencies.find(c => c.id === competencyId);
                    if (competency && !formData.competencies.find(c => c.id === competencyId)) {
                      const newCompetency = {
                        id: competency.id,
                        code: competency.code,
                        name: competency.name
                      };
                      setFormData({
                        ...formData,
                        competencies: [...formData.competencies, newCompetency]
                      });
                    }
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!questionType}
              >
                <option value="">Add a competency</option>
                {competencies
                  .filter(comp => !formData.competencies.find(c => c.id === comp.id))
                  .map((competency) => (
                    <option key={competency.id} value={competency.id}>
                      {competency.code} - {competency.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                title="Add competency"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Link this question to specific competencies (optional)
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !questionType}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{editingQuestion ? 'Update' : 'Create'} Question</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionForm;