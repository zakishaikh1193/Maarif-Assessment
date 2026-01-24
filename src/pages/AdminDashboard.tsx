import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Subject, Question, AdminStats, School, Grade, Competency } from '../types';
import { subjectsAPI, adminAPI, schoolsAPI, gradesAPI, studentsAPI } from '../services/api';
import QuestionForm from '../components/QuestionForm';
import QuestionList from '../components/QuestionList';
import SubjectForm from '../components/SubjectForm';
import SubjectList from '../components/SubjectList';
import SchoolList from '../components/SchoolList';
import GradeList from '../components/GradeList';
import StudentList from '../components/StudentList';
import AdminStatsCard from '../components/AdminStatsCard';
import GrowthOverTimeChart from '../components/GrowthOverTimeChart';
import Navigation from '../components/Navigation';
import AssessmentConfigList from '../components/AssessmentConfigList';
import CompetencyList from '../components/CompetencyList';
import SubjectPerformanceDashboard from '../components/SubjectPerformanceDashboard';
import CompetencyMasteryDashboard from '../components/CompetencyMasteryDashboard';
import CompetencyForm from '../components/CompetencyForm';
import CompetencyAnalytics from '../components/CompetencyAnalytics';
import CSVImportModal from '../components/CSVImportModal';
import QuestionCSVImportModal from '../components/QuestionCSVImportModal';
import SSOSettings from '../components/SSOSettings';
import SaudiArabiaMap from '../components/SaudiArabiaMap';
import { Plus, BookOpen, Users, FileQuestion, BarChart3, TrendingUp, User, Settings, Building, GraduationCap, Clock, Target, Brain, Upload, Database, Activity, Zap, Key, FileText, ChevronDown, ChevronRight, AlertTriangle, ArrowDownRight, Trophy } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topPerformers, setTopPerformers] = useState<Array<{
    studentId: number;
    studentName: string;
    schoolName: string;
    highestScore: number;
    subjectName: string;
  }>>([]);
  const [topPerformersLoading, setTopPerformersLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | null>(null);
  
  // Growth chart states
  // Default to 'configs' (Assessments) as first tab, or use state from navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config' | 'reports' | 'students' | 'questions' | 'growth' | 'subjects' | 'schools' | 'grades' | 'configs' | 'competencies' | 'performance' | 'competency-analytics' | 'sso'>(
    (location.state as any)?.activeTab || 'dashboard'
  );
  const [, setStudents] = useState<Array<{id: number, username: string, firstName?: string, lastName?: string}>>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [growthSubTab, setGrowthSubTab] = useState<'growth' | 'competency' | 'performance'>('performance');
  const [competencyScores, setCompetencyScores] = useState<any[]>([]);
  const [competencyGrowthData, setCompetencyGrowthData] = useState<any[]>([]);
  const [competencyLoading, setCompetencyLoading] = useState(false);

  // Cascading filter states for growth analysis
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Array<{id: number, username: string, firstName?: string, lastName?: string, schoolName?: string, gradeName?: string}>>([]);
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  // Subjects management states
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Schools management states - kept for potential future use
  // const [showSchoolForm, setShowSchoolForm] = useState(false);
  // const [editingSchool, setEditingSchool] = useState<School | null>(null);
  // const [schoolsLoading, setSchoolsLoading] = useState(false);

  // Grades management states - kept for potential future use
  // const [showGradeForm, setShowGradeForm] = useState(false);
  // const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  // const [gradesLoading, setGradesLoading] = useState(false);

  // Competencies management states
  const [showCompetencyForm, setShowCompetencyForm] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [competencyRefreshTrigger, setCompetencyRefreshTrigger] = useState(0);

  // CSV Import states
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [showQuestionCSVImportModal, setShowQuestionCSVImportModal] = useState(false);
  const [studentRefreshTrigger, setStudentRefreshTrigger] = useState(0);

  // Config dropdown state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Reports dropdown state
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  // Auto-expand config dropdown if one of its children is active
  useEffect(() => {
    if (['schools', 'students', 'grades', 'subjects', 'competencies'].includes(activeTab)) {
      setIsConfigOpen(true);
    }
  }, [activeTab]);

  // Auto-expand reports dropdown if one of its children is active
  useEffect(() => {
    if (['growth', 'performance', 'competency-analytics'].includes(activeTab)) {
      setIsReportsOpen(true);
    }
  }, [activeTab]);

  useEffect(() => {
    loadInitialData();
    loadTopPerformers();
  }, []);

  // Load top performing students
  const loadTopPerformers = async () => {
    setTopPerformersLoading(true);
    try {
      const response = await adminAPI.getTopPerformers();
      setTopPerformers(response);
    } catch (error) {
      console.error('Failed to load top performers:', error);
      setTopPerformers([]);
    } finally {
      setTopPerformersLoading(false);
    }
  };

  // Update active tab when location state changes
  useEffect(() => {
    if ((location.state as any)?.activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedSubject) {
      setSelectedGradeFilter(null); // Reset grade filter when subject changes
      loadQuestions(selectedSubject.id, 1);
    }
  }, [selectedSubject]);



  // Load growth data when student and subject are selected
  useEffect(() => {
    if (activeTab === 'growth' && selectedStudent && selectedSubject) {
      setGrowthLoading(true);
      setGrowthData(null);
      adminAPI.getStudentGrowth(selectedStudent, selectedSubject.id)
        .then(data => {
          setGrowthData(data);
          setGrowthLoading(false);
        })
        .catch(error => {
          console.error('Error fetching growth data:', error);
          setGrowthLoading(false);
        });
    }
  }, [activeTab, selectedStudent, selectedSubject]);

  // Load competency data when student and subject are selected
  useEffect(() => {
    if (activeTab === 'growth' && selectedStudent && selectedSubject && growthSubTab === 'competency') {
      setCompetencyLoading(true);
      
      // Import the API function
      import('../services/api').then(({ competenciesAPI }) => {
        const promises = [];
        
        // Get latest competency scores for the student
        promises.push(
          competenciesAPI.getStudentCompetencyScores(selectedStudent)
            .then(data => setCompetencyScores(data))
            .catch(error => {
              console.error('Error fetching competency scores:', error);
              setCompetencyScores([]);
            })
        );
        
        // Get competency growth data
        promises.push(
          competenciesAPI.getStudentCompetencyGrowth(selectedStudent, selectedSubject.id)
            .then(data => setCompetencyGrowthData(data))
            .catch(error => {
              console.error('Error fetching competency growth:', error);
              setCompetencyGrowthData([]);
            })
        );
        
        Promise.all(promises).finally(() => {
          setCompetencyLoading(false);
        });
      });
    }
  }, [activeTab, selectedStudent, selectedSubject, growthSubTab]);

  // Cascading filter logic
  useEffect(() => {
    if (selectedSchool && selectedGrade) {
      // Load students for selected school and grade
      studentsAPI.getBySchoolAndGrade(selectedSchool, selectedGrade)
        .then(data => {
          setFilteredStudents(data);
          setSelectedStudent(null); // Reset student selection
        })
        .catch(error => {
          console.error('Error fetching students by school and grade:', error);
          setFilteredStudents([]);
        });
    } else {
      setFilteredStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedSchool, selectedGrade]);

  // Reset filters when school changes
  useEffect(() => {
    if (selectedSchool === null) {
      setSelectedGrade(null);
      setSelectedStudent(null);
      setFilteredStudents([]);
    }
  }, [selectedSchool]);

  const loadInitialData = async () => {
    try {
      const [subjectsData, statsData, studentsData, schoolsData, gradesData] = await Promise.all([
        subjectsAPI.getAll(),
        adminAPI.getStats(),
        adminAPI.getStudents(),
        schoolsAPI.getAll(1, 1000), // Load all schools for the map (use high limit)
        gradesAPI.getActive()
      ]);
      setSubjects(subjectsData);
      setStats(statsData);
      setStudents(studentsData);
      // schoolsAPI.getAll() returns { schools: [...], pagination: {...} }
      setSchools(schoolsData.schools || (Array.isArray(schoolsData) ? schoolsData : []));
      setGrades(gradesData);
      if (subjectsData.length > 0) {
        setSelectedSubject(subjectsData[0]);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (subjectId: number, page: number = 1) => {
    return loadQuestionsWithGrade(subjectId, page, selectedGradeFilter);
  };

  const handlePageChange = (page: number) => {
    if (selectedSubject) {
      loadQuestions(selectedSubject.id, page);
    }
  };

  const handleGradeChange = (gradeId: number | null) => {
    setSelectedGradeFilter(gradeId);
    if (selectedSubject) {
      // Pass the gradeId directly instead of relying on state
      loadQuestionsWithGrade(selectedSubject.id, 1, gradeId);
    }
  };

  const loadQuestionsWithGrade = async (subjectId: number, page: number = 1, gradeId: number | null = null) => {
    try {
      const response = await adminAPI.getQuestions(subjectId, page, 20, gradeId);
      setQuestions(response.questions);
      setCurrentPage(response.pagination.currentPage);
      setTotalPages(response.pagination.totalPages);
      setTotalQuestions(response.pagination.totalQuestions || 0);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const handleQuestionCreated = () => {
    setShowQuestionForm(false);
    if (selectedSubject) {
      loadQuestions(selectedSubject.id, 1);
    }
    loadInitialData();
  };

  const handleQuestionUpdated = () => {
    setEditingQuestion(null);
    setShowQuestionForm(false);
    if (selectedSubject) {
      loadQuestions(selectedSubject.id, 1);
    }
  };

  const handleQuestionDeleted = () => {
    if (selectedSubject) {
      loadQuestions(selectedSubject.id, 1);
    }
    loadInitialData();
  };

  // Subjects management functions
  const handleSubjectCreated = (newSubject: Subject) => {
    setSubjects(prev => [...prev, newSubject]);
    setShowSubjectForm(false);
    setEditingSubject(null);
    loadInitialData(); // Refresh stats
  };

  const handleSubjectUpdated = (updatedSubject: Subject) => {
    setSubjects(prev => prev.map(s => s.id === updatedSubject.id ? updatedSubject : s));
    setShowSubjectForm(false);
    setEditingSubject(null);
    loadInitialData(); // Refresh stats
  };

  const handleSubjectDeleted = async (subjectId: number) => {
    try {
      await subjectsAPI.delete(subjectId);
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
      
      // If the deleted subject was selected, select the first available subject
      if (selectedSubject?.id === subjectId) {
        const remainingSubjects = subjects.filter(s => s.id !== subjectId);
        if (remainingSubjects.length > 0) {
          setSelectedSubject(remainingSubjects[0]);
        } else {
          setSelectedSubject(null);
        }
      }
      
      loadInitialData(); // Refresh stats
    } catch (error) {
      console.error('Failed to delete subject:', error);
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setShowSubjectForm(true);
  };

  const handleAddSubject = () => {
    setEditingSubject(null);
    setShowSubjectForm(true);
  };

  const handleEditQuestion = async (question: Question) => {
    try {
      const freshQuestion = await adminAPI.getQuestion(question.id);
      setEditingQuestion(freshQuestion);
      setShowQuestionForm(true);
    } catch (error) {
      console.error('Failed to fetch question for editing:', error);
      setEditingQuestion(question);
      setShowQuestionForm(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navigation />
        </div>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }
  

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navigation />
      </div>
      
      <div className="flex pt-16">
        {/* Fixed Sidebar */}
        <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 shadow-sm overflow-y-auto z-40">
          <div className="p-4">
            <nav className="space-y-1">
            {/* Dashboard Button */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm font-medium">DASHBOARD</span>
            </button>

            {/* Config Dropdown */}
            <div>
              <button
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  ['schools', 'students', 'grades', 'subjects', 'competencies'].includes(activeTab)
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5" />
                  <span className="text-sm font-medium">CONFIG</span>
                </div>
                {isConfigOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {/* Config Dropdown Items */}
              {isConfigOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                  <button
                    onClick={() => setActiveTab('schools')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                      activeTab === 'schools'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Building className="h-4 w-4" />
                    <span className="text-sm font-medium">SCHOOLS</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('students')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                      activeTab === 'students'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">STUDENTS</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('grades')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                      activeTab === 'grades'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-sm font-medium">GRADES</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('subjects')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                      activeTab === 'subjects'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm font-medium">SUBJECTS</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('competencies')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                      activeTab === 'competencies'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-medium">COMPETENCIES</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab('questions')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'questions'
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FileQuestion className="h-5 w-5" />
              <span className="text-sm font-medium">QUESTIONS</span>
            </button>

            <button
              onClick={() => setActiveTab('configs')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'configs'
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">ASSESSMENTS</span>
            </button>

            {/* Reports Dropdown */}
            <div>
              <button
                onClick={() => setIsReportsOpen(!isReportsOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  ['reports', 'growth', 'performance', 'competency-analytics'].includes(activeTab)
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">REPORTS</span>
                </div>
                {isReportsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {/* Reports Dropdown Items */}
              {isReportsOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                  <button
                    onClick={() => setActiveTab('growth')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                      activeTab === 'growth'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">GROWTH</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('competency-analytics')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                      activeTab === 'competency-analytics'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Brain className="h-4 w-4" />
                    <span className="text-sm font-medium">COMPETENCIES</span>
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 my-2"></div>

            <button
              onClick={() => setActiveTab('sso')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'sso'
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Key className="h-5 w-5" />
              <span className="text-sm font-medium">SSO SETTINGS</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
        <main className="flex-1 ml-64 min-h-[calc(100vh-4rem)] bg-gray-50">
          <div className="w-full px-6 py-8">
            {/* Dashboard Tab Content */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                {stats && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Overview Cards 2x2 Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Schools Overview Card */}
                        <div 
                          onClick={() => setActiveTab('schools')}
                          className="group relative bg-gradient-to-br from-white to-red-50 rounded-xl shadow-lg border-2 border-red-100 p-6 hover:shadow-2xl hover:scale-105 hover:border-red-300 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-red-400/0 to-red-400/0 group-hover:from-red-400/10 group-hover:to-red-400/5 transition-all duration-300"></div>
                          <div className="relative flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <Building className="h-7 w-7 text-white" />
                              </div>
                              <div>
                                <p className="text-lg font-bold text-gray-900 mb-1">{schools.length || 0}</p>
                                <p className="text-sm font-semibold text-gray-700">Schools</p>
                                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>↓ 10% vs last month</span>
                                </p>
                              </div>
                            </div>
                            <ArrowDownRight className="h-5 w-5 text-red-400 group-hover:text-red-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                          </div>
                          <div className="absolute top-0 right-0 w-20 h-20 bg-red-200/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                        </div>

                        {/* Students Overview Card */}
                        <div 
                          onClick={() => setActiveTab('students')}
                          className="group relative bg-gradient-to-br from-white to-yellow-50 rounded-xl shadow-lg border-2 border-yellow-100 p-6 hover:shadow-2xl hover:scale-105 hover:border-yellow-300 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-yellow-400/0 group-hover:from-yellow-400/10 group-hover:to-yellow-400/5 transition-all duration-300"></div>
                          <div className="relative flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <Users className="h-7 w-7 text-white" />
                              </div>
                              <div>
                                <p className="text-lg font-bold text-gray-900 mb-1">{stats.totalStudents || 0}</p>
                                <p className="text-sm font-semibold text-gray-700">Students</p>
                                <p className="text-xs text-yellow-600 mt-1 font-medium flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>↓ 10% vs last month</span>
                                </p>
                              </div>
                            </div>
                            <ArrowDownRight className="h-5 w-5 text-yellow-400 group-hover:text-yellow-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                          </div>
                          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-200/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                        </div>

                        {/* Assessments Overview Card */}
                        <div 
                          onClick={() => setActiveTab('configs')}
                          className="group relative bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg border-2 border-green-100 p-6 hover:shadow-2xl hover:scale-105 hover:border-green-300 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-green-400/0 to-green-400/0 group-hover:from-green-400/10 group-hover:to-green-400/5 transition-all duration-300"></div>
                          <div className="relative flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <BarChart3 className="h-7 w-7 text-white" />
                              </div>
                              <div>
                                <p className="text-lg font-bold text-gray-900 mb-1">{stats.totalAssessments || 0}</p>
                                <p className="text-sm font-semibold text-gray-700">Assessments</p>
                                <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>↓ 10% vs last month</span>
                                </p>
                              </div>
                            </div>
                            <ArrowDownRight className="h-5 w-5 text-green-400 group-hover:text-green-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                          </div>
                          <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                        </div>

                        {/* Questions Overview Card */}
                        <div 
                          onClick={() => setActiveTab('questions')}
                          className="group relative bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border-2 border-blue-100 p-6 hover:shadow-2xl hover:scale-105 hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-blue-400/0 group-hover:from-blue-400/10 group-hover:to-blue-400/5 transition-all duration-300"></div>
                          <div className="relative flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <FileQuestion className="h-7 w-7 text-white" />
                              </div>
                              <div>
                                <p className="text-lg font-bold text-gray-900 mb-1">{stats.totalQuestions || 0}</p>
                                <p className="text-sm font-semibold text-gray-700">Questions</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {stats.subjectDistribution?.slice(0, 3).map((subject: any, idx: number) => (
                                    <div key={idx} className="px-2 py-0.5 bg-blue-100 rounded-md">
                                      <p className="text-[10px] font-semibold text-blue-700">{subject.question_count || 0} {subject.name.substring(0, 3)}</p>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-blue-600 mt-1 font-medium flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>↓ 10% vs last month</span>
                                </p>
                              </div>
                            </div>
                            <ArrowDownRight className="h-5 w-5 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                          </div>
                          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                        </div>
                      </div>

                      {/* Schools Overview Section */}
                      <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-white rounded-xl shadow-xl border-2 border-blue-100 p-6 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl"></div>
                        <div className="relative">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Building className="h-6 w-6 text-blue-600" />
                                Schools Overview
                              </h3>
                              <p className="text-sm text-gray-600">
                                Track and manage all schools in the Maarif Assessment system. Monitor performance across different institutions.
                              </p>
                            </div>
                          </div>
                          {/* Saudi Arabia Map with School Locations and Filters */}
                          <SaudiArabiaMap schools={schools} />
                        </div>
                      </div>

                      {/* Bottom Row - Two Charts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Subject Distribution (Enhanced) */}
                        <div className="group relative bg-gradient-to-br from-white to-purple-50/30 rounded-xl shadow-lg border-2 border-purple-100 p-6 overflow-hidden">
                          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-200/20 rounded-full blur-2xl"></div>
                          <div className="relative">
                            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                              <BookOpen className="h-6 w-6 text-purple-600" />
                              Subject Distribution
                            </h3>
                            <div className="flex items-center gap-8">
                              <div className="flex-1">
                                {/* Donut chart */}
                                <div className="relative w-56 h-56 mx-auto">
                                  <svg className="transform -rotate-90" viewBox="0 0 100 100">
                                    {stats.subjectDistribution && stats.subjectDistribution.length > 0 && (() => {
                                      const total = stats.subjectDistribution.reduce((sum: number, s: any) => sum + (s.question_count || 0), 0);
                                      let currentAngle = 0;
                                      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
                                      return stats.subjectDistribution.slice(0, 5).map((subject: any, idx: number) => {
                                        const percentage = total > 0 ? (subject.question_count / total) * 100 : 0;
                                        const angle = (percentage / 100) * 360;
                                        const startAngle = currentAngle;
                                        currentAngle += angle;
                                        const largeArc = angle > 180 ? 1 : 0;
                                        const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                                        const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                                        const x2 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
                                        const y2 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
                                        return (
                                          <path
                                            key={idx}
                                            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                            fill={colors[idx % colors.length]}
                                          />
                                        );
                                      });
                                    })()}
                                    <circle cx="50" cy="50" r="25" fill="white" className="drop-shadow-sm" />
                                  </svg>
                                </div>
                              </div>
                              <div className="flex-1 space-y-4">
                                {stats.subjectDistribution?.slice(0, 4).map((subject: any, idx: number) => {
                                  const colors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-green-100 text-green-700'];
                                  return (
                                    <div key={idx} className={`flex items-center gap-3 p-4 rounded-lg ${colors[idx % colors.length]}`}>
                                      <div className={`h-4 w-4 rounded-full ${colors[idx % colors.length].split(' ')[0]}`}></div>
                                      <span className="text-base font-semibold">{subject.name}</span>
                                      <span className="text-base font-bold ml-auto">{subject.question_count || 0}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Performance by Grade (Enhanced) */}
                        <div className="group relative bg-gradient-to-br from-white to-indigo-50/30 rounded-xl shadow-lg border-2 border-indigo-100 p-6 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-200/20 rounded-full blur-2xl"></div>
                          <div className="relative">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-indigo-600" />
                              Performance by Grade
                            </h3>
                            <div className="space-y-4">
                              {stats.gradePerformance && stats.gradePerformance.length > 0 ? (
                                stats.gradePerformance.slice(0, 5).map((gradePerf: any, idx: number) => {
                                  const colors = [
                                    { bg: 'bg-gradient-to-r from-red-500 to-red-600', text: 'text-red-700' },
                                    { bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600', text: 'text-yellow-700' },
                                    { bg: 'bg-gradient-to-r from-green-500 to-green-600', text: 'text-green-700' },
                                    { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-blue-700' },
                                    { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', text: 'text-gray-700' }
                                  ];
                                  const width = gradePerf.performance_percentage || 0;
                                  const colorSet = colors[idx % colors.length];
                                  return (
                                    <div key={gradePerf.id} className="group/item">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-800">{gradePerf.display_name || `Grade ${gradePerf.id}`}</span>
                                        <span className={`text-xs font-bold ${colorSet.text}`}>{width}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                                        <div
                                          className={`h-full rounded-full ${colorSet.bg} transition-all duration-1000 ease-out group-hover/item:scale-y-110`}
                                          style={{ width: `${width}%` }}
                                        >
                                          <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                grades.slice(0, 5).map((grade, idx) => {
                                  const colors = [
                                    { bg: 'bg-gradient-to-r from-red-500 to-red-600', text: 'text-red-700' },
                                    { bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600', text: 'text-yellow-700' },
                                    { bg: 'bg-gradient-to-r from-green-500 to-green-600', text: 'text-green-700' },
                                    { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-blue-700' },
                                    { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', text: 'text-gray-700' }
                                  ];
                                  const width = 0; // No data available
                                  const colorSet = colors[idx % colors.length];
                                  return (
                                    <div key={grade.id} className="group/item">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-800">{grade.display_name || `Grade ${grade.id}`}</span>
                                        <span className={`text-xs font-bold ${colorSet.text}`}>N/A</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                                        <div
                                          className={`h-full rounded-full ${colorSet.bg} transition-all duration-1000 ease-out group-hover/item:scale-y-110`}
                                          style={{ width: `${width}%` }}
                                        >
                                          <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                              <span className="text-xs font-medium text-gray-500">Low</span>
                              <span className="text-xs font-medium text-gray-500">Medium</span>
                              <span className="text-xs font-medium text-gray-500">High</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                      {/* Subject Distribution List */}
                      <div className="relative bg-gradient-to-br from-white to-cyan-50/30 rounded-xl shadow-lg border-2 border-cyan-100 p-5 hover:shadow-xl transition-all duration-300 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl"></div>
                        <div className="relative">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-cyan-600" />
                            Subject Distribution
                          </h3>
                          <div className="space-y-3">
                            {stats.subjectDistribution?.slice(0, 4).map((subject: any, idx: number) => {
                              const icons = [Users, Building, AlertTriangle, Target];
                              const Icon = icons[idx % icons.length];
                              const colors = [
                                'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg',
                                'bg-gray-50 hover:bg-gray-100 text-gray-700',
                                'bg-gray-50 hover:bg-gray-100 text-gray-700',
                                'bg-gray-50 hover:bg-gray-100 text-gray-700'
                              ];
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-3 rounded-xl ${colors[idx]} cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-300 group`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${idx === 0 ? 'bg-white/20' : 'bg-gray-200'} group-hover:scale-110 transition-transform duration-300`}>
                                      <Icon className={`h-5 w-5 ${idx === 0 ? 'text-white' : 'text-gray-600'}`} />
                                    </div>
                                    <span className={`text-sm font-semibold ${idx === 0 ? 'text-white' : 'text-gray-700'}`}>
                                      {subject.question_count || 0} {subject.name}
                                    </span>
                                  </div>
                                  {idx === 0 && <ArrowDownRight className="h-4 w-4 text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Best Performance Section */}
                      <div className="relative bg-gradient-to-br from-white via-pink-50/40 to-purple-50/40 rounded-xl shadow-lg border-2 border-pink-100 p-5 overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-pink-200/20 rounded-full blur-3xl"></div>
                        <div className="relative">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-pink-400" />
                              Best Performance
                              <span className="h-2 w-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></span>
                            </h3>
                          </div>
                          <p className="text-xs text-gray-600 mb-4 font-medium">Top performing students with highest scores</p>
                          {topPerformersLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="rounded-full h-8 w-8 border-4 border-pink-200 border-t-pink-400"></div>
                            </div>
                          ) : topPerformers.length === 0 ? (
                            <div className="text-center py-12">
                              <div className="relative mx-auto w-16 h-16 mb-4">
                                <Trophy className="h-16 w-16 text-gray-300 mx-auto" />
                                <div className="absolute inset-0 bg-gray-300 rounded-full blur-xl opacity-50"></div>
                              </div>
                              <p className="text-sm text-gray-500 font-medium">No performance data available</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {topPerformers.map((performer, index) => {
                                const rankColors = [
                                  { bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-300', trophy: 'text-yellow-600', glow: 'shadow-yellow-200/30' },
                                  { bg: 'bg-gradient-to-br from-slate-100 to-slate-200', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-300', trophy: 'text-slate-500', glow: 'shadow-slate-200/30' },
                                  { bg: 'bg-gradient-to-br from-orange-100 to-orange-200', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-300', trophy: 'text-orange-600', glow: 'shadow-orange-200/30' },
                                  { bg: 'bg-gradient-to-br from-blue-100 to-blue-200', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-300', trophy: 'text-blue-600', glow: 'shadow-blue-200/30' },
                                  { bg: 'bg-gradient-to-br from-purple-100 to-purple-200', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-300', trophy: 'text-purple-600', glow: 'shadow-purple-200/30' }
                                ];
                                const rank = rankColors[index] || rankColors[3];
                                return (
                                  <div 
                                    key={performer.studentId} 
                                    className={`relative flex items-center gap-3 p-3 rounded-xl border-2 ${rank.border} ${rank.bg} ${rank.glow} cursor-pointer overflow-hidden`}
                                  >
                                    <div className="relative flex items-center justify-between gap-3 w-full">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`relative flex-shrink-0`}>
                                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${rank.badge} shadow-lg`}>
                                            {index + 1}
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-bold ${rank.text} truncate`}>
                                            {performer.studentName}
                                          </p>
                                          <p className={`text-xs ${rank.text} opacity-80 truncate`}>
                                            {performer.schoolName}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs font-bold ${rank.text} px-2 py-0.5 rounded-md bg-white/50 backdrop-blur-sm`}>
                                              🎯 {performer.highestScore}
                                            </span>
                                            <span className={`text-xs ${rank.text} opacity-60`}>•</span>
                                            <span className={`text-xs ${rank.text} opacity-80 truncate`}>
                                              {performer.subjectName}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className={`relative flex-shrink-0`}>
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-white/50 backdrop-blur-sm shadow-lg`}>
                                          <Trophy className={`h-6 w-6 ${rank.trophy}`} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Config Tab Content */}
            {activeTab === 'config' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuration</h2>
                  <p className="text-gray-600">Manage system settings and configurations</p>
                </div>
              </div>
            )}

            {/* Reports Tab Content */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Reports</h2>
                  <p className="text-gray-600">View assessment reports and analytics</p>
                </div>
              </div>
            )}

            {/* Dashboard Header - Only show when on dashboard view */}
            {activeTab === 'configs' && (
              <>
                {/* Enhanced Stats Cards */}
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
                          <FileQuestion className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-3xl font-bold text-gray-900">{stats.totalQuestions}</p>
                          <p className="text-gray-600 text-sm font-medium">Total Questions</p>
                          <div className="flex items-center space-x-1 mt-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-gray-500">Active Database</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-xl flex-shrink-0">
                          <Users className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                          <p className="text-gray-600 text-sm font-medium">Active Students</p>
                          <div className="flex items-center space-x-1 mt-2">
                            <Activity className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-gray-500">Enrolled Users</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-100 rounded-xl flex-shrink-0">
                          <Target className="h-8 w-8 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-3xl font-bold text-gray-900">{stats.totalAssessments}</p>
                          <p className="text-gray-600 text-sm font-medium">Assessments Taken</p>
                          <div className="flex items-center space-x-1 mt-2">
                            <Zap className="h-4 w-4 text-purple-500" />
                            <span className="text-xs text-gray-500">Completed Tests</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

        {/* Questions Management Tab Content */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Enhanced Subjects Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                  <span>Subjects</span>
                </h2>
                <div className="space-y-3">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => setSelectedSubject(subject)}
                      className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 ${
                        selectedSubject?.id === subject.id
                          ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="font-medium">{subject.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {stats && <AdminStatsCard stats={stats} />}
            </div>

            {/* Enhanced Main Content */}
            <div className="lg:col-span-3">
              {selectedSubject && (
                <>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                            <Brain className="h-7 w-7 text-blue-600" />
                            <span>{selectedSubject.name} Questions</span>
                          </h2>
                          <p className="text-gray-600 mt-2">
                            Manage adaptive assessment questions for {selectedSubject.name}
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setShowQuestionCSVImportModal(true)}
                            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
                          >
                            <Upload className="h-5 w-5" />
                            <span>Import CSV</span>
                          </button>
                          <button
                            onClick={() => setShowQuestionForm(true)}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          >
                            <Plus className="h-5 w-5" />
                            <span>Add Question</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {showQuestionForm && (
                      <div className="p-6 border-b border-gray-200 bg-gray-50">
                        <QuestionForm
                          subjects={subjects}
                          selectedSubject={selectedSubject}
                          editingQuestion={editingQuestion}
                          onQuestionCreated={handleQuestionCreated}
                          onQuestionUpdated={handleQuestionUpdated}
                          onCancel={handleCancelEdit}
                        />
                      </div>
                    )}
                  </div>

                  <QuestionList
                    questions={questions}
                    onEdit={handleEditQuestion}
                    onDelete={handleQuestionDeleted}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalQuestions={totalQuestions}
                    onPageChange={handlePageChange}
                    selectedGrade={selectedGradeFilter}
                    onGradeChange={handleGradeChange}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Student Growth Tab Content - Redirected to Performance (Consolidated) */}
        {activeTab === 'growth' && (
          <div className="space-y-6">
            <SubjectPerformanceDashboard 
              schools={schools}
              grades={grades}
            />
          </div>
        )}

        {/* Students Management Tab Content */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <StudentList 
              refreshTrigger={studentRefreshTrigger}
              onImportCSV={() => setShowCSVImportModal(true)}
            />
          </div>
        )}

        {/* Subjects Management Tab Content */}
        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <SubjectList
              subjects={subjects}
              onEdit={handleEditSubject}
              onDelete={handleSubjectDeleted}
              onAddNew={handleAddSubject}
              loading={false}
            />
          </div>
        )}

        {/* Schools Management Tab Content */}
        {activeTab === 'schools' && (
          <div className="space-y-6">
            <SchoolList />
          </div>
        )}

        {/* Grades Management Tab Content */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            <GradeList />
          </div>
        )}

        {/* Assessment Configurations Tab Content */}
        {activeTab === 'configs' && (
          <div className="space-y-6">
            <AssessmentConfigList />
          </div>
        )}
        {activeTab === 'competencies' && (
          <div className="space-y-6">
            <CompetencyList
              onEditCompetency={(competency) => {
                setEditingCompetency(competency);
                setShowCompetencyForm(true);
              }}
              onAddCompetency={() => {
                setEditingCompetency(null);
                setShowCompetencyForm(true);
              }}
              refreshTrigger={competencyRefreshTrigger}
            />
          </div>
        )}

        {/* Performance Analytics Tab Content - Consolidated Growth & Performance */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <SubjectPerformanceDashboard 
              schools={schools}
              grades={grades}
            />
          </div>
        )}

        {/* Competency Analytics Tab Content */}
        {activeTab === 'competency-analytics' && (
          <div className="space-y-6">
            <CompetencyMasteryDashboard 
              schools={schools}
              grades={grades}
              subjects={subjects}
            />
          </div>
        )}

        {/* SSO Settings Tab Content */}
        {activeTab === 'sso' && (
          <div className="space-y-6">
            <SSOSettings />
          </div>
        )}

        {/* Subject Form Modal */}
        {showSubjectForm && (
          <SubjectForm
            subject={editingSubject}
            onClose={() => {
              setShowSubjectForm(false);
              setEditingSubject(null);
            }}
            onSubjectCreated={handleSubjectCreated}
            onSubjectUpdated={handleSubjectUpdated}
          />
        )}

        {/* Question Form Modal */}
        {showQuestionForm && selectedSubject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <QuestionForm
                subjects={subjects}
                selectedSubject={selectedSubject}
                editingQuestion={editingQuestion}
                onQuestionCreated={handleQuestionCreated}
                onQuestionUpdated={handleQuestionUpdated}
                onCancel={handleCancelEdit}
              />
            </div>
          </div>
        )}

        {/* Competency Form Modal */}
        {showCompetencyForm && (
          <CompetencyForm
            editingCompetency={editingCompetency}
            onCompetencyCreated={() => {
              setShowCompetencyForm(false);
              setEditingCompetency(null);
              setCompetencyRefreshTrigger(prev => prev + 1);
            }}
            onCompetencyUpdated={() => {
              setShowCompetencyForm(false);
              setEditingCompetency(null);
              setCompetencyRefreshTrigger(prev => prev + 1);
            }}
            onCancel={() => {
              setShowCompetencyForm(false);
              setEditingCompetency(null);
            }}
          />
        )}

        {/* CSV Import Modal */}
        <CSVImportModal
          isOpen={showCSVImportModal}
          onClose={() => setShowCSVImportModal(false)}
          onImportComplete={() => {
            setStudentRefreshTrigger(prev => prev + 1);
          }}
        />

        {/* Question CSV Import Modal */}
        <QuestionCSVImportModal
          isOpen={showQuestionCSVImportModal}
          onClose={() => setShowQuestionCSVImportModal(false)}
          onImportComplete={() => {
            // Refresh questions for current subject
            if (selectedSubject) {
              loadQuestions(selectedSubject.id, 1);
            }
            loadInitialData(); // Refresh stats
          }}
        />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;