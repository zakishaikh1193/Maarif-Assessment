import React, { useState, useEffect } from 'react';
import { X, Clock, Hash, List, CheckCircle2, Droplets, ArrowLeftRight, Type, FileText, AlertTriangle, Download } from 'lucide-react';
import { assignmentsAPI } from '../services/api';
import { exportAssessmentToPDF } from '../utils/pdfExport';

interface AssessmentQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: number;
}

interface Question {
  id: number;
  questionId: number;
  questionOrder: number;
  points: number;
  questionText: string;
  options?: string;
  difficultyLevel?: number;
  questionType?: 'MCQ' | 'TrueFalse' | 'MultipleSelect' | 'Matching' | 'FillInBlank' | 'ShortAnswer' | 'Essay';
  questionMetadata?: any;
  correctOptionIndex?: number;
  correctAnswer?: string;
}

interface AssignmentData {
  id: number;
  name: string;
  description?: string;
  subjectId: number;
  gradeId: number;
  subjectName: string;
  gradeName: string;
  timeLimitMinutes: number;
  totalQuestions: number;
  questions: Question[];
}

const AssessmentQuestionsModal: React.FC<AssessmentQuestionsModalProps> = ({ isOpen, onClose, assignmentId }) => {
  const [data, setData] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && assignmentId) {
      fetchAssignmentData();
    } else {
      setData(null);
    }
  }, [isOpen, assignmentId]);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assignmentsAPI.getById(assignmentId);
      
      // Parse options and metadata if they're strings
      const questionsWithParsedOptions = response.questions?.map((q: any) => {
        let parsedOptions = [];
        if (q.options) {
          try {
            parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
          } catch (e) {
            parsedOptions = [];
          }
        }
        
        let parsedMetadata = null;
        if (q.questionMetadata) {
          try {
            parsedMetadata = typeof q.questionMetadata === 'string' 
              ? JSON.parse(q.questionMetadata) 
              : q.questionMetadata;
          } catch (e) {
            console.error('Error parsing questionMetadata:', e);
            parsedMetadata = null;
          }
        }
        
        return {
          ...q,
          options: parsedOptions,
          questionMetadata: parsedMetadata,
          questionType: q.questionType || 'MCQ'
        };
      }) || [];
      
      setData({
        ...response,
        questions: questionsWithParsedOptions
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load assessment questions');
      console.error('Error fetching assignment questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level?: number) => {
    if (!level) return 'bg-gray-100 text-gray-800';
    if (level >= 100 && level <= 150) return 'bg-red-100 text-red-800';
    if (level >= 151 && level <= 200) return 'bg-orange-100 text-orange-800';
    if (level >= 201 && level <= 250) return 'bg-yellow-100 text-yellow-800';
    if (level >= 251 && level <= 300) return 'bg-green-100 text-green-800';
    if (level >= 301 && level <= 350) return 'bg-blue-100 text-blue-800';
    if (level < 100) return 'bg-gray-100 text-gray-800';
    return 'bg-purple-100 text-purple-800';
  };

  const getQuestionTypeColor = (type?: string) => {
    if (!type || type === 'MCQ') return 'bg-blue-100 text-blue-800';
    if (type === 'MultipleSelect') return 'bg-indigo-100 text-indigo-800';
    if (type === 'ShortAnswer') return 'bg-purple-100 text-purple-800';
    if (type === 'Essay') return 'bg-orange-100 text-orange-800';
    if (type === 'FillInBlank') return 'bg-pink-100 text-pink-800';
    if (type === 'TrueFalse') return 'bg-cyan-100 text-cyan-800';
    if (type === 'Matching') return 'bg-teal-100 text-teal-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getQuestionTypeName = (type?: string) => {
    if (!type || type === 'MCQ') return 'MCQ';
    if (type === 'MultipleSelect') return 'Multiple Select';
    if (type === 'ShortAnswer') return 'Short Answer';
    if (type === 'Essay') return 'Essay';
    if (type === 'FillInBlank') return 'Fill in Blanks';
    if (type === 'TrueFalse') return 'True/False';
    if (type === 'Matching') return 'Matching';
    return type || 'MCQ';
  };

  const getQuestionTypeIcon = (type?: string) => {
    if (!type || type === 'MCQ' || type === 'MultipleSelect') return <List className="h-4 w-4" />;
    if (type === 'TrueFalse') return <CheckCircle2 className="h-4 w-4" />;
    if (type === 'FillInBlank') return <Droplets className="h-4 w-4" />;
    if (type === 'Matching') return <ArrowLeftRight className="h-4 w-4" />;
    if (type === 'ShortAnswer') return <Type className="h-4 w-4" />;
    if (type === 'Essay') return <FileText className="h-4 w-4" />;
    return <List className="h-4 w-4" />;
  };

  const handleDownloadPDF = async () => {
    if (!data || !data.questions || data.questions.length === 0) {
      alert('No questions available to download');
      return;
    }

    try {
      // Transform questions to match PDF export format
      const questionsForPDF = data.questions.map((q) => {
        // Ensure options is always an array
        let optionsArray: string[] = [];
        if (q.options) {
          if (Array.isArray(q.options)) {
            optionsArray = q.options;
          } else if (typeof q.options === 'string') {
            try {
              const parsed = JSON.parse(q.options);
              optionsArray = Array.isArray(parsed) ? parsed : [];
            } catch {
              optionsArray = [];
            }
          }
        }
        
        return {
          id: q.id || q.questionId,
          questionText: q.questionText,
          questionType: q.questionType || 'MCQ',
          options: optionsArray,
          questionMetadata: q.questionMetadata,
          correctOptionIndex: q.correctOptionIndex,
          correctAnswer: q.correctAnswer,
          difficultyLevel: q.difficultyLevel
        };
      });

      // Calculate average difficulty level
      const difficulties = data.questions
        .map(q => q.difficultyLevel)
        .filter((d): d is number => d !== undefined && d !== null);
      const avgDifficulty = difficulties.length > 0
        ? Math.round(difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length)
        : 0;

      // Prepare metadata
      const metadata = {
        title: data.name || 'Assessment',
        subject: data.subjectName || 'Unknown Subject',
        grade: data.gradeName || 'Unknown Grade',
        timeLimitMinutes: data.timeLimitMinutes,
        difficultyLevel: avgDifficulty,
        questionCount: data.totalQuestions || data.questions.length
      };

      await exportAssessmentToPDF(questionsForPDF, metadata);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {data?.name || 'Assessment Questions'}
            </h2>
            {data && (
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="font-medium">{data.subjectName}</span>
                  <span>•</span>
                  <span>{data.gradeName}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {data.timeLimitMinutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  {data.totalQuestions} questions
                </span>
              </div>
            )}
            {data?.description && (
              <p className="text-sm text-gray-600 mt-2">{data.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data && data.questions && data.questions.length > 0 && (
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                title="Download questions as PDF"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          ) : data && data.questions.length > 0 ? (
            <div className="space-y-6">
              {data.questions.map((question, index) => {
                const questionType = question.questionType || 'MCQ';
                // Ensure options is always an array
                let options: string[] = [];
                if (question.options) {
                  if (Array.isArray(question.options)) {
                    options = question.options;
                  } else if (typeof question.options === 'string') {
                    try {
                      const parsed = JSON.parse(question.options);
                      options = Array.isArray(parsed) ? parsed : [];
                    } catch {
                      options = [];
                    }
                  }
                }
                
                return (
                  <div
                    key={question.id || index}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white"
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                          Question #{question.questionOrder || index + 1}
                        </span>
                        {question.difficultyLevel && (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficultyLevel)}`}>
                            Difficulty: {question.difficultyLevel}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getQuestionTypeColor(questionType)}`}>
                          {getQuestionTypeIcon(questionType)}
                          {getQuestionTypeName(questionType)}
                        </span>
                        {question.points && (
                          <span className="text-xs text-gray-600 font-medium">
                            {question.points} {question.points === 1 ? 'point' : 'points'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <div 
                      className="text-gray-900 font-medium mb-4 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: question.questionText }}
                    />

                    {/* ShortAnswer and Essay Instructions */}
                    {(questionType === 'ShortAnswer' || questionType === 'Essay') && question.questionMetadata?.description && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900 font-medium mb-1">Instructions:</p>
                        <p className="text-sm text-blue-800">{question.questionMetadata.description}</p>
                        {questionType === 'ShortAnswer' && (
                          <p className="text-xs text-blue-700 mt-2">
                            <span className="font-medium">Word Limit:</span> Maximum 100 words (Automatic grading)
                          </p>
                        )}
                        {questionType === 'Essay' && (
                          <p className="text-xs text-blue-700 mt-2">
                            <span className="font-medium">Grading:</span> Automatic grading (No word limit)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Matching Question Display */}
                    {questionType === 'Matching' && question.questionMetadata?.leftItems && question.questionMetadata?.rightItems ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Column A */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Column A</h4>
                            <div className="space-y-2">
                              {question.questionMetadata.leftItems.map((leftItem: string, leftIdx: number) => {
                                const correctPair = question.questionMetadata.correctPairs?.find((p: any) => p.left === leftIdx);
                                const correctRightIdx = correctPair ? correctPair.right : -1;
                                const correctRightItem = correctRightIdx >= 0 ? question.questionMetadata.rightItems[correctRightIdx] : '';
                                
                                return (
                                  <div key={leftIdx} className="p-3 border border-gray-200 rounded bg-gray-50">
                                    <div className="text-sm text-gray-900">
                                      <span className="font-medium">{leftIdx + 1}.</span> {leftItem}
                                    </div>
                                    {correctRightItem && (
                                      <div className="text-xs text-green-700 mt-1 font-medium">
                                        → Matches: {String.fromCharCode(65 + correctRightIdx)}. {correctRightItem}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Column B */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Column B</h4>
                            <div className="space-y-2">
                              {question.questionMetadata.rightItems.map((rightItem: string, rightIdx: number) => (
                                <div key={rightIdx} className="p-3 border border-gray-200 rounded bg-gray-50">
                                  <div className="text-sm text-gray-900">
                                    <span className="font-medium">{String.fromCharCode(65 + rightIdx)}.</span> {rightItem}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : questionType === 'FillInBlank' && question.questionMetadata?.blanks ? (
                      /* Fill in Blank Display */
                      <div className="space-y-3">
                        {question.questionMetadata.blanks.map((blank: any, blankIdx: number) => (
                          <div key={blankIdx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-900">Blank #{blankIdx + 1}</span>
                            </div>
                            <div className="space-y-2">
                              {blank.options?.map((option: string, optIdx: number) => {
                                const isCorrect = optIdx === blank.correctIndex;
                                return (
                                  <div
                                    key={optIdx}
                                    className={`flex items-center space-x-2 p-2 rounded ${
                                      isCorrect
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-white border border-gray-200'
                                    }`}
                                  >
                                    <span className="text-sm font-medium text-gray-600">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    <span className={`text-sm ${
                                      isCorrect
                                        ? 'text-green-800 font-medium'
                                        : 'text-gray-700'
                                    }`}>
                                      {option}
                                    </span>
                                    {isCorrect && (
                                      <span className="text-xs text-green-600 font-medium ml-auto">(Correct)</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (questionType === 'ShortAnswer' || questionType === 'Essay') ? (
                      /* Short Answer and Essay Note */
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-900">
                          <span className="font-medium">Note:</span> Answers will be automatically graded by AI based on Question and Description provided.
                        </p>
                      </div>
                    ) : options.length > 0 ? (
                      /* Options Display for MCQ, TrueFalse, MultipleSelect */
                      <div className="space-y-2">
                        {options.map((option: string, optionIndex: number) => {
                          let isCorrect = false;
                          
                          if (questionType === 'MultipleSelect') {
                            if (question.correctAnswer) {
                              try {
                                const correctAnswers = typeof question.correctAnswer === 'string' 
                                  ? JSON.parse(question.correctAnswer) 
                                  : question.correctAnswer;
                                isCorrect = Array.isArray(correctAnswers) && correctAnswers.includes(optionIndex);
                              } catch (e) {
                                isCorrect = question.correctOptionIndex === optionIndex;
                              }
                            } else {
                              isCorrect = question.correctOptionIndex === optionIndex;
                            }
                          } else if (questionType === 'TrueFalse') {
                            const correctAnswer = question.correctAnswer?.toLowerCase() || '';
                            isCorrect = (correctAnswer === 'true' && optionIndex === 0) || 
                                       (correctAnswer === 'false' && optionIndex === 1);
                          } else {
                            isCorrect = question.correctOptionIndex === optionIndex;
                          }
                          
                          return (
                            <div
                              key={optionIndex}
                              className={`flex items-center space-x-3 p-3 rounded-lg border ${
                                isCorrect
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                                isCorrect
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-300 text-gray-700'
                              }`}>
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span className={`flex-1 text-sm ${
                                isCorrect
                                  ? 'text-green-900 font-medium'
                                  : 'text-gray-700'
                              }`}>
                                {option}
                              </span>
                              {isCorrect && (
                                <span className="text-xs text-green-600 font-medium">Correct Answer</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : data && data.questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No questions found for this assessment.</p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentQuestionsModal;
