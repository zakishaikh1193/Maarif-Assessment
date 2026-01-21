import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grade, Subject, School, Question } from '../types';
import { gradesAPI, subjectsAPI, schoolsAPI, adminAPI, assignmentsAPI } from '../services/api';
import Navigation from '../components/Navigation';
import { ArrowLeft, Clock, Hash, Save, Zap, List, Info, FileQuestion, Users, ChevronRight, CheckCircle } from 'lucide-react';

type AssessmentMode = 'Standard' | 'Adaptive';

type Step = 'general' | 'questions' | 'assign';

interface GeneralFormData {
  title: string;
  description: string;
  subjectId: number;
  gradeId: number;
  timeLimitMinutes: number;
  questionCount: number;
  difficultyLevel: number;
  questionSequence: 'fixed' | 'random';
  optionSequence: 'fixed' | 'random';
}

interface AssignFormData {
  selectedSchools: number[];
  selectedGrades: number[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

const CreateAssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AssessmentMode | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('general');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form data
  const [generalData, setGeneralData] = useState<GeneralFormData>({
    title: '',
    description: '',
    subjectId: 0,
    gradeId: 0,
    timeLimitMinutes: 30,
    questionCount: 10,
    difficultyLevel: 225,
    questionSequence: 'fixed',
    optionSequence: 'fixed'
  });
  
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  
  const [assignData, setAssignData] = useState<AssignFormData>({
    selectedSchools: [],
    selectedGrades: [],
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (mode === 'Standard' && currentStep === 'questions' && generalData.subjectId && generalData.gradeId) {
      loadQuestions();
    }
  }, [mode, currentStep, generalData.subjectId, generalData.gradeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gradesData, subjectsData, schoolsData] = await Promise.all([
        gradesAPI.getActive(),
        subjectsAPI.getAll(),
        schoolsAPI.getAll()
      ]);
      setGrades(gradesData);
      setSubjects(subjectsData);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    if (!generalData.subjectId || !generalData.gradeId) return;
    
    try {
      setQuestionsLoading(true);
      const response = await adminAPI.getQuestions(generalData.subjectId, 1, 100, generalData.gradeId);
      setAvailableQuestions(response.questions || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      setAvailableQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleModeSelect = (selectedMode: AssessmentMode) => {
    setMode(selectedMode);
    setCurrentStep('general');
  };

  const handleGeneralChange = (field: keyof GeneralFormData, value: any) => {
    setGeneralData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAssignChange = (field: keyof AssignFormData, value: any) => {
    setAssignData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateGeneral = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!generalData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!generalData.subjectId) {
      newErrors.subjectId = 'Subject is required';
    }
    if (!generalData.gradeId) {
      newErrors.gradeId = 'Grade is required';
    }
    if (!generalData.timeLimitMinutes || generalData.timeLimitMinutes < 1) {
      newErrors.timeLimitMinutes = 'Time limit must be at least 1 minute';
    }
    if (!generalData.questionCount || generalData.questionCount < 1) {
      newErrors.questionCount = 'Question count must be at least 1';
    }
    if (generalData.difficultyLevel < 100 || generalData.difficultyLevel > 350) {
      newErrors.difficultyLevel = 'Difficulty level must be between 100 and 350';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateQuestions = (): boolean => {
    if (mode === 'Standard') {
      if (selectedQuestions.length === 0) {
        setErrors(prev => ({ ...prev, questions: 'Please select at least one question' }));
        return false;
      }
      if (selectedQuestions.length !== generalData.questionCount) {
        setErrors(prev => ({ 
          ...prev, 
          questions: `Please select exactly ${generalData.questionCount} question(s)` 
        }));
        return false;
      }
    }
    return true;
  };

  const validateAssign = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (assignData.selectedSchools.length === 0) {
      newErrors.schools = 'Please select at least one school';
    }
    if (assignData.selectedGrades.length === 0) {
      newErrors.grades = 'Please select at least one grade';
    }
    if (!assignData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!assignData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!assignData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    if (!assignData.endTime) {
      newErrors.endTime = 'End time is required';
    }
    
    // Validate date/time logic
    if (assignData.startDate && assignData.endDate) {
      const startDateTime = new Date(`${assignData.startDate}T${assignData.startTime}`);
      const endDateTime = new Date(`${assignData.endDate}T${assignData.endTime}`);
      if (endDateTime <= startDateTime) {
        newErrors.endDate = 'End date/time must be after start date/time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getSteps = (): Step[] => {
    if (mode === 'Standard') {
      return ['general', 'questions', 'assign'];
    }
    return ['general', 'assign'];
  };

  const handleNext = () => {
    const steps = getSteps();
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentStep === 'general' && !validateGeneral()) {
      return;
    }
    if (currentStep === 'questions' && !validateQuestions()) {
      return;
    }
    
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const steps = getSteps();
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!validateAssign()) {
      setCurrentStep('assign');
      return;
    }

    setSubmitting(true);
    try {
      const assignmentData = {
        mode,
        general: generalData,
        questions: mode === 'Standard' ? selectedQuestions : [],
        assign: assignData
      };

      await assignmentsAPI.create(assignmentData);
      
      alert('Assessment created successfully!');
      navigate('/admin', { state: { activeTab: 'configs' } });
    } catch (error: any) {
      console.error('Error creating assessment:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create assessment';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleQuestionSelection = (questionId: number) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        if (prev.length >= generalData.questionCount) {
          alert(`You can only select ${generalData.questionCount} question(s)`);
          return prev;
        }
        return [...prev, questionId];
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const steps = getSteps();
  const stepLabels = {
    general: 'General',
    questions: 'Questions',
    assign: 'Assign to'
  };

  const stepIcons = {
    general: Info,
    questions: FileQuestion,
    assign: Users
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="w-[90%] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/admin', { state: { activeTab: 'configs' } })}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Assessments</span>
        </button>

        {/* Mode Selection Section */}
        {!mode && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Assessment</h1>
            <p className="text-gray-600 mb-8">Select the assessment mode to continue</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Adaptive Mode Card */}
              <button
                onClick={() => handleModeSelect('Adaptive')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Zap className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Adaptive Mode</h3>
                    <p className="text-sm text-gray-500">Dynamic question selection</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  Questions are selected dynamically based on student responses. 
                  The difficulty adjusts automatically to match the student's performance level.
                </p>
                <div className="mt-4 flex items-center text-blue-600 font-medium">
                  <span>Select Adaptive Mode</span>
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </div>
              </button>

              {/* Standard Mode Card */}
              <button
                onClick={() => handleModeSelect('Standard')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <List className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Standard Mode</h3>
                    <p className="text-sm text-gray-500">Pre-selected questions</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  Questions are pre-selected from the question bank. 
                  All students receive the same set of questions in a fixed order.
                </p>
                <div className="mt-4 flex items-center text-green-600 font-medium">
                  <span>Select Standard Mode</span>
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Multi-Step Workflow */}
        {mode && (
          <>
            {/* Step Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const Icon = stepIcons[step];
                  const isActive = currentStep === step;
                  const isCompleted = steps.indexOf(currentStep) > index;
                  
                  return (
                    <React.Fragment key={step}>
                      <div className="flex items-center flex-1">
                        <div className={`flex items-center space-x-3 ${
                          isActive ? 'text-green-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          <div className={`p-2 rounded-lg ${
                            isActive ? 'bg-green-100' : isCompleted ? 'bg-gray-100' : 'bg-gray-50'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <div className={`font-medium ${isActive ? 'text-green-700' : ''}`}>
                              {stepLabels[step]}
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <ChevronRight className="h-5 w-5 text-gray-400 mx-2" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              {/* General Step */}
              {currentStep === 'general' && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
                    <p className="text-gray-600 mt-1">Configure basic assessment settings</p>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assessment Title *
                    </label>
                    <input
                      type="text"
                      value={generalData.title}
                      onChange={(e) => handleGeneralChange('title', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.title ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter assessment title"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={generalData.description}
                      onChange={(e) => handleGeneralChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter assessment description (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                      </label>
                      <select
                        value={generalData.subjectId || ''}
                        onChange={(e) => handleGeneralChange('subjectId', Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.subjectId ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select a subject</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                      {errors.subjectId && (
                        <p className="mt-1 text-sm text-red-600">{errors.subjectId}</p>
                      )}
                    </div>

                    {/* Grade */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grade/Class *
                      </label>
                      <select
                        value={generalData.gradeId || ''}
                        onChange={(e) => handleGeneralChange('gradeId', Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.gradeId ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select a grade</option>
                        {grades.map((grade) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.display_name}
                          </option>
                        ))}
                      </select>
                      {errors.gradeId && (
                        <p className="mt-1 text-sm text-red-600">{errors.gradeId}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Time Limit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Time Limit (minutes) *</span>
                        </div>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={generalData.timeLimitMinutes}
                        onChange={(e) => handleGeneralChange('timeLimitMinutes', Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.timeLimitMinutes ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.timeLimitMinutes && (
                        <p className="mt-1 text-sm text-red-600">{errors.timeLimitMinutes}</p>
                      )}
                    </div>

                    {/* Question Count */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4" />
                          <span>Number of Questions *</span>
                        </div>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={generalData.questionCount}
                        onChange={(e) => handleGeneralChange('questionCount', Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.questionCount ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.questionCount && (
                        <p className="mt-1 text-sm text-red-600">{errors.questionCount}</p>
                      )}
                    </div>
                  </div>

                  {/* Difficulty Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level (RIT Score) *
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="350"
                      value={generalData.difficultyLevel}
                      onChange={(e) => handleGeneralChange('difficultyLevel', Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.difficultyLevel ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.difficultyLevel && (
                      <p className="mt-1 text-sm text-red-600">{errors.difficultyLevel}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Recommended range: 100-350
                    </p>
                  </div>

                  {/* Behavior Settings (Standard Mode Only) */}
                  {mode === 'Standard' && (
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900">Question Behavior</h3>
                      
                      {/* Question Sequence */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Sequence
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="fixed"
                              checked={generalData.questionSequence === 'fixed'}
                              onChange={(e) => handleGeneralChange('questionSequence', e.target.value)}
                              className="mr-2"
                            />
                            <span>Fixed Sequence</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="random"
                              checked={generalData.questionSequence === 'random'}
                              onChange={(e) => handleGeneralChange('questionSequence', e.target.value)}
                              className="mr-2"
                            />
                            <span>Random Sequence</span>
                          </label>
                        </div>
                      </div>

                      {/* Option Sequence */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Option Sequence (A, B, C, D)
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="fixed"
                              checked={generalData.optionSequence === 'fixed'}
                              onChange={(e) => handleGeneralChange('optionSequence', e.target.value)}
                              className="mr-2"
                            />
                            <span>Fixed Order</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="random"
                              checked={generalData.optionSequence === 'random'}
                              onChange={(e) => handleGeneralChange('optionSequence', e.target.value)}
                              className="mr-2"
                            />
                            <span>Random Order</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => navigate('/admin', { state: { activeTab: 'configs' } })}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Questions Step (Standard Mode Only) */}
              {currentStep === 'questions' && mode === 'Standard' && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Manage Questions</h2>
                    <p className="text-gray-600 mt-1">
                      Select {generalData.questionCount} question(s) from the question bank
                    </p>
                  </div>

                  {errors.questions && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600">{errors.questions}</p>
                    </div>
                  )}

                  {questionsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Selected: {selectedQuestions.length} / {generalData.questionCount}
                        </p>
                        <button
                          type="button"
                          onClick={loadQuestions}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Refresh Questions
                        </button>
                      </div>

                      {availableQuestions.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <p className="text-gray-600">No questions available for this subject and grade.</p>
                          <p className="text-sm text-gray-500 mt-2">
                            Please select a subject and grade in the General step.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                          {availableQuestions.map((question) => {
                            const isSelected = selectedQuestions.includes(question.id);
                            return (
                              <div
                                key={question.id}
                                onClick={() => toggleQuestionSelection(question.id)}
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      {isSelected && (
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                      )}
                                      <span className="text-sm font-medium text-gray-700">
                                        Difficulty: {question.difficultyLevel}
                                      </span>
                                    </div>
                                    <p className="text-gray-900">{question.questionText}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Assign to Step */}
              {currentStep === 'assign' && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Assign to Schools & Classes</h2>
                    <p className="text-gray-600 mt-1">Select schools, classes, and set availability dates</p>
                  </div>

                  {/* Schools Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Schools *
                    </label>
                    {errors.schools && (
                      <p className="mb-2 text-sm text-red-600">{errors.schools}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4">
                      {schools.map((school) => (
                        <label key={school.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assignData.selectedSchools.includes(school.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleAssignChange('selectedSchools', [...assignData.selectedSchools, school.id]);
                              } else {
                                handleAssignChange('selectedSchools', assignData.selectedSchools.filter(id => id !== school.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{school.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Grades Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Grades/Classes *
                    </label>
                    {errors.grades && (
                      <p className="mb-2 text-sm text-red-600">{errors.grades}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4">
                      {grades.map((grade) => (
                        <label key={grade.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assignData.selectedGrades.includes(grade.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleAssignChange('selectedGrades', [...assignData.selectedGrades, grade.id]);
                              } else {
                                handleAssignChange('selectedGrades', assignData.selectedGrades.filter(id => id !== grade.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{grade.display_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Date and Time Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Start Date/Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date & Time *
                      </label>
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={assignData.startDate}
                          onChange={(e) => handleAssignChange('startDate', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.startDate ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        <input
                          type="time"
                          value={assignData.startTime}
                          onChange={(e) => handleAssignChange('startTime', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.startTime ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.startDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                      )}
                      {errors.startTime && (
                        <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
                      )}
                    </div>

                    {/* End Date/Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date & Time *
                      </label>
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={assignData.endDate}
                          onChange={(e) => handleAssignChange('endDate', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.endDate ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        <input
                          type="time"
                          value={assignData.endTime}
                          onChange={(e) => handleAssignChange('endTime', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.endTime ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.endDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                      )}
                      {errors.endTime && (
                        <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
                      )}
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>{submitting ? 'Creating...' : 'Create Assessment'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateAssessmentPage;
