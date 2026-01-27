import React, { useState, useEffect } from 'react';
import { X, User, Building, GraduationCap, Clock, CheckCircle, XCircle, Trophy, Calendar, Search, FileText, Eye, Brain } from 'lucide-react';
import { assignmentsAPI } from '../services/api';

interface AssignmentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: number;
  onViewQuestions?: () => void;
}

interface StudentResult {
  studentId: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  schoolName: string | null;
  gradeName: string | null;
  assignedAt: string;
  dueDate: string | null;
  isCompleted: number;
  completedAt: string | null;
  assessmentId: number | null;
  ritScore: number | null;
  correctAnswers: number | null;
  totalQuestions: number | null;
  dateTaken: string | null;
  durationMinutes: number | null;
}

interface AssignmentData {
  assignment: {
    id: number;
    name: string;
    description: string | null;
    subjectId: number;
    gradeId: number;
    subjectName: string;
    gradeName: string;
  };
  students: StudentResult[];
}

const AssignmentViewModal: React.FC<AssignmentViewModalProps> = ({ isOpen, onClose, assignmentId, onViewQuestions }) => {
  const [data, setData] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [studentResponses, setStudentResponses] = useState<any>(null);
  const [loadingResponses, setLoadingResponses] = useState(false);

  useEffect(() => {
    if (isOpen && assignmentId) {
      fetchAssignmentData();
    } else {
      setData(null);
      setSearchTerm('');
    }
  }, [isOpen, assignmentId]);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assignmentsAPI.getStudents(assignmentId);
      setData(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load assignment data');
      console.error('Error fetching assignment students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = data?.students.filter((student) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      student.username.toLowerCase().includes(searchLower) ||
      (student.schoolName && student.schoolName.toLowerCase().includes(searchLower))
    );
  }) || [];

  const completedStudents = filteredStudents.filter(s => s.isCompleted === 1);
  const pendingStudents = filteredStudents.filter(s => s.isCompleted === 0);

  const handleViewResponses = async (student: StudentResult) => {
    if (!student.assessmentId) {
      alert('No assessment found for this student');
      return;
    }
    
    setSelectedStudent(student);
    setLoadingResponses(true);
    setStudentResponses(null);
    
    try {
      const response = await assignmentsAPI.getStudentResponses(student.assessmentId);
      setStudentResponses(response);
    } catch (err: any) {
      console.error('Error fetching student responses:', err);
      alert(err.response?.data?.error || 'Failed to load student responses');
      setSelectedStudent(null);
    } finally {
      setLoadingResponses(false);
    }
  };

  const closeResponsesModal = () => {
    setSelectedStudent(null);
    setStudentResponses(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assessment Details</h2>
            {data && (
              <p className="text-sm text-gray-600 mt-1">
                {data.assignment.subjectName} • {data.assignment.gradeName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {onViewQuestions && (
              <button
                onClick={onViewQuestions}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <FileText className="h-4 w-4" />
                <span>View All Questions</span>
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
              <p className="text-red-800">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Assignment Info */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{data.assignment.name}</h3>
                {data.assignment.description && (
                  <p className="text-sm text-gray-700">{data.assignment.description}</p>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students by name, username, or school..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">{data.students.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{completedStudents.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{pendingStudents.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Students List */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          School
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Taken
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            No students found
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => (
                          <tr key={student.studentId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {student.firstName && student.lastName
                                      ? `${student.firstName} ${student.lastName}`
                                      : student.username}
                                  </div>
                                  <div className="text-sm text-gray-500">@{student.username}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-900">
                                <Building className="h-4 w-4 text-gray-400 mr-2" />
                                {student.schoolName || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-900">
                                <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                                {student.gradeName || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.isCompleted === 1 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.ritScore !== null ? (
                                <div className="flex items-center">
                                  <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      {student.ritScore}
                                    </div>
                                    {student.correctAnswers !== null && student.totalQuestions !== null && (
                                      <div className="text-xs text-gray-500">
                                        {student.correctAnswers}/{student.totalQuestions} correct
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.dateTaken ? (
                                <div className="flex items-center text-sm text-gray-900">
                                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                  {new Date(student.dateTaken).toLocaleDateString()}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.isCompleted === 1 && student.assessmentId ? (
                                <button
                                  onClick={() => handleViewResponses(student)}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Responses
                                </button>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Student Responses Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Student Responses</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedStudent.firstName && selectedStudent.lastName
                    ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
                    : selectedStudent.username}
                  {studentResponses?.statistics && (
                    <span className="ml-2">
                      • {studentResponses.statistics.correctAnswers}/{studentResponses.statistics.totalQuestions} correct
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={closeResponsesModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingResponses ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                </div>
              ) : studentResponses?.responses ? (
                <div className="space-y-6">
                  {studentResponses.responses.map((response: any, idx: number) => (
                    <div
                      key={idx}
                      className={`border-2 rounded-lg p-4 ${
                        response.isCorrect
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-700">
                            Question {response.questionNumber}
                          </span>
                          {response.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        {response.difficulty && (
                          <span className="text-sm text-gray-500">
                            Difficulty: {response.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Special handling for FillInBlank - show question with answers integrated */}
                      {response.questionType === 'FillInBlank' && response.questionMetadata?.blanks && Array.isArray(response.selectedAnswer) ? (
                        <div className="text-gray-900 mb-3">
                          {(() => {
                            // Parse question text and replace blanks with selected answers
                            let questionText = response.questionText || '';
                            const blanks = response.questionMetadata.blanks;
                            const selectedAnswers = response.selectedAnswer as number[];
                            
                            // Replace each blank placeholder sequentially
                            const blankPattern = /(___+|\[blank\]|\[BLANK\]|\{[0-9]+\})/gi;
                            let matchCount = 0;
                            
                            questionText = questionText.replace(blankPattern, (match: string) => {
                              if (matchCount < blanks.length && matchCount < selectedAnswers.length) {
                                const blank = blanks[matchCount];
                                const selectedIndex = selectedAnswers[matchCount];
                                const selectedText = blank.options && blank.options[selectedIndex] !== undefined
                                  ? blank.options[selectedIndex]
                                  : match;
                                
                                matchCount++;
                                return `<span class="font-bold underline text-blue-600">${selectedText}</span>`;
                              }
                              return match;
                            });
                            
                            return <div dangerouslySetInnerHTML={{ __html: questionText }} />;
                          })()}
                        </div>
                      ) : response.questionType === 'Matching' && response.questionMetadata ? (
                        // Special handling for Matching - show in table format
                        <div className="mb-3">
                          <div className="text-gray-900 mb-3" dangerouslySetInnerHTML={{ __html: response.questionText }} />
                          <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full border border-gray-300 rounded-lg">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Column A</th>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Student's Match</th>
                                  {!response.isCorrect && (
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-emerald-700 border-b border-gray-300">Correct Match</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const leftItems = response.questionMetadata.leftItems || [];
                                  const rightItems = response.questionMetadata.rightItems || [];
                                  const selectedAnswers = Array.isArray(response.selectedAnswer) 
                                    ? response.selectedAnswer as number[] 
                                    : [];
                                  
                                  // Get correct pairs
                                  let correctPairs: any[] = [];
                                  if (response.correctAnswer) {
                                    try {
                                      const correctData = typeof response.correctAnswer === 'string' 
                                        ? JSON.parse(response.correctAnswer) 
                                        : response.correctAnswer;
                                      
                                      if (Array.isArray(correctData)) {
                                        correctPairs = correctData;
                                      } else if (typeof correctData === 'string' && correctData.includes('-')) {
                                        correctPairs = correctData.split(',').map((pair: string) => {
                                          const [leftIdx, rightIdx] = pair.split('-').map(Number);
                                          return { left: leftIdx, right: rightIdx };
                                        });
                                      }
                                    } catch (e) {
                                      console.error('Error parsing correct pairs:', e);
                                    }
                                  }
                                  
                                  return leftItems.map((leftItem: string, index: number) => {
                                    const selectedRightIdx = selectedAnswers[index];
                                    const selectedRightItem = rightItems[selectedRightIdx] || 'N/A';
                                    
                                    const correctPair = correctPairs.find((p: any) => p.left === index);
                                    const correctRightItem = correctPair 
                                      ? (rightItems[correctPair.right] || 'N/A')
                                      : null;
                                    
                                    const isMatchCorrect = correctPair && correctPair.right === selectedRightIdx;
                                    
                                    return (
                                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-2 text-sm text-gray-900 border-b border-gray-200">{leftItem}</td>
                                        <td className={`px-4 py-2 text-sm border-b border-gray-200 ${
                                          isMatchCorrect ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'
                                        }`}>
                                          {selectedRightItem}
                                        </td>
                                        {!response.isCorrect && (
                                          <td className="px-4 py-2 text-sm text-emerald-600 font-medium border-b border-gray-200">
                                            {correctRightItem}
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        // Default display for other question types (MCQ, TrueFalse, MultipleSelect, ShortAnswer, Essay)
                        <>
                          <div className="text-gray-900 mb-4" dangerouslySetInnerHTML={{ __html: response.questionText }} />

                          {response.options && response.options.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {response.options.map((option: string, optIdx: number) => {
                                const isSelected = Array.isArray(response.selectedAnswer)
                                  ? response.selectedAnswer.includes(optIdx)
                                  : response.selectedAnswer === optIdx || response.selectedAnswer === String(optIdx);
                                const isCorrect = Array.isArray(response.correctAnswer)
                                  ? response.correctAnswer.includes(optIdx)
                                  : response.correctAnswer === optIdx || response.correctAnswer === String(optIdx);

                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-3 rounded-lg border-2 ${
                                      isCorrect && isSelected
                                        ? 'border-emerald-500 bg-emerald-100'
                                        : isCorrect
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : isSelected
                                        ? 'border-red-500 bg-red-100'
                                        : 'border-gray-200 bg-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isCorrect && (
                                        <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                      )}
                                      {isSelected && !isCorrect && (
                                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                      )}
                                      {isSelected && isCorrect && (
                                        <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                      )}
                                      <span
                                        className={`text-sm ${isSelected ? 'font-medium' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: option }}
                                      />
                                      <div className="ml-auto flex items-center gap-2">
                                        {isSelected && isCorrect && (
                                          <>
                                            <span className="text-xs font-semibold text-emerald-700">
                                              Student's Answer
                                            </span>
                                            <span className="text-xs text-emerald-600">•</span>
                                            <span className="text-xs font-semibold text-emerald-700">
                                              Correct
                                            </span>
                                          </>
                                        )}
                                        {isCorrect && !isSelected && (
                                          <span className="text-xs font-semibold text-emerald-700">
                                            Correct Answer
                                          </span>
                                        )}
                                        {isSelected && !isCorrect && (
                                          <span className="text-xs font-semibold text-red-700">
                                            Student's Answer
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Default display for other question types (MCQ, TrueFalse, MultipleSelect, ShortAnswer, Essay) */}
                          {response.questionType !== 'FillInBlank' && response.questionType !== 'Matching' && (
                            <>
                              {/* For ShortAnswer and Essay, show answer in a box */}
                              {(response.questionType === 'ShortAnswer' || response.questionType === 'Essay') ? (
                                <div className="mb-3">
                                  <span className="font-medium text-gray-700">Student's Answer: </span>
                                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-800">
                                      {response.formattedSelectedAnswer || (typeof response.selectedAnswer === 'string' ? response.selectedAnswer : 'N/A')}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                                  <div>
                                    <span className="font-medium text-gray-700">Student's Answer: </span>
                                    <span className={response.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                                      {response.formattedSelectedAnswer !== undefined 
                                        ? response.formattedSelectedAnswer 
                                        : (response.options && response.options[response.selectedAnswer as number] || 'N/A')}
                                    </span>
                                  </div>
                                  {!response.isCorrect && (
                                    <div>
                                      <span className="font-medium text-gray-700">Correct Answer: </span>
                                      <span className="text-emerald-600">
                                        {response.formattedCorrectAnswer !== undefined 
                                          ? response.formattedCorrectAnswer 
                                          : (response.options && response.options[response.correctAnswer as number] || 'N/A')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}

                      {/* Show AI Grading Reason for Short Answer and Essay - matches student page exactly */}
                      {(response.questionType === 'ShortAnswer' || response.questionType === 'Essay') && response.aiGradingResult && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          response.isCorrect 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-start space-x-2">
                            <Brain className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                              response.isCorrect ? 'text-emerald-600' : 'text-red-600'
                            }`} />
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                response.isCorrect ? 'text-emerald-800' : 'text-red-800'
                              }`}>
                                AI Grading Feedback:
                              </p>
                              <p className={`text-sm mt-1 ${
                                response.isCorrect ? 'text-emerald-700' : 'text-red-700'
                              }`}>
                                {response.aiGradingResult.reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No responses found for this student
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200">
              <button
                onClick={closeResponsesModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentViewModal;
