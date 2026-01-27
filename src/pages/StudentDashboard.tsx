import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Subject, DashboardData, DetailedAssessmentResults } from '../types';
import { studentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import StudentSidebar from '../components/StudentSidebar';
import { 
  Play, 
  BookOpen, 
  TrendingUp, 
  FileText, 
  Target,
  Clock,
  CheckCircle,
  Users,
  Target as TargetIcon,
  Lightbulb,
  ClipboardCheck,
  Calendar,
  GraduationCap,
  Eye,
  X,
  XCircle,
  School,
  User
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [assessmentDetails, setAssessmentDetails] = useState<DetailedAssessmentResults | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
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
      try {
        const [subjectsData, assessmentData, assignmentsData, completedAssignmentsData] = await Promise.all([
          studentAPI.getAvailableSubjects(),
          studentAPI.getDashboardData(),
          studentAPI.getAssignments().catch((err) => {
            console.error('❌ Error fetching active assignments:', err);
            console.error('Error details:', err.response?.data || err.message);
            return [];
          }),
          studentAPI.getCompletedAssignments().catch((err) => {
            console.error('❌ Error fetching completed assignments:', err);
            console.error('Error details:', err.response?.data || err.message);
            return [];
          })
        ]);
        
        setSubjects(subjectsData);
        setDashboardData(assessmentData);
        
        // Process active assignments - backend returns assignments where is_completed = 0
        const processedAssignments = (assignmentsData || []).map((assignment: any) => ({
          ...assignment,
          // Ensure isCompleted is properly set (backend returns 0 for active)
          isCompleted: assignment.isCompleted === 1 || assignment.isCompleted === true || assignment.is_completed === 1
        }));
        setAssignments(processedAssignments);
        
        // Process completed assignments - backend already sorts them
        const processedCompleted = (completedAssignmentsData || []).map((assignment: any) => ({
          ...assignment,
          isCompleted: true
        }));
        
        // Sort completed assignments by completion date (most recent first)
        const sortedCompleted = processedCompleted.sort((a: any, b: any) => {
          const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return dateB - dateA; // Descending order (most recent first)
        });
        setCompletedAssignments(sortedCompleted);

        // Debug: Check assignments and subjects
        console.log('📚 Loaded subjects:', subjectsData.length, subjectsData.map(s => ({ id: s.id, name: s.name })));
        console.log('📝 Loaded ACTIVE assignments:', processedAssignments.length, processedAssignments);
        console.log('✅ Loaded COMPLETED assignments:', sortedCompleted.length, sortedCompleted);
        
        if (processedAssignments && processedAssignments.length > 0) {
          processedAssignments.forEach((assignment: any) => {
            console.log(`🟢 Active: "${assignment.name}" (ID: ${assignment.id}) - Subject: ${assignment.subjectName}, Mode: ${assignment.mode}`);
          });
        } else {
          console.warn('⚠️ No active assignments found. Check if assignments are assigned to this student.');
        }
        
        if (sortedCompleted && sortedCompleted.length > 0) {
          sortedCompleted.forEach((assignment: any) => {
            console.log(`✅ Completed: "${assignment.name}" (ID: ${assignment.id}) - Subject: ${assignment.subjectName}, Score: ${assignment.score}`);
          });
        } else {
          console.log('ℹ️ No completed assignments found.');
        }
      } catch (error) {
        console.error('❌ Error in loadDashboardData:', error);
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
      try {
        const assessmentData = await studentAPI.getDashboardData();
        await loadRecentCompetencies(assessmentData);
      } catch (error) {
        console.error('Error loading competencies:', error);
      }
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
    // Backend already returns only active (non-completed) assignments from /student/assignments
    // Just ensure we exclude any that might be in the completed list as a safety check
    const completedAssignmentIds = new Set(completedAssignments.map(a => a.id));
    
    // Backend already returns only active assignments, just exclude from completed list
    const active = assignments.filter(assignment => {
      return !completedAssignmentIds.has(assignment.id);
    });
    
    // Sort by creation date (most recent first) to show newest assignments at top
    const sorted = active.sort((a: any, b: any) => {
      const dateA = a.created_at || a.createdAt || a.startDate || 0;
      const dateB = b.created_at || b.createdAt || b.startDate || 0;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    
    return sorted;
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
        <StudentSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
      <div className="w-full px-6 py-6">
            {/* Profile Container */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-6">
                  {/* Profile Picture - Orange-Yellow Gradient Square */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-md">
                      {user?.profilePicture && !profileImageError ? (
                        <img 
                          src={user.profilePicture} 
                          alt={`${user.firstName || user.username}`}
                          className="w-full h-full object-cover rounded-lg"
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
                    <div className="mb-3">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user?.username || 'Student'}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">@{user?.username || 'student'}</p>
                    </div>
                    
                    {/* School, Grade, and Username Tags */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      {/* School Tag */}
                      {user?.school && (
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                          <School className="h-4 w-4 text-gray-700" />
                          <span className="text-sm font-medium text-gray-900">{user.school.name}</span>
                        </div>
                      )}
                      
                      {/* Grade Tag */}
                      {user?.grade && (
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                          <GraduationCap className="h-4 w-4 text-gray-700" />
                          <span className="text-sm font-medium text-gray-900">{user.grade.display_name}</span>
                        </div>
                      )}
                      
                      {/* Username Tag */}
                      <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                        <User className="h-4 w-4 text-gray-700" />
                        <span className="text-sm font-medium text-gray-900">{user?.username || 'student'}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm">
                      Track your academic progress and take {currentPeriod} assessments for your grade level. Complete assessments to improve your growth metrics and unlock achievements.
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6"></div>

              {/* Academic Statistics */}
              <div className="grid grid-cols-3 gap-6">
                {/* JOINED */}
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Calendar className="h-5 w-5 text-gray-600" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">JOINED</p>
                  <p className="text-base font-bold text-gray-900">
                    {(() => {
                      const userCreatedAt = (user as any)?.created_at;
                      if (userCreatedAt) {
                        try {
                          const date = new Date(userCreatedAt);
                          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        } catch (e) {
                          return new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        }
                      }
                      return new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    })()}
                  </p>
                </div>

                {/* SUBJECTS */}
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <BookOpen className="h-5 w-5 text-gray-600" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">SUBJECTS</p>
                  <p className="text-base font-bold text-gray-900">
                    {loading ? '...' : `${subjects.length} Active`}
                  </p>
                </div>

                {/* STATUS */}
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <GraduationCap className="h-5 w-5 text-gray-600" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">STATUS</p>
                  <p className="text-base font-bold text-green-600">Active</p>
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
                <ClipboardCheck className="h-6 w-6 text-pink-600" />
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Active Assessments</h2>
                <span className="text-sm font-medium text-gray-700 bg-blue-100 px-3 py-1 rounded-full">
                  {getActiveAssignments().length} Available
                </span>
              </div>

              {getActiveAssignments().length > 0 ? (
                <div className="space-y-3">
                  {getActiveAssignments().map((assignment) => (
                    <div key={assignment.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Left Side - Assessment Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                        </div>

                        {/* Middle Section - Assessment Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base font-bold text-gray-900">{assignment.name}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md ${
                              assignment.mode === 'Standard'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {assignment.mode || 'Standard'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">{assignment.subjectName || `Subject ID: ${assignment.subjectId}`}</p>
                          {assignment.description && (
                            <p className="text-xs text-gray-600">{assignment.description}</p>
                          )}
                        </div>

                        {/* Right Side - Start Button */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => startAssignment(assignment.id, assignment.mode)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold shadow-sm whitespace-nowrap"
                          >
                            <Play className="h-4 w-4" />
                            <span>Start</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">No active assessments available</p>
                  <p className="text-gray-400 text-xs mt-1">New assessments will appear here when assigned</p>
                </div>
              )}
            </div>

            {/* Completed Assessments Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Completed Assessments</h2>
                <span className="text-sm font-medium text-gray-700 bg-blue-100 px-3 py-1 rounded-full">
                  {completedAssignments.length} Completed
                </span>
              </div>

              {completedAssignments.length > 0 ? (
                <div className="space-y-3">
                  {completedAssignments.map((assignment) => (
                    <div 
                      key={assignment.id} 
                      onClick={() => {
                        if (assignment.assessmentId) {
                          viewAssessmentDetails(assignment.assessmentId);
                        }
                      }}
                      className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-green-300 hover:bg-green-50"
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Left Side - Status Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                        </div>

                        {/* Middle Section - Assessment Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base font-bold text-gray-900">{assignment.name}</h3>
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-100 text-blue-700">
                              {assignment.mode || 'Standard'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">{assignment.subjectName || `Subject ID: ${assignment.subjectId}`}</p>
                          {assignment.description && (
                            <p className="text-xs text-gray-600">{assignment.description}</p>
                          )}
                        </div>

                        {/* Right Side - Score, Correct, Date */}
                        <div className="flex items-center gap-4 md:gap-6 flex-shrink-0 flex-wrap">
                          {/* Score */}
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-gray-600 flex-shrink-0" />
                            <div className="text-sm whitespace-nowrap">
                              <span className="font-semibold text-gray-900">{assignment.score || 'N/A'}</span>
                              <span className="text-gray-600 ml-1">Score</span>
                            </div>
                          </div>

                          {/* Correct Answers */}
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-gray-600 flex-shrink-0" />
                            <div className="text-sm whitespace-nowrap">
                              <span className="font-semibold text-gray-900">
                                {assignment.correctAnswers !== null && assignment.assessmentTotalQuestions 
                                  ? `${assignment.correctAnswers}/${assignment.assessmentTotalQuestions}`
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
                                {assignment.completedAt 
                                  ? new Date(assignment.completedAt).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric' 
                                    })
                                  : 'N/A'}
                              </span>
                              <span className="text-gray-600 ml-1">Date</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">No completed assessments yet</p>
                  <p className="text-gray-400 text-xs mt-1">Complete assessments to see them here</p>
                </div>
              )}
            </div>
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
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center space-x-1 flex-shrink-0 ml-2"
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

export default StudentDashboard;