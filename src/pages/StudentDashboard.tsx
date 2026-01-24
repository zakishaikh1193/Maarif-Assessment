import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Subject, DashboardData } from '../types';
import { studentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import { 
  Play, 
  Trophy, 
  BookOpen, 
  TrendingUp, 
  FileText, 
  Target,
  Clock,
  CheckCircle,
  Users,
  Zap,
  Target as TargetIcon,
  Lightbulb,
  List,
  Hash,
  LayoutDashboard,
  BarChart3,
  Menu,
  X,
  Building,
  GraduationCap,
  User as UserIcon,
  Eye
} from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
  // Assessment configurations - kept for potential future use
  // const [assessmentConfigs, setAssessmentConfigs] = useState<Record<number, AssessmentConfiguration>>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileImageError, setProfileImageError] = useState(false);
  const [recentCompetencies, setRecentCompetencies] = useState<Array<{
    competencyName: string;
    competencyCode: string;
    finalScore: number;
    dateCalculated: string;
    subjectName: string;
  }>>([]);
  const hasLoadedRef = useRef(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get current period based on date
  // BOY (Beginning of Year): Aug-Jan, EOY (End of Year): Feb-Jul
  const getCurrentPeriod = () => {
    const month = new Date().getMonth();
    // Aug (7) through Jan (0) = BOY, Feb (1) through Jul (6) = EOY
    if (month >= 7 || month <= 0) return 'BOY';     // Aug, Sep, Oct, Nov, Dec, Jan
    return 'EOY';                                   // Feb, Mar, Apr, May, Jun, Jul
  };

  const currentPeriod = getCurrentPeriod();

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadDashboardData();
  }, []);

  // Reset profile image error when user changes
  useEffect(() => {
    setProfileImageError(false);
  }, [user?.profilePicture]);

  const loadDashboardData = async () => {
    try {
      const [subjectsData, assessmentData, assignmentsData, completedAssignmentsData] = await Promise.all([
        studentAPI.getAvailableSubjects(),
        studentAPI.getDashboardData(),
        studentAPI.getAssignments().catch(() => []), // Handle if assignments endpoint doesn't exist yet
        studentAPI.getCompletedAssignments().catch(() => []) // Handle if completed assignments endpoint doesn't exist yet
      ]);
      setSubjects(subjectsData);
      setDashboardData(assessmentData);
      setAssignments(assignmentsData || []);
      
      // Sort completed assignments by completion date (most recent first)
      const sortedCompleted = (completedAssignmentsData || []).sort((a: any, b: any) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA; // Descending order (most recent first)
      });
      setCompletedAssignments(sortedCompleted);

      // Debug: Check assignments and subjects
      console.log('📚 Loaded subjects:', subjectsData.map(s => ({ id: s.id, name: s.name })));
      console.log('📝 Loaded assignments:', assignmentsData);
      if (assignmentsData && assignmentsData.length > 0) {
        assignmentsData.forEach((assignment: any) => {
          console.log(`Assignment "${assignment.name}" (ID: ${assignment.id}) - Subject ID: ${assignment.subjectId}, Completed: ${assignment.isCompleted}`);
        });
      }

      // Load assessment configurations for each subject - kept for potential future use
      // const configs: Record<number, AssessmentConfiguration> = {};
      // for (const subject of subjectsData) {
      //   try {
      //     const config = await studentAPI.getAssessmentConfiguration(
      //       user?.grade?.id || 1, 
      //       subject.id
      //     );
      //     configs[subject.id] = config;
      //   } catch (error) {
      //     console.warn(`No config found for subject ${subject.id}:`, error);
      //   }
      // }
      //       setAssessmentConfigs(configs);

      // Load recently achieved competencies after dashboard data is loaded
      await loadRecentCompetencies(assessmentData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentCompetencies = async (assessmentData?: any[]) => {
    try {
      const dataToUse = assessmentData || dashboardData;
      
      // Get all completed assessments from dashboard data
      const allAssessments: any[] = [];
      dataToUse.forEach((subjectData: any) => {
        if (subjectData.assessments && subjectData.assessments.length > 0) {
          subjectData.assessments.forEach((assessment: any) => {
            allAssessments.push({
              ...assessment,
              subjectId: subjectData.subjectId,
              subjectName: subjectData.subjectName
            });
          });
        }
      });

      // Sort by date (most recent first) and get the latest assessment
      const sortedAssessments = allAssessments.sort((a, b) => {
        const dateA = a.dateTaken ? new Date(a.dateTaken).getTime() : 0;
        const dateB = b.dateTaken ? new Date(b.dateTaken).getTime() : 0;
        return dateB - dateA;
      });

      if (sortedAssessments.length > 0) {
        const latestAssessment = sortedAssessments[0];
        
        // Fetch competency scores for the latest assessment
        try {
          const competencyScores = await studentAPI.getCompetencyScores(latestAssessment.id);
          
          // Filter for "strong" competencies (achieved) and sort by date
          const achievedCompetencies = competencyScores
            .filter((score: any) => score.feedbackType === 'strong' && score.finalScore >= 70)
            .map((score: any) => ({
              competencyName: score.competencyName,
              competencyCode: score.competencyCode,
              finalScore: score.finalScore,
              dateCalculated: score.dateCalculated || latestAssessment.dateTaken,
              subjectName: latestAssessment.subjectName || 'Unknown Subject'
            }))
            .sort((a: any, b: any) => {
              const dateA = a.dateCalculated ? new Date(a.dateCalculated).getTime() : 0;
              const dateB = b.dateCalculated ? new Date(b.dateCalculated).getTime() : 0;
              return dateB - dateA;
            })
            .slice(0, 4); // Get top 4 most recent

          setRecentCompetencies(achievedCompetencies);
        } catch (error) {
          console.error('Failed to load competency scores:', error);
          setRecentCompetencies([]);
        }
      } else {
        setRecentCompetencies([]);
      }
    } catch (error) {
      console.error('Failed to load recent competencies:', error);
      setRecentCompetencies([]);
    }
  };

  const startAssessment = (subjectId: number, period: string) => {
    navigate('/assessment', { 
      state: { subjectId, period } 
    });
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
          allQuestions: response.allQuestions, // For Standard mode
          assignmentName: response.assignmentName
        }
      });
    } catch (error: any) {
      console.error('Failed to start assignment:', error);
      alert(error.response?.data?.error || 'Failed to start assignment');
    }
  };

  const getActiveAssignments = () => {
    // Get all assignments that are not completed
    return assignments.filter(assignment => !assignment.isCompleted);
  };

  // Helper function - kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getAssignmentsForSubject = (subjectId: number) => {
    // Backend already filters by isActive and isPublished, so we only need to check subjectId and completion
    // Ensure both are numbers for comparison
    const filtered = assignments.filter(assignment => {
      const assignmentSubjectId = Number(assignment.subjectId);
      const targetSubjectId = Number(subjectId);
      const isCompleted = Boolean(assignment.isCompleted);
      const matches = assignmentSubjectId === targetSubjectId && !isCompleted;
      
      if (matches) {
        console.log(`✅ Assignment "${assignment.name}" matches subject ${subjectId}`, {
          assignmentSubjectId,
          targetSubjectId,
          isCompleted: assignment.isCompleted,
          matches
        });
      }
      return matches;
    });
    
    if (filtered.length === 0 && assignments.length > 0) {
      // Debug: Check why no assignments match
      const subjectAssignments = assignments.filter(a => Number(a.subjectId) === Number(subjectId));
      if (subjectAssignments.length > 0) {
        console.log(`⚠️ Found ${subjectAssignments.length} assignment(s) for subject ${subjectId}, but all are completed`);
        subjectAssignments.forEach(a => {
          console.log(`  - "${a.name}": isCompleted=${a.isCompleted} (type: ${typeof a.isCompleted})`);
        });
      } else {
        console.log(`⚠️ No assignments found for subject ${subjectId} (looking for: ${subjectId}, type: ${typeof subjectId})`);
        console.log(`   Available assignment subject IDs:`, 
          [...new Set(assignments.map(a => ({ id: a.subjectId, type: typeof a.subjectId })))]);
      }
    }
    
    return filtered;
  };

  // Helper function - kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const viewLatestReport = async (subjectId: number) => {
    try {
      const detailedResults = await studentAPI.getLatestAssessmentDetails(subjectId);
      navigate('/results', { 
        state: detailedResults 
      });
    } catch (error) {
      console.error('Failed to fetch latest assessment details:', error);
    }
  };

  const getCompletedAssessments = (subjectId: number) => {
    const subjectData = dashboardData.find(data => data.subjectId === subjectId);
    return subjectData?.assessments || [];
  };

  const isAssessmentCompleted = (subjectId: number, period: string) => {
    const completedAssessments = getCompletedAssessments(subjectId);
    return completedAssessments.some(assessment => assessment.assessmentPeriod === period);
  };

  const getLatestRITScore = (subjectId: number) => {
    const completedAssessments = getCompletedAssessments(subjectId);
    if (completedAssessments.length === 0) return null;
    
    const latest = completedAssessments.reduce((latest, current) => {
      return new Date(current.dateTaken) > new Date(latest.dateTaken) ? current : latest;
    });
    
    return (latest as any).rit_score || latest.ritScore;
  };

  const getAverageRITScore = (subjectId: number) => {
    const completedAssessments = getCompletedAssessments(subjectId);
    if (completedAssessments.length === 0) return null;
    
    const totalScore = completedAssessments.reduce((sum, assessment) => {
      const score = (assessment as any).rit_score || assessment.ritScore || 0;
      return sum + score;
    }, 0);
    return Math.round(totalScore / completedAssessments.length);
  };

  // Analytics Functions
  const getOverallStats = () => {
    const allAssessments = dashboardData.flatMap(subject => subject.assessments);
    const totalAssessments = allAssessments.length;
    const totalScore = allAssessments.reduce((sum, assessment) => {
      return sum + ((assessment as any).rit_score || assessment.ritScore || 0);
    }, 0);
    const averageScore = totalAssessments > 0 ? Math.round(totalScore / totalAssessments) : 0;
    
    const validScores = allAssessments
      .map(a => (a as any).rit_score || a.ritScore)
      .filter(score => score !== null && score !== undefined && score > 0);
    
    const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
    const lowestScore = validScores.length > 0 ? Math.min(...validScores) : 0;
    
    return { totalAssessments, averageScore, highestScore, lowestScore };
  };

  const getSubjectPerformance = () => {
    return subjects.map(subject => {
      const assessments = getCompletedAssessments(subject.id);
      const avgScore = getAverageRITScore(subject.id) || 0;
      const latestScore = getLatestRITScore(subject.id) || 0;
      const totalAssessments = assessments.length;
      
      return {
        subjectName: subject.name,
        avgScore,
        latestScore,
        totalAssessments,
        improvement: totalAssessments > 1 ? latestScore - avgScore : 0
      };
    });
  };


  const getGrowthRate = () => {
    const allAssessments = dashboardData.flatMap(subject => subject.assessments);
    if (allAssessments.length < 2) return 0;
    
    const sortedAssessments = allAssessments.sort((a, b) => 
      new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime()
    );
    
    const firstScore = (sortedAssessments[0] as any).rit_score || sortedAssessments[0].ritScore || 0;
    const lastScore = (sortedAssessments[sortedAssessments.length - 1] as any).rit_score || sortedAssessments[sortedAssessments.length - 1].ritScore || 0;
    
    // Prevent division by zero
    if (firstScore === 0) return 0;
    
    return Math.round(((lastScore - firstScore) / firstScore) * 100);
  };

  const getStrengthsAndWeaknesses = () => {
    const subjectPerformance = getSubjectPerformance();
    const validSubjects = subjectPerformance.filter(subject => subject.latestScore > 0);
    
    if (validSubjects.length === 0) {
      return {
        strongest: 'N/A',
        weakest: 'N/A',
        strongestScore: 0,
        weakestScore: 0
      };
    }
    
    const sortedSubjects = validSubjects.sort((a, b) => b.latestScore - a.latestScore);
    
    return {
      strongest: sortedSubjects[0]?.subjectName || 'N/A',
      weakest: sortedSubjects[sortedSubjects.length - 1]?.subjectName || 'N/A',
      strongestScore: sortedSubjects[0]?.latestScore || 0,
      weakestScore: sortedSubjects[sortedSubjects.length - 1]?.latestScore || 0
    };
  };

  const getConsistencyScore = () => {
    const allAssessments = dashboardData.flatMap(subject => subject.assessments);
    if (allAssessments.length < 2) return 0;
    
    const scores = allAssessments.map(a => (a as any).rit_score || a.ritScore || 0);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to consistency percentage (lower SD = higher consistency)
    const maxExpectedSD = 50; // Assuming max reasonable variation
    const consistency = Math.max(0, 100 - (standardDeviation / maxExpectedSD) * 100);
    return Math.round(consistency);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  const overallStats = getOverallStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Main Layout with Sidebar */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 fixed left-0 top-16 h-[calc(100vh-4rem)] transition-all duration-300 z-40 shadow-sm`}>
          <div className="p-4">
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2 mb-4 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Navigation Items */}
            <nav className="space-y-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 rounded-lg transition-colors group"
              >
                <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">Dashboard</span>}
              </button>
              
              <button
                onClick={() => navigate('/results')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 rounded-lg transition-colors group"
              >
                <BarChart3 className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">Results</span>}
              </button>
            </nav>

            {/* Divider */}
            {sidebarOpen && (
              <div className="my-6 border-t border-gray-200">
                <div className="px-4 py-2 mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Access</p>
                </div>
              </div>
            )}

            {/* Quick Actions in Sidebar */}
            {sidebarOpen && (
              <div className="mt-4 space-y-2">
                {subjects.length > 0 ? (
                  subjects.slice(0, 5).map((subject) => {
                    const isCompleted = isAssessmentCompleted(subject.id, currentPeriod);
                    return (
                      <button
                        key={subject.id}
                        onClick={() => {
                          if (!isCompleted) {
                            startAssessment(subject.id, currentPeriod);
                          }
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                          isCompleted
                            ? 'text-gray-500 bg-gray-50 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-700'
                        }`}
                        disabled={isCompleted}
                      >
                        <BookOpen className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{subject.name}</span>
                        {isCompleted && <CheckCircle className="h-4 w-4 ml-auto text-green-500" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 px-4 py-2">No subjects available</p>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
      <div className="w-full px-6 py-6">
            {/* Profile Container */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex items-center space-x-6">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-pink-500 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg relative">
                    {user?.profilePicture && !profileImageError ? (
                      <img 
                        src={user.profilePicture} 
                        alt={`${user.firstName || user.username}`}
                        className="w-full h-full object-cover"
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.username?.[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Student Information */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user?.username || 'Student'}
                    </h2>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    {/* School */}
                    {user?.school && (
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Building className="h-5 w-5 text-teal-600" />
                <span className="font-medium">{user.school.name}</span>
              </div>
                    )}
                    
                    {/* Grade */}
                    {user?.grade && (
                      <div className="flex items-center space-x-2 text-gray-700">
                        <GraduationCap className="h-5 w-5 text-purple-600" />
                <span className="font-medium">{user.grade.display_name}</span>
            </div>
          )}
                    
                    {/* Username/Student ID */}
                    <div className="flex items-center space-x-2 text-gray-700">
                      <UserIcon className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">{user?.username || 'Student'}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mt-3">
            Track your academic progress and take {currentPeriod} assessments for your grade level
          </p>
                </div>
              </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{subjects.length}</p>
                <p className="text-gray-600 text-sm font-medium">Available Subjects</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
              </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{overallStats.totalAssessments}</p>
                <p className="text-gray-600 text-sm font-medium">Assessments Completed</p>
              </div>
              <div className="p-3 bg-pink-100 rounded-lg">
                <Trophy className="h-6 w-6 text-pink-600" />
            </div>
          </div>
              </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{overallStats.averageScore || 0}</p>
                <p className="text-gray-600 text-sm font-medium">Average Growth Metric Score</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
              </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{user?.grade?.display_name || 'N/A'}</p>
                <p className="text-gray-600 text-sm font-medium">Current Grade</p>
              </div>
              <div className="p-3 bg-teal-100 rounded-lg">
                <Users className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Assessments Section */}
            {getActiveAssignments().length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Active Assessments</h2>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {getActiveAssignments().length} Available
                  </span>
                </div>

                <div className="space-y-3">
                  {getActiveAssignments().map((assignment) => (
                    <div key={assignment.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">{assignment.name}</h3>
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                                assignment.mode === 'Standard'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {assignment.mode === 'Standard' ? (
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
                            </div>
                            <p className="text-sm text-gray-600">{assignment.subjectName || `Subject ID: ${assignment.subjectId}`}</p>
                            {assignment.description && (
                              <p className="text-xs text-gray-500 mt-1">{assignment.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Hash className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-gray-900">{assignment.totalQuestions}</div>
                            <div className="text-xs">Questions</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-gray-900">{assignment.timeLimitMinutes}</div>
                            <div className="text-xs">Minutes</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Target className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-gray-900">{assignment.difficultyLevel || 'N/A'}</div>
                            <div className="text-xs">Difficulty</div>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => startAssignment(assignment.id, assignment.mode)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 font-semibold shadow-sm"
                      >
                        <Play className="h-5 w-5" />
                        <span>Start Assessment</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Assessments Section */}
            {completedAssignments.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Completed Assessments</h2>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {completedAssignments.length} Completed
                  </span>
                </div>

                <div className="space-y-3">
                  {completedAssignments.map((assignment) => (
                    <div key={assignment.id} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">{assignment.name}</h3>
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                                assignment.mode === 'Standard'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {assignment.mode === 'Standard' ? (
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
                            </div>
                            <p className="text-sm text-gray-600">{assignment.subjectName || `Subject ID: ${assignment.subjectId}`}</p>
                            {assignment.description && (
                              <p className="text-xs text-gray-500 mt-1">{assignment.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Target className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-gray-900">{assignment.score || 'N/A'}</div>
                            <div className="text-xs">Score</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {assignment.correctAnswers !== null && assignment.assessmentTotalQuestions 
                                ? `${assignment.correctAnswers}/${assignment.assessmentTotalQuestions}`
                                : 'N/A'}
                            </div>
                            <div className="text-xs">Correct</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {assignment.completedAt 
                                ? new Date(assignment.completedAt).toLocaleDateString()
                                : 'N/A'}
                            </div>
                            <div className="text-xs">Completed</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
             {/* Academic Insights - Recently Achieved Competencies */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Academic Insights</h3>
              <div className="space-y-3">
                {recentCompetencies.length > 0 ? (
                  recentCompetencies.map((competency, index) => {
                    const colors = [
                      { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
                      { bg: 'bg-pink-100', icon: 'text-pink-600' },
                      { bg: 'bg-purple-100', icon: 'text-purple-600' },
                      { bg: 'bg-teal-100', icon: 'text-teal-600' }
                    ];
                    const colorSet = colors[index % colors.length];
                    const icons = [Lightbulb, TargetIcon, TrendingUp, Lightbulb];
                    const Icon = icons[index % icons.length];
                    
                    return (
                      <div key={competency.competencyCode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`p-2 ${colorSet.bg} rounded-lg flex-shrink-0`}>
                            <Icon className={`h-4 w-4 ${colorSet.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700 block truncate">{competency.competencyName}</span>
                            <span className="text-xs text-gray-500">{competency.competencyCode}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-sm font-bold text-gray-900">{competency.finalScore}%</div>
                          <div className="text-xs text-gray-500">Achieved</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Lightbulb className="h-4 w-4 text-yellow-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">No Achievements Yet</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">N/A</div>
                        <div className="text-xs text-gray-500">Complete assessments</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-pink-100 rounded-lg">
                          <TargetIcon className="h-4 w-4 text-pink-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Keep Learning</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">N/A</div>
                        <div className="text-xs text-gray-500">to see achievements</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions - Recent Assessments */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {(() => {
                  // Get recent assessments from completed assignments and dashboard data
                  const recentAssessments: any[] = [];
                  
                  // Add completed assignments
                  completedAssignments.slice(0, 3).forEach((assignment: any) => {
                    if (assignment.assessmentId) {
                      recentAssessments.push({
                        id: assignment.assessmentId,
                        name: assignment.name || assignment.assignmentName || 'Assessment',
                        subjectName: assignment.subjectName || 'Unknown Subject',
                        completedAt: assignment.completedAt,
                        score: assignment.score,
                        mode: assignment.mode
                      });
                    }
                  });

                  // Add assessments from dashboard data
                  dashboardData.forEach((subjectData: any) => {
                    if (subjectData.assessments && subjectData.assessments.length > 0) {
                      subjectData.assessments.slice(0, 2).forEach((assessment: any) => {
                        // Avoid duplicates
                        if (!recentAssessments.find(a => a.id === assessment.id)) {
                          recentAssessments.push({
                            id: assessment.id,
                            name: assessment.assignmentName || `${subjectData.subjectName} Assessment`,
                            subjectName: subjectData.subjectName,
                            dateTaken: assessment.dateTaken || assessment.date_taken,
                            ritScore: assessment.ritScore || assessment.rit_score,
                            assessmentPeriod: assessment.assessmentPeriod || assessment.assessment_period
                          });
                        }
                      });
                    }
                  });

                  // Sort by date (most recent first) and limit to 4
                  const sortedAssessments = recentAssessments
                    .sort((a, b) => {
                      const dateA = a.completedAt || a.dateTaken ? new Date(a.completedAt || a.dateTaken).getTime() : 0;
                      const dateB = b.completedAt || b.dateTaken ? new Date(b.completedAt || b.dateTaken).getTime() : 0;
                      return dateB - dateA;
                    })
                    .slice(0, 4);

                  if (sortedAssessments.length > 0) {
                    return sortedAssessments.map((assessment) => (
                      <div key={assessment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{assessment.name}</h4>
                          <p className="text-xs text-gray-600 truncate">
                            {assessment.subjectName}
                            {assessment.completedAt && (
                              <> • {new Date(assessment.completedAt).toLocaleDateString()}</>
                            )}
                            {assessment.dateTaken && (
                              <> • {new Date(assessment.dateTaken).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              // Fetch detailed results for this assessment
                              const detailedResults = await studentAPI.getDetailedResults(assessment.id);
                              navigate('/results', { 
                                state: detailedResults 
                              });
                            } catch (error) {
                              console.error('Failed to fetch assessment results:', error);
                              alert('Failed to load assessment results');
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center space-x-1 flex-shrink-0 ml-2"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Result</span>
                        </button>
                      </div>
                    ));
                  } else {
                    return (
                      <p className="text-sm text-gray-500 text-center py-4">No recent assessments available</p>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
        </main>
      </div>
    </div>
    
  );
};

export default StudentDashboard;