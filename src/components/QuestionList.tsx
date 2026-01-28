import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Question, Grade } from '../types';
import { adminAPI, gradesAPI } from '../services/api';
import { Edit, Trash2, AlertTriangle, Filter, ChevronLeft, ChevronRight, List, CheckCircle2, Type, FileText, ArrowLeftRight, Droplets, Search, X } from 'lucide-react';

interface QuestionListProps {
  questions: Question[];
  onEdit: (question: Question) => Promise<void>;
  onDelete: () => void;
  currentPage: number;
  totalPages: number;
  totalQuestions: number;
  onPageChange: (page: number) => void;
  selectedGrade: number | null;
  onGradeChange: (gradeId: number | null) => void;
  subjectId?: number; // Add subjectId to fetch all questions when filters are active
}

const QuestionList: React.FC<QuestionListProps> = ({ 
  questions, 
  onEdit, 
  onDelete, 
  currentPage, 
  totalPages, 
  totalQuestions, 
  onPageChange,
  selectedGrade,
  onGradeChange,
  subjectId
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]); // Store all questions when filters are active
  const [loadingAllQuestions, setLoadingAllQuestions] = useState(false);
  const [clientSidePage, setClientSidePage] = useState(1);
  const questionsPerPage = 20;
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Filter states - using arrays for multi-select
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuestionType, setFilterQuestionType] = useState<string[]>([]);
  const [filterDokLevel, setFilterDokLevel] = useState<number | 'all'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string | 'all'>('all'); // 'all' or difficulty range like '100-150'
  
  // Check if filters are active
  const hasActiveFilters = searchTerm || filterQuestionType.length > 0 || filterDokLevel !== 'all' || filterDifficulty !== 'all';

  const handleDelete = async (questionId: number) => {
    setDeleting(true);
    try {
      await adminAPI.deleteQuestion(questionId);
      setDeleteConfirm(null);
      onDelete();
    } catch (error) {
      console.error('Failed to delete question:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Updated difficulty color function to match CreateAssessmentPage.tsx ranges
  const getDifficultyColor = (level: number) => {
    if (level >= 100 && level <= 150) return 'bg-red-100 text-red-800';
    if (level >= 151 && level <= 200) return 'bg-orange-100 text-orange-800';
    if (level >= 201 && level <= 250) return 'bg-yellow-100 text-yellow-800';
    if (level >= 251 && level <= 300) return 'bg-green-100 text-green-800';
    if (level >= 301 && level <= 350) return 'bg-blue-100 text-blue-800';
    // Fallback for values outside range
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
    return type;
  };

  // Fetch all questions when filters are active
  const fetchAllQuestions = async () => {
    if (!subjectId) return;
    try {
      setLoadingAllQuestions(true);
      // Fetch all questions with a large limit
      const response = await adminAPI.getQuestions(subjectId, 1, 10000, selectedGrade);
      setAllQuestions(response.questions || []);
    } catch (err) {
      console.error('Failed to fetch all questions:', err);
      setAllQuestions([]);
    } finally {
      setLoadingAllQuestions(false);
    }
  };

  // Fetch grades on component mount
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const gradesData = await gradesAPI.getActive();
        setGrades(gradesData);
      } catch (err) {
        console.error('Failed to fetch grades:', err);
      }
    };
    fetchGrades();
  }, []);

  // Fetch all questions when filters are active (debounced for search term)
  useEffect(() => {
    if (hasActiveFilters && subjectId) {
      // Use a timeout to debounce search term changes
      const timeoutId = setTimeout(() => {
        fetchAllQuestions();
        setClientSidePage(1); // Reset to first page when filters change
      }, searchTerm ? 500 : 0); // 500ms delay for search, immediate for other filters
      
      return () => clearTimeout(timeoutId);
    } else {
      setAllQuestions([]);
      setClientSidePage(1);
    }
  }, [hasActiveFilters, subjectId, selectedGrade, searchTerm, filterQuestionType, filterDokLevel, filterDifficulty]);

  // Filter questions based on selected filters
  // Use allQuestions when filters are active, otherwise use questions (current page)
  const questionsToFilter = hasActiveFilters ? allQuestions : questions;
  
  const filteredQuestions = questionsToFilter.filter((question) => {
    // Search Filter - Comprehensive search across all question properties and tags
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim();
      const searchNumber = parseInt(searchTerm.trim());
      const isValidNumber = !isNaN(searchNumber) && isFinite(searchNumber);
      
      // Basic text fields
      const questionTextMatch = question.questionText?.toLowerCase().includes(searchLower) || false;
      const standardMatch = question.standard?.toLowerCase().includes(searchLower) || false;
      const contentFocusMatch = question.contentFocus?.toLowerCase().includes(searchLower) || false;
      const optionsMatch = question.options?.some(opt => opt.toLowerCase().includes(searchLower)) || false;
      
      // Difficulty level - search by number (e.g., "220") or as string
      const difficultyMatch = 
        question.difficultyLevel?.toString().includes(searchTerm.trim()) || 
        (isValidNumber && question.difficultyLevel === searchNumber) ||
        false;
      
      // Grade name - search by "Grade 1", "grade 1", "1", etc.
      const gradeNameMatch = question.gradeName?.toLowerCase().includes(searchLower) || false;
      const gradeNumberMatch = question.gradeName && 
        question.gradeName.toLowerCase().replace('grade', '').trim().includes(searchLower.replace('grade', '').trim()) || false;
      const gradeOnlyNumberMatch = question.gradeName && isValidNumber && 
        question.gradeName.toLowerCase().includes(searchNumber.toString()) || false;
      
      // Question type - search by display name (e.g., "Short Answer") or code (e.g., "ShortAnswer")
      const questionTypeDisplayName = getQuestionTypeName(question.questionType);
      const questionTypeMatch = 
        questionTypeDisplayName.toLowerCase().includes(searchLower) ||
        question.questionType?.toLowerCase().includes(searchLower) ||
        false;
      
      // DOK level - search by "DOK 2", "dok 2", "2", etc.
      const dokLevelMatch = 
        (question.dokLevel && `dok ${question.dokLevel}`.includes(searchLower)) ||
        (question.dokLevel && question.dokLevel.toString().includes(searchTerm.trim())) ||
        (isValidNumber && question.dokLevel === searchNumber) ||
        false;
      
      // Competencies/tags - search through competency names and codes
      const competenciesMatch = question.competencies?.some(comp => 
        comp.name?.toLowerCase().includes(searchLower) ||
        comp.code?.toLowerCase().includes(searchLower)
      ) || false;
      
      // Check if any field matches
      if (!questionTextMatch && !standardMatch && !contentFocusMatch && !optionsMatch && 
          !difficultyMatch && !gradeNameMatch && !gradeNumberMatch && !gradeOnlyNumberMatch && 
          !questionTypeMatch && !dokLevelMatch && !competenciesMatch) {
        return false;
      }
    }

    // Question Type Filter - Multi-select
    if (filterQuestionType.length > 0) {
      if (!question.questionType || !filterQuestionType.includes(question.questionType)) {
        return false;
      }
    }

    // DOK Level Filter
    if (filterDokLevel !== 'all') {
      // Only apply DOK filter to ShortAnswer and Essay questions
      if (question.questionType === 'ShortAnswer' || question.questionType === 'Essay') {
        if (question.dokLevel !== filterDokLevel) {
          return false;
        }
      } else {
        // For other question types, if DOK filter is set, exclude them
        // (since they don't have DOK levels)
        return false;
      }
    }

    // Growth Metric Difficulty Filter - Single select dropdown
    if (filterDifficulty !== 'all') {
      const difficulty = question.difficultyLevel;
      let matchesRange = false;
      
      if (filterDifficulty === '100-150' && difficulty >= 100 && difficulty <= 150) {
        matchesRange = true;
      } else if (filterDifficulty === '151-200' && difficulty >= 151 && difficulty <= 200) {
        matchesRange = true;
      } else if (filterDifficulty === '201-250' && difficulty >= 201 && difficulty <= 250) {
        matchesRange = true;
      } else if (filterDifficulty === '251-300' && difficulty >= 251 && difficulty <= 300) {
        matchesRange = true;
      } else if (filterDifficulty === '301-350' && difficulty >= 301 && difficulty <= 350) {
        matchesRange = true;
      }
      
      if (!matchesRange) {
        return false;
      }
    }

    return true;
  });

  // Client-side pagination for filtered questions
  const filteredTotalPages = hasActiveFilters ? Math.ceil(filteredQuestions.length / questionsPerPage) : totalPages;
  const currentPageToUse = hasActiveFilters ? clientSidePage : currentPage;
  
  const paginatedFilteredQuestions = useMemo(() => {
    if (hasActiveFilters) {
      const startIndex = (currentPageToUse - 1) * questionsPerPage;
      const endIndex = startIndex + questionsPerPage;
      return filteredQuestions.slice(startIndex, endIndex);
    }
    return filteredQuestions;
  }, [filteredQuestions, currentPageToUse, hasActiveFilters, questionsPerPage]);

  const handleClientPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= filteredTotalPages) {
      setClientSidePage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Show loading state when fetching all questions (but don't replace the entire component)
  // We'll show a loading indicator in the questions area instead

  if (questions.length === 0 && !hasActiveFilters) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Yet</h3>
        <p className="text-gray-600">Add your first question to get started with assessments.</p>
      </div>
    );
  }

  const displayQuestions = hasActiveFilters ? paginatedFilteredQuestions : (filteredQuestions.length > 0 ? filteredQuestions : questions);
  const displayTotal = hasActiveFilters ? filteredQuestions.length : totalQuestions;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Questions ({displayQuestions.length} of {displayTotal})
            {hasActiveFilters && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Filtered from {totalQuestions} total)
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filter by Grade:</span>
            </div>
            <select
              value={selectedGrade || ''}
              onChange={(e) => onGradeChange(e.target.value ? Number(e.target.value) : null)}
              className={`px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                selectedGrade ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <option value="">All Grades</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Search className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Search Questions</span>
          </div>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={(e) => {
                // Maintain focus if user is still typing
                if (e.relatedTarget !== null) {
                  // Only blur if clicking outside, not if it's a programmatic blur
                  return;
                }
              }}
              placeholder="Search by difficulty (220), grade (Grade 1), type (Short Answer), DOK (DOK 2), tags, or question text..."
              className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus={false}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">Additional Filters</h3>
          </div>
          
          <div className="space-y-4">
            {/* Question Type Filter - Multi-select with icon buttons in one line */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-3">
                Question Type
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'MCQ', label: 'Multiple Choice', icon: List },
                  { value: 'TrueFalse', label: 'True/False', icon: CheckCircle2 },
                  { value: 'ShortAnswer', label: 'Short Answer', icon: Type },
                  { value: 'Essay', label: 'Essay', icon: FileText },
                  { value: 'Matching', label: 'Matching', icon: ArrowLeftRight },
                  { value: 'FillInBlank', label: 'Fill in Blank', icon: Droplets },
                  { value: 'MultipleSelect', label: 'Multiple Select', icon: List }
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = filterQuestionType.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setFilterQuestionType(filterQuestionType.filter(t => t !== type.value));
                        } else {
                          setFilterQuestionType([...filterQuestionType, type.value]);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                      <span className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DOK Level and Difficulty Level Filters - Side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DOK Level Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  DOK Level
                </label>
                <select
                  value={filterDokLevel}
                  onChange={(e) => setFilterDokLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="1">DOK Level 1</option>
                  <option value="2">DOK Level 2</option>
                  <option value="3">DOK Level 3</option>
                  <option value="4">DOK Level 4</option>
                </select>
              </div>

              {/* Growth Metric Difficulty Filter - Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Growth Metric Difficulty
                </label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value === 'all' ? 'all' : e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Ranges</option>
                  <option value="100-150">100-150</option>
                  <option value="151-200">151-200</option>
                  <option value="201-250">201-250</option>
                  <option value="251-300">251-300</option>
                  <option value="301-350">301-350</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || filterQuestionType.length > 0 || filterDokLevel !== 'all' || filterDifficulty !== 'all') && (
            <div className="pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterQuestionType([]);
                  setFilterDokLevel('all');
                  setFilterDifficulty('all');
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {/* Show loading indicator when fetching all questions */}
          {hasActiveFilters && loadingAllQuestions && allQuestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Loading Questions...</h4>
              <p className="text-gray-600">Searching through all questions...</p>
            </div>
          ) : displayQuestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Questions Found</h4>
              <p className="text-gray-600 mb-6">
                {filteredQuestions.length === 0 && questions.length > 0
                  ? 'No questions match your search criteria. Try adjusting your filters or search term.'
                  : selectedGrade 
                    ? `No questions found for the selected grade. Try selecting a different grade or "All Grades".`
                    : 'No questions available for the current filter.'
                }
              </p>
              {(hasActiveFilters || selectedGrade) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterQuestionType([]);
                    setFilterDokLevel('all');
                    setFilterDifficulty('all');
                    if (selectedGrade) {
                      onGradeChange(null);
                    }
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            displayQuestions.map((question: Question) => {
              // Find the original index in the unfiltered questions array
              const originalIndex = questions.findIndex(q => q.id === question.id);
              return (
                <div
                  key={question.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      Question #{originalIndex + 1}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficultyLevel)}`}>
                      {question.difficultyLevel}
                    </span>
                    {question.gradeName && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {question.gradeName}
                      </span>
                    )}
                    {question.questionType && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getQuestionTypeColor(question.questionType)}`}>
                        {getQuestionTypeName(question.questionType)}
                      </span>
                    )}
                    {/* Show DOK Level for Short Answer and Essay questions */}
                    {(question.questionType === 'ShortAnswer' || question.questionType === 'Essay') && question.dokLevel && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        DOK {question.dokLevel}
                      </span>
                    )}
                  </div>
                  <div 
                    className="text-gray-900 font-medium mb-3 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: question.questionText }}
                  />
                  
                  {/* For ShortAnswer and Essay, show description if available */}
                  {(question.questionType === 'ShortAnswer' || question.questionType === 'Essay') && question.questionMetadata?.description && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900 font-medium mb-1">Instructions:</p>
                      <p className="text-sm text-blue-800">{question.questionMetadata.description}</p>
                      {question.questionType === 'ShortAnswer' && (
                        <p className="text-xs text-blue-700 mt-2">
                          <span className="font-medium">Word Limit:</span> Maximum 100 words (Automatic grading)
                        </p>
                      )}
                      {question.questionType === 'Essay' && (
                        <p className="text-xs text-blue-700 mt-2">
                          <span className="font-medium">Grading:</span> Automatic grading (No word limit)
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* For Matching, show matching pairs */}
                  {question.questionType === 'Matching' && question.questionMetadata && question.questionMetadata.leftItems && question.questionMetadata.rightItems ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Column A */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Column A</h4>
                          <div className="space-y-2">
                            {question.questionMetadata.leftItems.map((leftItem: string, leftIdx: number) => {
                              // Find correct match
                              const correctPair = question.questionMetadata.correctPairs?.find((p: any) => p.left === leftIdx);
                              const correctRightIdx = correctPair ? correctPair.right : -1;
                              const correctRightItem = correctRightIdx >= 0 ? question.questionMetadata.rightItems[correctRightIdx] : '';
                              
                              return (
                                <div key={leftIdx} className="p-2 border border-gray-200 rounded bg-gray-50">
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
                              <div key={rightIdx} className="p-2 border border-gray-200 rounded bg-gray-50">
                                <div className="text-sm text-gray-900">
                                  <span className="font-medium">{String.fromCharCode(65 + rightIdx)}.</span> {rightItem}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : question.questionType === 'FillInBlank' && question.questionMetadata && question.questionMetadata.blanks ? (
                    <div className="space-y-3">
                      {question.questionMetadata.blanks.map((blank: any, blankIdx: number) => (
                        <div key={blankIdx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">Blank #{blankIdx + 1}</span>
                          </div>
                          <div className="space-y-2">
                            {blank.options.map((option: string, optIdx: number) => {
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
                                    <span className="text-xs text-green-600 font-medium">(Correct)</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (question.questionType === 'ShortAnswer' || question.questionType === 'Essay') ? (
                    /* For ShortAnswer and Essay, show note about automatic grading */
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-900">
                        <span className="font-medium">Note:</span> Answers will be automatically graded by AI based on Question and Description provided.
                      </p>
                    </div>
                  ) : (
                    /* For other question types, show options */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {question.options.map((option: string, optionIndex: number) => {
                        // Determine if this option is correct based on question type
                        let isCorrect = false;
                        
                        if (question.questionType === 'MultipleSelect') {
                          // For MultipleSelect, parse correctAnswer JSON array
                          if (question.correctAnswer) {
                            try {
                              // Handle both string and already-parsed array
                              let correctIndices;
                              if (typeof question.correctAnswer === 'string') {
                                correctIndices = JSON.parse(question.correctAnswer);
                              } else if (Array.isArray(question.correctAnswer)) {
                                correctIndices = question.correctAnswer;
                              } else {
                                correctIndices = [question.correctOptionIndex];
                              }
                              
                              if (Array.isArray(correctIndices)) {
                                // Check if this option index is in the array of correct indices
                                isCorrect = correctIndices.includes(optionIndex);
                              } else {
                                // Fallback to single correctOptionIndex if not an array
                                isCorrect = optionIndex === question.correctOptionIndex;
                              }
                            } catch (e) {
                              console.error('Error parsing correctAnswer for MultipleSelect:', e, question.correctAnswer);
                              // Fallback to single correctOptionIndex if parsing fails
                              isCorrect = optionIndex === question.correctOptionIndex;
                            }
                          } else {
                            // Fallback to single correctOptionIndex if no correctAnswer
                            isCorrect = optionIndex === question.correctOptionIndex;
                          }
                        } else {
                          // For MCQ and TrueFalse, use correctOptionIndex
                          isCorrect = optionIndex === question.correctOptionIndex;
                        }
                        
                        return (
                          <div
                            key={optionIndex}
                            className={`flex items-center space-x-2 p-2 rounded ${
                              isCorrect
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-gray-50'
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-600">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            <span className={`text-sm ${
                              isCorrect
                                ? 'text-green-800 font-medium'
                                : 'text-gray-700'
                            }`}>
                              {option}
                            </span>
                            {isCorrect && (
                              <span className="text-xs text-green-600 font-medium">(Correct)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={async () => await onEdit(question)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit question"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(question.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {(hasActiveFilters ? filteredTotalPages > 1 : totalPages > 1) && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPageToUse - 1) * questionsPerPage) + 1} to {Math.min(currentPageToUse * questionsPerPage, displayTotal)} of {displayTotal} questions
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => hasActiveFilters ? handleClientPageChange(currentPageToUse - 1) : onPageChange(currentPageToUse - 1)}
                disabled={currentPageToUse === 1}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, filteredTotalPages) }, (_, i) => {
                  let pageNum;
                  if (filteredTotalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPageToUse <= 3) {
                    pageNum = i + 1;
                  } else if (currentPageToUse >= filteredTotalPages - 2) {
                    pageNum = filteredTotalPages - 4 + i;
                  } else {
                    pageNum = currentPageToUse - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => hasActiveFilters ? handleClientPageChange(pageNum) : onPageChange(pageNum)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        pageNum === currentPageToUse
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => hasActiveFilters ? handleClientPageChange(currentPageToUse + 1) : onPageChange(currentPageToUse + 1)}
                disabled={currentPageToUse === filteredTotalPages}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Question</h3>
                <p className="text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {deleting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionList;