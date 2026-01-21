import React, { useState, useEffect } from 'react';
import { Question, Grade } from '../types';
import { adminAPI, gradesAPI } from '../services/api';
import { Edit, Trash2, AlertTriangle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

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
  onGradeChange
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);

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

  const getDifficultyColor = (level: number) => {
    if (level <= 150) return 'bg-green-100 text-green-800';
    if (level <= 200) return 'bg-yellow-100 text-yellow-800';
    if (level <= 250) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 150) return 'Easy';
    if (level <= 200) return 'Medium-Low';
    if (level <= 250) return 'Medium-High';
    return 'Hard';
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



  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Yet</h3>
        <p className="text-gray-600">Add your first question to get started with assessments.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Questions ({questions.length} of {totalQuestions})
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
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-3">🔍</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h4>
              <p className="text-gray-600">
                {selectedGrade 
                  ? `No questions found for the selected grade. Try selecting a different grade or "All Grades".`
                  : 'No questions available for the current filter.'
                }
              </p>
            </div>
          ) : (
            questions.map((question: Question, index: number) => (
            <div
              key={question.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      Question #{index + 1}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficultyLevel)}`}>
                      {getDifficultyLabel(question.difficultyLevel)} ({question.difficultyLevel})
                    </span>
                    {question.gradeName && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {question.gradeName}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 font-medium mb-3">{question.questionText}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {question.options.map((option: string, optionIndex: number) => (
                      <div
                        key={optionIndex}
                        className={`flex items-center space-x-2 p-2 rounded ${
                          optionIndex === question.correctOptionIndex
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-600">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        <span className={`text-sm ${
                          optionIndex === question.correctOptionIndex
                            ? 'text-green-800 font-medium'
                            : 'text-gray-700'
                        }`}>
                          {option}
                        </span>
                        {optionIndex === question.correctOptionIndex && (
                          <span className="text-xs text-green-600 font-medium">(Correct)</span>
                        )}
                      </div>
                    ))}
                  </div>
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
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalQuestions)} of {totalQuestions} questions
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        pageNum === currentPage
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
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
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