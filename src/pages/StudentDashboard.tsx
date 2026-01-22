import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Subject, DashboardData, AssessmentConfiguration } from '../types';
import { studentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import { 
  Play, 
  Trophy, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  FileText, 
  Target,
  Clock,
  CheckCircle,
  Users,
  Zap,
  ArrowRight,
  Brain,
  Target as TargetIcon,
  Lightbulb,
  List,
  Hash
} from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
  const [assessmentConfigs, setAssessmentConfigs] = useState<Record<number, AssessmentConfiguration>>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      setCompletedAssignments(completedAssignmentsData || []);

      // Debug: Check assignments and subjects
      console.log('📚 Loaded subjects:', subjectsData.map(s => ({ id: s.id, name: s.name })));
      console.log('📝 Loaded assignments:', assignmentsData);
      if (assignmentsData && assignmentsData.length > 0) {
        assignmentsData.forEach((assignment: any) => {
          console.log(`Assignment "${assignment.name}" (ID: ${assignment.id}) - Subject ID: ${assignment.subjectId}, Completed: ${assignment.isCompleted}`);
        });
      }

      // Load assessment configurations for each subject
      const configs: Record<number, AssessmentConfiguration> = {};
      for (const subject of subjectsData) {
        try {
          const config = await studentAPI.getAssessmentConfiguration(
            user?.grade?.id || 1, 
            subject.id
          );
          configs[subject.id] = config;
        } catch (error) {
          console.warn(`No config found for subject ${subject.id}:`, error);
        }
      }
      setAssessmentConfigs(configs);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
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
  const growthRate = getGrowthRate();
  const strengthsWeaknesses = getStrengthsAndWeaknesses();
  const consistencyScore = getConsistencyScore();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="w-full px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || user?.username}!
          </h1>
          {user?.school && user?.grade && (
            <div className="flex items-center space-x-4 mb-2">
              <div className="flex items-center space-x-2 text-gray-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium">{user.school.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-medium">{user.grade.display_name}</span>
              </div>
            </div>
          )}
          <p className="text-gray-600">
            Track your academic progress and take {currentPeriod} assessments for your grade level
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
                <p className="text-gray-600 text-sm">Available Subjects</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Trophy className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{overallStats.totalAssessments}</p>
                <p className="text-gray-600 text-sm">Assessments Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{overallStats.averageScore}</p>
                <p className="text-gray-600 text-sm">Average Growth Metric Score</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Users className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{user?.grade?.display_name || 'N/A'}</p>
                <p className="text-gray-600 text-sm">Current Grade</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Subjects */}
          <div className="lg:col-span-2 space-y-4">
            {/* Active Assessments Section */}
            {getActiveAssignments().length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Active Assessments</h2>
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Clock className="h-4 w-4" />
                    <span>{getActiveAssignments().length} Available</span>
                  </div>
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
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Completed Assessments</h2>
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{completedAssignments.length} Completed</span>
                  </div>
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

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Your Subjects</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>{currentPeriod} Assessment</span>
                </div>
              </div>

              <div className="space-y-3">
                {subjects.map((subject) => {
                  const completedAssessments = getCompletedAssessments(subject.id);
                  const latestRITScore = getLatestRITScore(subject.id);
                  const isCompleted = isAssessmentCompleted(subject.id, currentPeriod);
                  const config = assessmentConfigs[subject.id];

                  return (
                    <div key={subject.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                            <p className="text-gray-600 text-sm">{subject.description}</p>
                          </div>
                        </div>
                        {latestRITScore && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-yellow-600">{latestRITScore}</div>
                            <div className="text-sm text-gray-600">Latest Growth Metric</div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {/* Assignments Section */}
                        {getAssignmentsForSubject(subject.id).length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-700">Assigned Assessments</h4>
                            {getAssignmentsForSubject(subject.id).map((assignment) => (
                              <div key={assignment.id} className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-900">{assignment.name}</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                                      assignment.mode === 'Standard'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
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
                                  <div className="flex items-center space-x-1 text-blue-600">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs font-medium">Available</span>
                                  </div>
                                </div>
                                
                                {assignment.description && (
                                  <p className="text-xs text-gray-600 mb-2">{assignment.description}</p>
                                )}
                                
                                <div className="mb-3 space-y-1">
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <div className="flex items-center space-x-1">
                                      <Hash className="h-3 w-3" />
                                      <span>Questions:</span>
                                    </div>
                                    <span className="font-medium">{assignment.totalQuestions}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>Time Limit:</span>
                                    </div>
                                    <span className="font-medium">{assignment.timeLimitMinutes} minutes</span>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => startAssignment(assignment.id, assignment.mode)}
                                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium"
                                >
                                  <Play className="h-4 w-4" />
                                  <span>Start Assessment</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Seasonal Assessment Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">{currentPeriod} Assessment</span>
                              {isCompleted ? (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-xs font-medium">Completed</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 text-blue-600">
                                  <Clock className="h-4 w-4" />
                                  <span className="text-xs font-medium">Available</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Assessment Details - Real Data */}
                            <div className="mb-3 space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Questions:</span>
                                </div>
                                <span className="font-medium">{config?.questionCount || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Time Limit:</span>
                                </div>
                                <span className="font-medium">{config?.timeLimitMinutes ? `${config.timeLimitMinutes} minutes` : 'N/A'}</span>
                              </div>
                            </div>
                            
                            {isCompleted ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Growth Metric Score:</span>
                                  <span className="font-semibold text-yellow-600">
                                    {completedAssessments.find(a => a.assessmentPeriod === currentPeriod)?.ritScore}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Accuracy:</span>
                                  <span className="font-semibold text-green-600">
                                    {Math.round((completedAssessments.find(a => a.assessmentPeriod === currentPeriod)?.correctAnswers || 0) / 10 * 100)}%
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => startAssessment(subject.id, currentPeriod)}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium"
                              >
                                <Play className="h-4 w-4" />
                                <span>Start Assessment</span>
                              </button>
                            )}
                          </div>

                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">Progress Overview</span>
                              <Target className="h-4 w-4 text-yellow-500" />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Current Growth Metric:</span>
                                <span className="font-semibold text-gray-900">{latestRITScore || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Best Score:</span>
                                <span className="font-semibold text-green-600">
                                  {(() => {
                                    const validScores = completedAssessments
                                      .map(a => (a as any).rit_score || a.ritScore)
                                      .filter(score => score !== null && score !== undefined && score > 0);
                                    
                                    if (validScores.length === 0) return 'N/A';
                                    return Math.max(...validScores);
                                  })()}
                                </span>
                              </div>
                              {completedAssessments.length > 0 && (
                                <button
                                  onClick={() => viewLatestReport(subject.id)}
                                  className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                                >
                                  <FileText className="h-4 w-4" />
                                  <span>View Report</span>
                                  <ArrowRight className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar - Meaningful Analytics */}
          <div className="space-y-4">
             {/* Academic Insights */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Academic Insights</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Strongest Subject</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-yellow-600">{strengthsWeaknesses.strongest}</div>
                    <div className="text-xs text-gray-500">{strengthsWeaknesses.strongestScore > 0 ? `${strengthsWeaknesses.strongestScore} Growth Metric` : 'N/A'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                      <TargetIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Needs Focus</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-pink-600">{strengthsWeaknesses.weakest}</div>
                    <div className="text-xs text-gray-500">{strengthsWeaknesses.weakestScore > 0 ? `${strengthsWeaknesses.weakestScore} Growth Metric` : 'N/A'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Growth Rate</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${growthRate > 0 ? 'text-green-600' : growthRate < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {growthRate > 0 ? '+' : ''}{growthRate}%
                    </div>
                    <div className="text-xs text-gray-500">from start</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                      <Lightbulb className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Consistency</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-teal-600">{consistencyScore}%</div>
                    <div className="text-xs text-gray-500">score stability</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {subjects.map((subject) => {
                  const isCompleted = isAssessmentCompleted(subject.id, currentPeriod);
                  return (
                    <div key={subject.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{subject.name}</h4>
                        <p className="text-sm text-gray-600">{currentPeriod} Assessment</p>
                      </div>
                      {isCompleted ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => startAssessment(subject.id, currentPeriod)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <Play className="h-3 w-3" />
                          <span>Start</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default StudentDashboard;