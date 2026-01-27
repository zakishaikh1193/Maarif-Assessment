import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import Navigation from '../components/Navigation';
import StudentSidebar from '../components/StudentSidebar';
import { Subject, DetailedAssessmentResults } from '../types';
import { 
  Play, 
  FileText, 
  Target,
  Clock,
  CheckCircle,
  Eye,
  Search,
  X,
  XCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const AssessmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [assessmentDetails, setAssessmentDetails] = useState<DetailedAssessmentResults | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const [assignmentsData, completedAssignmentsData, subjectsData] = await Promise.all([
        studentAPI.getAssignments().catch((err) => {
          console.error('Error fetching active assignments:', err);
          return [];
        }),
        studentAPI.getCompletedAssignments().catch((err) => {
          console.error('Error fetching completed assignments:', err);
          return [];
        }),
        studentAPI.getAvailableSubjects().catch((err) => {
          console.error('Error fetching subjects:', err);
          return [];
        })
      ]);
      
      setSubjects(subjectsData || []);

      // Process active assignments
      const processedAssignments = (assignmentsData || []).map((assignment: any) => ({
        ...assignment,
        isCompleted: false
      }));
      setAssignments(processedAssignments);

      // Process completed assignments
      const processedCompleted = (completedAssignmentsData || []).map((assignment: any) => ({
        ...assignment,
        isCompleted: true
      }));
      
      const sortedCompleted = processedCompleted.sort((a: any, b: any) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });
      setCompletedAssignments(sortedCompleted);

      console.log('📝 Loaded active assignments:', processedAssignments.length);
      console.log('✅ Loaded completed assignments:', sortedCompleted.length);
    } catch (error) {
      console.error('Failed to load assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAssignment = async (assignmentId: number, mode: 'Standard' | 'Adaptive') => {
    try {
      let response;
      if (mode === 'Standard') {
        response = await studentAPI.startStandardAssignment(assignmentId);
      } else {
        response = await studentAPI.startAdaptiveAssignment(assignmentId);
      }
      
      navigate('/assessment', {
        state: {
          assignmentId: response.assignmentId,
          mode: response.mode,
          assessmentId: response.assessmentId,
          timeLimitMinutes: response.timeLimitMinutes,
          question: response.question,
          allQuestions: response.allQuestions,
          assignmentName: response.assignmentName
        }
      });
    } catch (error: any) {
      console.error('Failed to start assignment:', error);
      alert(error.response?.data?.error || 'Failed to start assignment');
    }
  };

  const viewAssessmentDetails = async (assessmentId: number) => {
    try {
      setLoadingDetails(true);
      const detailedResults = await studentAPI.getDetailedResults(assessmentId);
      setAssessmentDetails(detailedResults);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to fetch assessment details:', error);
      alert('Failed to load assessment details. Please try again.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setAssessmentDetails(null);
  };

  // Combine all assessments
  const allAssessments = [
    ...assignments.map(a => ({ ...a, isCompleted: false })),
    ...completedAssignments.map(a => ({ ...a, isCompleted: true }))
  ];

  // Get subjects that have assignments (active or completed)
  const getSubjectsWithAssignments = () => {
    // Get all unique subject IDs from assignments and completed assignments
    const subjectIdsWithAssignments = new Set<number>();
    
    // Add subject IDs from active assignments
    assignments.forEach((assignment: any) => {
      if (assignment.subjectId) {
        subjectIdsWithAssignments.add(assignment.subjectId);
      }
    });
    
    // Add subject IDs from completed assignments
    completedAssignments.forEach((assignment: any) => {
      if (assignment.subjectId) {
        subjectIdsWithAssignments.add(assignment.subjectId);
      }
    });
    
    // Filter subjects to only include those with assignments
    const subjectsWithAssignments = subjects.filter(subject => 
      subjectIdsWithAssignments.has(subject.id)
    );
    
    return subjectsWithAssignments;
  };

  // Filter assessments
  const filteredAssessments = allAssessments.filter(assessment => {
    // Search filter
    const matchesSearch = !searchTerm || 
      assessment.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.subjectName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && !assessment.isCompleted) ||
      (filterStatus === 'completed' && assessment.isCompleted);
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssessments = filteredAssessments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64 pt-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Main Layout with Sidebar */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <StudentSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
          <div className="w-full px-6 py-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessments</h1>
              <p className="text-gray-600">View and manage all your assigned assessments</p>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search assessments by name or subject..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All ({allAssessments.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('active')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'active'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Active ({assignments.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('completed')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'completed'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Completed ({completedAssignments.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Assessments List */}
            {filteredAssessments.length > 0 ? (
              <>
                <div className="space-y-3">
                  {paginatedAssessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    onClick={() => {
                      if (assessment.isCompleted && assessment.assessmentId) {
                        viewAssessmentDetails(assessment.assessmentId);
                      }
                    }}
                    className={`bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all ${
                      assessment.isCompleted 
                        ? 'border-green-200 cursor-pointer hover:border-green-300 hover:bg-green-50' 
                        : 'border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Left Side - Status Icon */}
                      <div className="flex-shrink-0">
                        {assessment.isCompleted ? (
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Middle Section - Assessment Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-bold text-gray-900">{assessment.name}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md ${
                            assessment.mode === 'Standard'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {assessment.mode || 'Standard'}
                          </span>
                          {assessment.isCompleted && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{assessment.subjectName || `Subject ID: ${assessment.subjectId}`}</p>
                        {assessment.description && (
                          <p className="text-xs text-gray-600">{assessment.description}</p>
                        )}
                      </div>

                      {/* Right Side - Actions/Info */}
                      <div className="flex items-center gap-4 flex-shrink-0 flex-wrap">
                        {assessment.isCompleted ? (
                          <>
                            {/* Score */}
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-gray-600 flex-shrink-0" />
                              <div className="text-sm whitespace-nowrap">
                                <span className="font-semibold text-gray-900">{assessment.score || 'N/A'}</span>
                                <span className="text-gray-600 ml-1">Score</span>
                              </div>
                            </div>

                            {/* Correct Answers */}
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-gray-600 flex-shrink-0" />
                              <div className="text-sm whitespace-nowrap">
                                <span className="font-semibold text-gray-900">
                                  {assessment.correctAnswers !== null && assessment.assessmentTotalQuestions 
                                    ? `${assessment.correctAnswers}/${assessment.assessmentTotalQuestions}`
                                    : 'N/A'}
                                </span>
                                <span className="text-gray-600 ml-1">Correct</span>
                              </div>
                            </div>

                            {/* Completion Date */}
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-600 flex-shrink-0" />
                              <div className="text-sm whitespace-nowrap">
                                <span className="font-semibold text-gray-900">
                                  {assessment.completedAt 
                                    ? new Date(assessment.completedAt).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })
                                    : 'N/A'}
                                </span>
                                <span className="text-gray-600 ml-1">Date</span>
                              </div>
                            </div>

                            {/* View Result Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                if (assessment.assessmentId) {
                                  viewAssessmentDetails(assessment.assessmentId);
                                }
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold shadow-sm whitespace-nowrap"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View Result</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              startAssignment(assessment.id, assessment.mode);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold shadow-sm whitespace-nowrap"
                          >
                            <Play className="h-4 w-4" />
                            <span>Start</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                        <span className="font-semibold">
                          {Math.min(endIndex, filteredAssessments.length)}
                        </span>{' '}
                        of <span className="font-semibold">{filteredAssessments.length}</span> assessments
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="px-2 text-gray-400">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">
                  {searchTerm || filterStatus !== 'all'
                    ? 'No assessments found matching your criteria'
                    : 'No assessments available'}
                </p>
                <p className="text-gray-400 text-xs">
                  {searchTerm || filterStatus !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'New assessments will appear here when assigned'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Assessment Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeDetailsModal}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {assessmentDetails?.assessment.subjectName} Assessment
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {assessmentDetails?.assessment.period} {assessmentDetails?.assessment.year} • 
                  Completed on {assessmentDetails?.assessment.dateTaken ? new Date(assessmentDetails.assessment.dateTaken).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <button
                onClick={closeDetailsModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : assessmentDetails ? (
                <>
                  {/* Statistics Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Score</p>
                      <p className="text-2xl font-bold text-blue-600">{assessmentDetails.statistics.currentRIT}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Correct</p>
                      <p className="text-2xl font-bold text-green-600">
                        {assessmentDetails.statistics.correctAnswers}/{assessmentDetails.statistics.totalQuestions}
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Incorrect</p>
                      <p className="text-2xl font-bold text-red-600">{assessmentDetails.statistics.incorrectAnswers}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Accuracy</p>
                      <p className="text-2xl font-bold text-purple-600">{Math.round(assessmentDetails.statistics.accuracy)}%</p>
                    </div>
                  </div>

                  {/* Questions and Answers */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span>Question Analysis</span>
                    </h3>
                    <div className="space-y-4">
                      {assessmentDetails.responses.map((response, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${
                          response.isCorrect 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                response.isCorrect 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {response.questionNumber || index + 1}
                              </div>
                              <div className="flex items-center space-x-2">
                                {response.isCorrect ? (
                                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                <span className="font-medium">
                                  {response.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              Difficulty: {response.difficulty}
                            </div>
                          </div>

                          {/* Special handling for FillInBlank */}
                          {response.questionType === 'FillInBlank' && response.questionMetadata?.blanks && Array.isArray(response.selectedAnswer) ? (
                            <div className="text-gray-900 mb-3">
                              {(() => {
                                let questionText = response.questionText || '';
                                const blanks = response.questionMetadata.blanks;
                                const selectedAnswers = response.selectedAnswer as number[];
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
                                    return `<span class="font-bold underline ${response.isCorrect ? 'text-emerald-600' : 'text-red-600'}">${selectedText}</span>`;
                                  }
                                  return match;
                                });
                                
                                return <div dangerouslySetInnerHTML={{ __html: questionText }} />;
                              })()}
                            </div>
                          ) : response.questionType === 'Matching' && response.questionMetadata ? (
                            // Special handling for Matching
                            <div className="mb-3">
                              <div className="text-gray-900 mb-3" dangerouslySetInnerHTML={{ __html: response.questionText || '' }} />
                              <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full border border-gray-300 rounded-lg">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Column A</th>
                                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Your Match</th>
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
                            // Default display for other question types
                            <>
                              <div className="text-gray-900 mb-3" dangerouslySetInnerHTML={{ __html: response.questionText || '' }} />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Your Answer: </span>
                                  <span className={response.isCorrect ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                                    {response.formattedSelectedAnswer !== undefined 
                                      ? response.formattedSelectedAnswer 
                                      : ((response.questionType === 'ShortAnswer' || response.questionType === 'Essay') 
                                        ? (typeof response.selectedAnswer === 'string' ? response.selectedAnswer : 'N/A')
                                        : (response.options && response.options[response.selectedAnswer as number] || 
                                           (Array.isArray(response.selectedAnswer) 
                                             ? response.selectedAnswer.join(', ') 
                                             : response.selectedAnswer || 'No answer provided')))}
                                  </span>
                                </div>
                                {!response.isCorrect && response.questionType !== 'ShortAnswer' && response.questionType !== 'Essay' && (
                                  <div>
                                    <span className="font-medium text-gray-700">Correct Answer: </span>
                                    <span className="text-emerald-600 font-semibold">
                                      {response.formattedCorrectAnswer !== undefined 
                                        ? response.formattedCorrectAnswer 
                                        : (response.options && response.options[response.correctAnswer as number] || 
                                           (Array.isArray(response.correctAnswer) 
                                             ? response.correctAnswer.join(', ') 
                                             : response.correctAnswer || 'N/A'))}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {/* AI Grading for Short Answer and Essay */}
                              {(response.questionType === 'ShortAnswer' || response.questionType === 'Essay') && response.aiGradingResult && (
                                <div className={`mt-3 p-3 rounded-lg border ${
                                  response.isCorrect 
                                    ? 'bg-emerald-50 border-emerald-200' 
                                    : 'bg-red-50 border-red-200'
                                }`}>
                                  <div className="flex items-start space-x-2">
                                    <BookOpen className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
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
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No assessment details available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentsPage;
