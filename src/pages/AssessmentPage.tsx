import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import { AssessmentQuestion, AssessmentResponse, StartAssessmentResponse } from '../types';
import Navigation from '../components/Navigation';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  AlertTriangle,
  Brain,
  Target,
  User,
  Building,
  GraduationCap,
  Zap,
  List
} from 'lucide-react';

const AssessmentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { 
    subjectId?: number; 
    period?: string;
    assignmentId?: number;
    mode?: 'Standard' | 'Adaptive';
    assessmentId?: number;
    timeLimitMinutes?: number;
    question?: any;
    allQuestions?: any[];
    assignmentName?: string;
  };

  const [currentQuestion, setCurrentQuestion] = useState<AssessmentQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]); // For MultipleSelect
  const [fillInBlankAnswers, setFillInBlankAnswers] = useState<number[]>([]); // For FillInBlank - array of selected indices for each blank
  const [matchingAnswers, setMatchingAnswers] = useState<number[]>([]); // For Matching - array of selected right indices for each left item
  const [textAnswer, setTextAnswer] = useState<string>(''); // For ShortAnswer and Essay - text response
  const [wordCount, setWordCount] = useState<number>(0); // For ShortAnswer word count
  const [questionType, setQuestionType] = useState<AssessmentQuestion['questionType'] | null>(null);
  const [questionMetadata, setQuestionMetadata] = useState<any>(null); // For FillInBlank/Matching/ShortAnswer/Essay structure
  const [assessmentId, setAssessmentId] = useState<number | null>(state?.assessmentId || null);
  const [loading, setLoading] = useState(!state?.assessmentId); // If assessment already started, don't show loading
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect?: boolean; show: boolean }>({ show: false });
  const [timeLimit, setTimeLimit] = useState<number>(state?.timeLimitMinutes || 30);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [timeRemaining, setTimeRemaining] = useState<number>(timeLimit * 60);
  const [showTimeWarning, setShowTimeWarning] = useState<boolean>(false);
  const [showCriticalWarning, setShowCriticalWarning] = useState<boolean>(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<'Standard' | 'Adaptive'>(state?.mode || 'Adaptive');
  const [allQuestions, setAllQuestions] = useState<any[]>(state?.allQuestions || []);
  const [assignmentName, setAssignmentName] = useState<string>(state?.assignmentName || '');
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    
    // If assignment already started (from dashboard), initialize with provided data
    if (state?.assessmentId && state?.question) {
      setAssessmentId(state.assessmentId);
      
      // Convert question to proper format
      const question: AssessmentQuestion = {
        id: state.question.id,
        text: state.question.text || state.question.questionText,
        options: Array.isArray(state.question.options) 
          ? state.question.options 
          : (typeof state.question.options === 'string' 
              ? JSON.parse(state.question.options) 
              : []),
        questionNumber: state.question.questionNumber || 1,
        totalQuestions: state.question.totalQuestions || state.allQuestions?.length || 10,
        questionType: state.question.questionType || 'MCQ'
      };
      
      setCurrentQuestion(question);
      setQuestionType((question.questionType || 'MCQ') as AssessmentQuestion['questionType']);
      setQuestionMetadata(state.question.questionMetadata || null);
      // Initialize FillInBlank answers array if needed
      if (question.questionType === 'FillInBlank' && state.question.questionMetadata?.blanks) {
        setFillInBlankAnswers(Array(state.question.questionMetadata.blanks.length).fill(null));
      } else {
        setFillInBlankAnswers([]);
      }
      // Initialize Matching answers array if needed
      if (question.questionType === 'Matching' && state.question.questionMetadata?.leftItems) {
        setMatchingAnswers(Array(state.question.questionMetadata.leftItems.length).fill(null));
      } else {
        setMatchingAnswers([]);
      }
      // Initialize text answer for ShortAnswer/Essay
      setTextAnswer('');
      setWordCount(0);
      setTimeLimit(state.timeLimitMinutes || 30);
      setTimeRemaining((state.timeLimitMinutes || 30) * 60);
      setTotalQuestions(state.question.totalQuestions || state.allQuestions?.length || 10);
      setCurrentQuestionNumber(state.question.questionNumber || 1);
      setMode(state.mode || 'Adaptive');
      setAllQuestions(state.allQuestions || []);
      setAssignmentName(state.assignmentName || '');
      setLoading(false);
      return;
    }
    
    // Otherwise, start new assessment (seasonal)
    const initAssessment = async () => {
      await startAssessment();
    };
    
    initAssessment();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!loading && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Show critical warning when 2 minutes remaining
          if (newTime === 120) { // 2 minutes = 120 seconds
            setShowCriticalWarning(true);
          }
          
          // Show warning when 5 minutes remaining
          if (newTime === 300) { // 5 minutes = 300 seconds
            setShowTimeWarning(true);
          }
          
          // Auto-submit when time runs out
          if (newTime <= 0) {
            clearInterval(timer);
            // Auto-submit current answer if one is selected
            const hasAnswer = questionType === 'MultipleSelect' 
              ? selectedAnswers.length > 0 
              : questionType === 'FillInBlank'
              ? fillInBlankAnswers.length > 0 && fillInBlankAnswers.every((ans, idx) => 
                  ans !== null && ans !== undefined && 
                  questionMetadata?.blanks?.[idx]?.options?.[ans] !== undefined
                )
              : questionType === 'Matching'
              ? matchingAnswers.length > 0 && matchingAnswers.every((ans) => 
                  ans !== null && ans !== undefined && 
                  questionMetadata?.rightItems?.[ans] !== undefined
                )
              : questionType === 'ShortAnswer' || questionType === 'Essay'
              ? textAnswer.trim().length > 0
              : selectedAnswer !== null;
            if (hasAnswer && currentQuestion && assessmentId) {
              submitAnswer();
            }
            return 0;
          }
          
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loading, timeRemaining, selectedAnswer, currentQuestion, assessmentId]);

  const startAssessment = async () => {
    try {
      if (!state?.subjectId || !state?.period) {
        throw new Error('Subject ID and period are required');
      }
      
      const response: StartAssessmentResponse = await studentAPI.startAssessment(
        state.subjectId, 
        state.period as 'Fall' | 'Winter' | 'Spring'
      );
      setAssessmentId(response.assessmentId);
      setCurrentQuestion(response.question);
      setQuestionType((response.question.questionType || 'MCQ') as AssessmentQuestion['questionType']);
      setQuestionMetadata(response.question.questionMetadata || null);
      // Initialize FillInBlank answers array if needed
      if (response.question.questionType === 'FillInBlank' && response.question.questionMetadata?.blanks) {
        setFillInBlankAnswers(Array(response.question.questionMetadata.blanks.length).fill(null));
      } else {
        setFillInBlankAnswers([]);
      }
      // Initialize Matching answers array if needed
      if (response.question.questionType === 'Matching' && response.question.questionMetadata?.leftItems) {
        setMatchingAnswers(Array(response.question.questionMetadata.leftItems.length).fill(null));
      } else {
        setMatchingAnswers([]);
      }
      // Initialize text answer for ShortAnswer/Essay
      setTextAnswer('');
      setWordCount(0);
      
      // Extract time limit and question count from the response
      if (response.question) {
        setTotalQuestions(response.question.totalQuestions);
        setCurrentQuestionNumber(response.question.questionNumber);
      }
      
      // Set time limit from backend configuration
      if (response.timeLimitMinutes) {
        setTimeLimit(response.timeLimitMinutes);
        setTimeRemaining(response.timeLimitMinutes * 60); // Convert to seconds
      }
    } catch (error: any) {
      console.error('Failed to start assessment:', error);
      alert(error.response?.data?.error || 'Failed to start assessment');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    // Validate based on question type
    if (questionType === 'MultipleSelect') {
      if (selectedAnswers.length === 0 || !currentQuestion || assessmentId === null) return;
    } else if (questionType === 'FillInBlank') {
      // For FillInBlank, check that all blanks have answers
      const expectedBlankCount = questionMetadata?.blanks?.length || 0;
      if (fillInBlankAnswers.length !== expectedBlankCount || 
          fillInBlankAnswers.some(ans => ans === null || ans === undefined) || 
          !currentQuestion || 
          assessmentId === null) {
        return;
      }
    } else if (questionType === 'Matching') {
      // For Matching, check that all left items have matches
      const expectedLeftCount = questionMetadata?.leftItems?.length || 0;
      if (matchingAnswers.length !== expectedLeftCount || 
          matchingAnswers.some(ans => ans === null || ans === undefined) || 
          !currentQuestion || 
          assessmentId === null) {
        return;
      }
    } else if (questionType === 'ShortAnswer' || questionType === 'Essay') {
      // For ShortAnswer and Essay, check that text is provided
      if (!textAnswer.trim() || !currentQuestion || assessmentId === null) return;
      // For ShortAnswer, check word limit
      if (questionType === 'ShortAnswer' && wordCount > 100) {
        alert('Short Answer must be 100 words or less. Please reduce your answer.');
        return;
      }
    } else {
      if (selectedAnswer === null || !currentQuestion || assessmentId === null) return;
    }

    setSubmitting(true);
    try {
      // For MultipleSelect, send array; for FillInBlank/Matching, send array of selected indices; for ShortAnswer/Essay, send text; otherwise send single index
      let answerToSubmit: number | number[] | string;
      if (questionType === 'MultipleSelect') {
        answerToSubmit = selectedAnswers;
      } else if (questionType === 'FillInBlank') {
        answerToSubmit = fillInBlankAnswers;
      } else if (questionType === 'Matching') {
        answerToSubmit = matchingAnswers;
      } else if (questionType === 'ShortAnswer' || questionType === 'Essay') {
        answerToSubmit = textAnswer.trim();
      } else {
        answerToSubmit = selectedAnswer as number; // Type assertion safe because we checked for null above
      }
      
      const response: AssessmentResponse = await studentAPI.submitAnswer(
        currentQuestion.id,
        answerToSubmit,
        assessmentId
      );

      // Mark current question as answered
      setAnsweredQuestions(prev => new Set([...prev, currentQuestion.questionNumber]));

      // Show feedback only for Adaptive mode (Standard mode doesn't show feedback)
      if (mode === 'Adaptive') {
        setFeedback({ isCorrect: response.isCorrect === true, show: true });
      }

      // Wait for feedback display (only for Adaptive), then continue
      setTimeout(async () => {
        // For Standard mode, use pre-loaded questions
        if (mode === 'Standard' && allQuestions.length > 0) {
          const nextQuestionIndex = currentQuestionNumber; // Next question index (1-based, so index 1 = question 2)
          
          if (nextQuestionIndex < allQuestions.length) {
            // Move to next question (convert 1-based to 0-based index)
            const nextQuestion = allQuestions[nextQuestionIndex];
            const nextQuestionType = (nextQuestion.questionType || 'MCQ') as AssessmentQuestion['questionType'];
            setCurrentQuestion({
              id: nextQuestion.id,
              text: nextQuestion.text,
              options: nextQuestion.options,
              questionNumber: nextQuestionIndex + 1,
              totalQuestions: allQuestions.length,
              questionType: nextQuestionType
            });
            setQuestionType(nextQuestionType);
            setQuestionMetadata(nextQuestion.questionMetadata || null);
            setCurrentQuestionNumber(nextQuestionIndex + 1);
            setSelectedAnswer(null);
            setSelectedAnswers([]);
            // Initialize FillInBlank answers array if needed
            if (nextQuestionType === 'FillInBlank' && nextQuestion.questionMetadata?.blanks) {
              setFillInBlankAnswers(Array(nextQuestion.questionMetadata.blanks.length).fill(null));
            } else {
              setFillInBlankAnswers([]);
            }
            // Initialize Matching answers array if needed
            if (nextQuestionType === 'Matching' && nextQuestion.questionMetadata?.leftItems) {
              setMatchingAnswers(Array(nextQuestion.questionMetadata.leftItems.length).fill(null));
            } else {
              setMatchingAnswers([]);
            }
            // Initialize text answer for ShortAnswer/Essay
            setTextAnswer('');
            setWordCount(0);
            setFeedback({ show: false });
          } else {
            // All questions answered, fetch results
            try {
              const detailedResults = await studentAPI.getDetailedResults(assessmentId);
              navigate('/results', { 
                state: { 
                  ...detailedResults,
                  assignmentName: assignmentName || undefined
                }
              });
            } catch (error) {
              console.error('Failed to fetch detailed results:', error);
              navigate('/dashboard');
            }
          }
        } else {
          // Adaptive mode - use backend response
          if (response.completed && response.assessmentId) {
            try {
              // Fetch detailed results
              const detailedResults = await studentAPI.getDetailedResults(response.assessmentId);
              navigate('/results', { 
                state: { 
                  ...detailedResults,
                  subjectId: state?.subjectId,
                  period: state?.period,
                  assignmentName: assignmentName || undefined
                }
              });
            } catch (error) {
              console.error('Failed to fetch detailed results:', error);
              navigate('/dashboard');
            }
          } else if (response.question) {
            const nextQuestionType = (response.question.questionType || 'MCQ') as AssessmentQuestion['questionType'];
            setCurrentQuestion(response.question);
            setCurrentQuestionNumber(response.question.questionNumber);
            setQuestionType(nextQuestionType);
            setQuestionMetadata(response.question.questionMetadata || null);
            setSelectedAnswer(null);
            setSelectedAnswers([]);
            // Initialize FillInBlank answers array if needed
            if (nextQuestionType === 'FillInBlank' && response.question.questionMetadata?.blanks) {
              setFillInBlankAnswers(Array(response.question.questionMetadata.blanks.length).fill(null));
            } else {
              setFillInBlankAnswers([]);
            }
            // Initialize Matching answers array if needed
            if (nextQuestionType === 'Matching' && response.question.questionMetadata?.leftItems) {
              setMatchingAnswers(Array(response.question.questionMetadata.leftItems.length).fill(null));
            } else {
              setMatchingAnswers([]);
            }
            // Initialize text answer for ShortAnswer/Essay
            setTextAnswer('');
            setWordCount(0);
            setFeedback({ show: false });
          }
        }
      }, 1500);
    } catch (error: any) {
      console.error('Failed to submit answer:', error);
      alert(error.response?.data?.error || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeDisplay = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeProgress = () => {
    const totalTime = timeLimit * 60; // Convert to seconds
    const elapsed = totalTime - timeRemaining;
    return (elapsed / totalTime) * 100;
  };

  const getTimeColor = () => {
    if (timeRemaining <= 120) return 'text-red-600'; // Critical
    if (timeRemaining <= 300) return 'text-yellow-600'; // Warning
    return 'text-gray-600'; // Normal
  };

  const getCircularProgressColor = () => {
    if (timeRemaining <= 120) return 'stroke-red-500'; // Critical
    if (timeRemaining <= 300) return 'stroke-yellow-500'; // Warning
    return 'stroke-yellow-500'; // Normal
  };

  const getCircularProgressBgColor = () => {
    if (timeRemaining <= 120) return 'stroke-red-100'; // Critical
    if (timeRemaining <= 300) return 'stroke-yellow-100'; // Warning
    return 'stroke-gray-100'; // Normal
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-pink-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Preparing your assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-pink-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment Error</h1>
            <p className="text-gray-600">Unable to load assessment questions.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-pink-50">
      <Navigation />
      
      <div className="flex max-w-7xl mx-auto px-4 py-6 gap-6">
        {/* Left Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-6">
            {/* Circular Timer */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col items-center">
                {/* Circular Progress */}
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className={`${getCircularProgressBgColor()} text-gray-200`}
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - getTimeProgress() / 100)}`}
                      className={`${getCircularProgressColor()} transition-all duration-300`}
                    />
                  </svg>
                  
                  {/* Time Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-2xl font-bold font-mono ${getTimeColor()}`}>
                      {getTimeDisplay()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Time Remaining</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Navigation */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Navigation</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Array.from({ length: totalQuestions }, (_, index) => {
                  const questionNum = index + 1;
                  const isCurrent = questionNum === currentQuestionNumber;
                  const isAnswered = answeredQuestions.has(questionNum);
                  
                  return (
                    <button
                      key={questionNum}
                      disabled={true} // Disable navigation for now as it's adaptive
                      className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                        isCurrent
                          ? 'bg-yellow-100 border-2 border-yellow-500 text-yellow-800'
                          : isAnswered
                          ? 'bg-green-100 border border-green-300 text-green-800'
                          : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                      } ${isCurrent ? 'cursor-default' : 'cursor-not-allowed'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Question {questionNum}</span>
                        {isCurrent && (
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        )}
                        {isAnswered && !isCurrent && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span>Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Modern Header with Student Info */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-xl flex items-center justify-center">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {assignmentName || `${state?.period || 'Assessment'} Assessment`}
                    </h1>
                    <div className="flex items-center space-x-3 mt-1">
                      <p className="text-gray-600">Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions}</p>
                      {mode && (
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                          mode === 'Standard'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {mode === 'Standard' ? (
                            <>
                              <List className="h-3 w-3 mr-1" />
                              Standard
                            </>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              Adaptive
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Student Info */}
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4" />
                    <span>Saudi International School</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GraduationCap className="h-4 w-4" />
                    <span>Grade 6</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Student1 Grade6</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Time Warning */}
          {showCriticalWarning && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-800">Critical Time Warning</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Less than 2 minutes remaining! Please submit your answer quickly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Time Warning Alert */}
          {showTimeWarning && !showCriticalWarning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="text-yellow-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Time Warning</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have less than 5 minutes remaining. Please complete your assessment soon.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Question Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-6">
            {/* Only show feedback for Adaptive mode */}
            {feedback.show && mode === 'Adaptive' && (
              <div className={`mb-6 p-4 rounded-xl flex items-center space-x-3 ${
                feedback.isCorrect 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {feedback.isCorrect ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
                <span className="font-medium">
                  {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 leading-relaxed">
                {questionType === 'FillInBlank' ? (
                  // Render FillInBlank question with dropdowns inline
                  (() => {
                    // Strip HTML tags for blank detection in FillInBlank
                    const text = currentQuestion.text.replace(/<[^>]*>/g, '');
                    
                    // Check if we have metadata with blanks
                    if (!questionMetadata?.blanks || !Array.isArray(questionMetadata.blanks) || questionMetadata.blanks.length === 0) {
                      // Fallback: show question text with blanks highlighted but no dropdowns
                      console.warn('FillInBlank question missing metadata or blanks array:', {
                        questionId: currentQuestion.id,
                        questionMetadata,
                        questionText: text
                      });
                      return (
                        <div>
                          <span className="text-red-600">{text}</span>
                          <p className="mt-2 text-sm text-red-600 italic">
                            Warning: This question is missing blank configuration. Please contact your administrator.
                          </p>
                        </div>
                      );
                    }
                    
                    const blanks = questionMetadata.blanks;
                    const parts: (string | number)[] = [];
                    let lastIndex = 0;
                    let blankIndex = 0;
                    
                    // Split text by blanks (___ or {0}, {1}, etc.)
                    const blankPattern = /(___|\{[0-9]+\})/g;
                    const matches: RegExpExecArray[] = [];
                    let tempMatch;
                    
                    // Collect all matches first
                    while ((tempMatch = blankPattern.exec(text)) !== null) {
                      matches.push(tempMatch);
                    }
                    
                    // Process matches
                    for (const match of matches) {
                      // Add text before blank
                      if (match.index > lastIndex) {
                        parts.push(text.substring(lastIndex, match.index));
                      }
                      // Add blank placeholder
                      parts.push(blankIndex);
                      blankIndex++;
                      lastIndex = match.index + match[0].length;
                    }
                    
                    // Add remaining text
                    if (lastIndex < text.length) {
                      parts.push(text.substring(lastIndex));
                    }
                    
                    // Ensure we have the right number of blanks
                    if (blankIndex !== blanks.length) {
                      console.warn('Mismatch between detected blanks and configured blanks:', {
                        detected: blankIndex,
                        configured: blanks.length
                      });
                    }
                    
                    return (
                      <div className="inline-flex flex-wrap items-center gap-2">
                        {parts.map((part, idx) => {
                          if (typeof part === 'number') {
                            // This is a blank
                            const blank = blanks[part];
                            if (!blank || !blank.options || !Array.isArray(blank.options)) {
                              console.error(`Blank ${part} is missing or invalid:`, blank);
                              return (
                                <span key={`blank-error-${part}`} className="text-red-600 font-medium">
                                  [Blank {part + 1} - Configuration Error]
                                </span>
                              );
                            }
                            
                            const isDisabled = mode === 'Standard' ? submitting : feedback.show;
                            return (
                              <select
                                key={`blank-${part}`}
                                value={fillInBlankAnswers[part] !== undefined && fillInBlankAnswers[part] !== null ? fillInBlankAnswers[part] : ''}
                                onChange={(e) => {
                                  const newAnswers = [...fillInBlankAnswers];
                                  newAnswers[part] = Number(e.target.value);
                                  setFillInBlankAnswers(newAnswers);
                                }}
                                disabled={isDisabled}
                                className="inline-block px-3 py-2 border-2 border-blue-500 rounded-lg bg-white text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-600 disabled:opacity-60 disabled:cursor-not-allowed min-w-[120px]"
                              >
                                <option value="">Select...</option>
                                {blank.options.map((opt: string, optIdx: number) => (
                                  <option key={optIdx} value={optIdx}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            );
                          } else {
                            // This is text
                            return <span key={`text-${idx}`}>{part}</span>;
                          }
                        })}
                      </div>
                    );
                  })()
                ) : (
                  // Regular question text (render HTML if present)
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.text }}
                  />
                )}
              </h2>
            </div>

            {/* Show options only for MCQ, TrueFalse, and MultipleSelect */}
            {(questionType === 'MCQ' || questionType === 'TrueFalse' || questionType === 'MultipleSelect') && (
              <div className="space-y-4 mb-8">
                {currentQuestion.options.map((option, index) => {
                  // For Standard mode, disable after submission (submitting state)
                  // For Adaptive mode, disable when feedback is shown
                  const isDisabled = mode === 'Standard' ? submitting : feedback.show;
                  const isMultipleSelect = questionType === 'MultipleSelect';
                  const isSelected = isMultipleSelect 
                    ? selectedAnswers.includes(index)
                    : selectedAnswer === index;
                  
                  return (
                  <button
                    key={index}
                    onClick={() => {
                      if (isDisabled) return;
                      if (isMultipleSelect) {
                        setSelectedAnswers(prev => 
                          prev.includes(index)
                            ? prev.filter(i => i !== index)
                            : [...prev, index]
                        );
                      } else {
                        setSelectedAnswer(index);
                      }
                    }}
                    disabled={isDisabled}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-yellow-500 bg-yellow-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 hover:shadow-sm'
                    } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center space-x-3">
                      {isMultipleSelect ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by button onClick
                          className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                          disabled={isDisabled}
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                          isSelected
                            ? 'border-yellow-500 bg-yellow-500 text-white'
                            : 'border-gray-300 text-gray-500'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                      )}
                      <span className="text-gray-900 font-medium">{option}</span>
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
            
            {questionType === 'FillInBlank' && (
              <p className="mb-4 text-sm text-gray-600 italic">
                Select an option for each blank from the dropdowns above.
              </p>
            )}
            
            {(questionType === 'ShortAnswer' || questionType === 'Essay') && (
              <div className="mb-8">
                {questionMetadata?.description && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium mb-1">Instructions:</p>
                    <p className="text-sm text-blue-800">{questionMetadata.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer {questionType === 'ShortAnswer' && <span className="text-gray-500">(Maximum 100 words)</span>}
                  </label>
                  <textarea
                    value={textAnswer}
                    onChange={(e) => {
                      const text = e.target.value;
                      setTextAnswer(text);
                      // Count words
                      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
                      setWordCount(words.length);
                    }}
                    rows={questionType === 'ShortAnswer' ? 5 : 10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    placeholder={questionType === 'ShortAnswer' ? 'Enter your answer (maximum 100 words)...' : 'Enter your essay answer...'}
                    disabled={mode === 'Standard' ? submitting : feedback.show}
                  />
                  {questionType === 'ShortAnswer' && (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Word count: <span className={`font-medium ${wordCount > 100 ? 'text-red-600' : 'text-gray-900'}`}>{wordCount}</span> / 100
                      </p>
                      {wordCount > 100 && (
                        <p className="text-sm text-red-600 font-medium">
                          Exceeds word limit! Please reduce your answer.
                        </p>
                      )}
                    </div>
                  )}
                  {questionType === 'Essay' && (
                    <p className="mt-2 text-sm text-gray-600">
                      Word count: <span className="font-medium">{wordCount}</span> (no limit)
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {questionType === 'Matching' && questionMetadata?.leftItems && questionMetadata?.rightItems && (
              <div className="mb-8">
                <p className="mb-4 text-sm text-gray-600 italic">
                  Match each item in Column A with the correct item in Column B.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Column A */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Column A</h3>
                    <div className="space-y-3">
                      {questionMetadata.leftItems.map((_leftItem: string, leftIdx: number) => (
                        <div key={leftIdx} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <span className="text-sm font-medium text-gray-700 min-w-[30px]">
                            {leftIdx + 1}.
                          </span>
                          <span className="text-sm text-gray-900 flex-1">{questionMetadata.leftItems[leftIdx]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Column B with dropdowns */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Column B (Select Match)</h3>
                    <div className="space-y-3">
                      {questionMetadata.leftItems.map((_leftItem: string, leftIdx: number) => {
                        const isDisabled = mode === 'Standard' ? submitting : feedback.show;
                        return (
                          <div key={leftIdx} className="p-3 border border-gray-200 rounded-lg bg-white">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-700 min-w-[30px]">
                                {leftIdx + 1}.
                              </span>
                              <select
                                value={matchingAnswers[leftIdx] !== undefined && matchingAnswers[leftIdx] !== null ? matchingAnswers[leftIdx] : ''}
                                onChange={(e) => {
                                  const newAnswers = [...matchingAnswers];
                                  newAnswers[leftIdx] = Number(e.target.value);
                                  setMatchingAnswers(newAnswers);
                                }}
                                disabled={isDisabled}
                                className="flex-1 px-3 py-2 border-2 border-blue-500 rounded-lg bg-white text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <option value="">Select match...</option>
                                {questionMetadata.rightItems.map((rightItem: string, rightIdx: number) => (
                                  <option key={rightIdx} value={rightIdx}>
                                    {String.fromCharCode(65 + rightIdx)}. {rightItem}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {questionType === 'MultipleSelect' && (
              <p className="mb-4 text-sm text-gray-600 italic">
                Select all correct answers. All selected answers must be correct for the question to be marked correct.
              </p>
            )}

            <div className="flex justify-end">
              <button
                onClick={submitAnswer}
                disabled={
                  (questionType === 'MultipleSelect' 
                    ? selectedAnswers.length === 0 
                    : questionType === 'FillInBlank'
                    ? fillInBlankAnswers.length === 0 || 
                      fillInBlankAnswers.length !== (questionMetadata?.blanks?.length || 0) ||
                      fillInBlankAnswers.some(ans => ans === null || ans === undefined)
                    : questionType === 'Matching'
                    ? matchingAnswers.length === 0 || 
                      matchingAnswers.length !== (questionMetadata?.leftItems?.length || 0) ||
                      matchingAnswers.some(ans => ans === null || ans === undefined)
                    : questionType === 'ShortAnswer' || questionType === 'Essay'
                    ? !textAnswer.trim() || (questionType === 'ShortAnswer' && wordCount > 100)
                    : selectedAnswer === null) ||
                  submitting ||
                  (mode === 'Adaptive' && feedback.show)
                }
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-yellow-500 to-pink-500 text-white rounded-xl hover:from-yellow-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <span>Submit Answer</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-900 mb-2">Maarif Adaptive Testing</h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                  This assessment adapts to your performance in real-time. Answer correctly to receive more challenging questions, 
                  or answer incorrectly for easier ones. Your final Growth Metric score is calculated as the average difficulty of all questions you attempted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage;