import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DetailedAssessmentResults, AssessmentResult, CompetencyScore, CompetencyGrowthData } from '../types';
import Navigation from '../components/Navigation';
import DifficultyProgressionChart from '../components/DifficultyProgressionChart';
import GrowthOverTimeChart from '../components/GrowthOverTimeChart';
import CompetencyAnalytics from '../components/CompetencyAnalytics';
import { 
  Trophy, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  BookOpen,
  BarChart3,
  BarChart,
  LineChart,
  Brain
} from 'lucide-react';

const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [results, setResults] = useState<DetailedAssessmentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assessment' | 'overall' | 'competency'>('assessment');
  const [growthData, setGrowthData] = useState<any>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [competencyScores, setCompetencyScores] = useState<CompetencyScore[]>([]);
  const [competencyGrowthData, setCompetencyGrowthData] = useState<CompetencyGrowthData[]>([]);
  const [competencyLoading, setCompetencyLoading] = useState(false);
  const competencyDataFetched = useRef(false);

  useEffect(() => {
    // Check if we have detailed results or basic results
    if (location.state?.statistics) {
      // We have detailed results
      setResults(location.state as DetailedAssessmentResults);
      setLoading(false);
      // Reset competency data when assessment changes
      setCompetencyScores([]);
      setCompetencyGrowthData([]);
      competencyDataFetched.current = false;
    } else {
      // We have basic results, show fallback
      setLoading(false);
    }
  }, [location.state]);

  // Fetch growth data when switching to overall tab
  useEffect(() => {
    if (activeTab === 'overall' && results && !growthData && !growthLoading) {
      setGrowthLoading(true);
      // Import the API function dynamically to avoid circular dependencies
      import('../services/api').then(({ studentAPI }) => {
        // Get the subject ID from the assessment results
        const subjectId = results.assessment?.subjectId;
        console.log('Fetching growth data for subject ID:', subjectId, 'Results:', results);
        
        if (subjectId) {
          studentAPI.getGrowthOverTime(subjectId)
            .then(data => {
              console.log('Growth data received:', data);
              setGrowthData(data);
              setGrowthLoading(false);
            })
            .catch(error => {
              console.error('Error fetching growth data:', error);
              setGrowthLoading(false);
            });
        } else {
          console.error('No subject ID found in assessment results. Available fields:', {
            assessment: results.assessment,
            results: results
          });
          setGrowthLoading(false);
        }
      });
    }
  }, [activeTab, results, growthData, growthLoading]);

  // Fetch competency data when switching to competency tab
  useEffect(() => {
    if (activeTab === 'competency' && results && !competencyLoading && !competencyDataFetched.current) {
      setCompetencyLoading(true);
      competencyDataFetched.current = true;
      
      import('../services/api').then(({ studentAPI }) => {
        const promises = [];
        
        // Fetch current assessment competency scores
        if (results.assessment.id) {
          promises.push(
            studentAPI.getCompetencyScores(results.assessment.id)
              .then(data => setCompetencyScores(data))
              .catch(error => {
                console.error('Error fetching competency scores:', error);
                setCompetencyScores([]);
              })
          );
        }
        
        // Fetch competency growth data using the actual subject ID from results
        const competencySubjectId = results.assessment?.subjectId;
        if (competencySubjectId) {
          promises.push(
            studentAPI.getCompetencyGrowth(competencySubjectId)
              .then(data => setCompetencyGrowthData(data))
              .catch(error => {
                console.error('Error fetching competency growth:', error);
                setCompetencyGrowthData([]);
              })
          );
        }
        
        Promise.all(promises).finally(() => {
          setCompetencyLoading(false);
        });
      });
    }
  }, [activeTab, results, competencyLoading]);

  const getScoreColor = (score: number) => {
    if (score >= 350) return 'text-purple-600';
    if (score >= 300) return 'text-blue-600';
    if (score >= 250) return 'text-emerald-600';
    if (score >= 200) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 350) return 'Advanced+';
    if (score >= 300) return 'Advanced';
    if (score >= 250) return 'Proficient';
    if (score >= 200) return 'Developing';
    return 'Beginning';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 350) return '🏆';
    if (score >= 300) return '🌟';
    if (score >= 250) return '🎯';
    if (score >= 200) return '📈';
    return '🌱';
  };

  const getRITChange = () => {
    if (!results?.statistics.previousRIT) return null;
    const change = results.statistics.currentRIT - results.statistics.previousRIT;
    return {
      value: change,
      isPositive: change > 0,
      percentage: Math.round((change / results.statistics.previousRIT) * 100)
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!results) {
    // Fallback for basic results
    const basicResults = location.state as {
      ritScore: number;
      correctAnswers: number;
      totalQuestions: number;
      duration: number;
      subjectId: number;
      period: string;
      message?: string;
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{getScoreIcon(basicResults.ritScore)}</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Assessment Complete!</h1>
            <p className="text-xl text-gray-600 mb-4">
              {basicResults.message}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
            <div className="text-center mb-8">
              <div className={`text-6xl font-bold ${getScoreColor(basicResults.ritScore)} mb-2`}>
                {basicResults.ritScore}
              </div>
              <div className="text-xl text-gray-600">Growth Metric Score</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-900">{basicResults.correctAnswers}</div>
                <div className="text-sm text-emerald-700">Correct Answers</div>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">{basicResults.totalQuestions}</div>
                <div className="text-sm text-blue-700">Total Questions</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">{basicResults.duration}</div>
                <div className="text-sm text-purple-700">Minutes</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ritChange = getRITChange();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getScoreIcon(results.statistics.currentRIT)}</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Assessment Complete!</h1>
          <p className="text-xl text-gray-600">
            {results.assessment.subjectName} • {results.assessment.period} {results.assessment.year}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-8">
          <div className="flex">
            <button
              onClick={() => setActiveTab('assessment')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'assessment'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <BarChart className="h-4 w-4" />
                <span>ASSESSMENT REPORT</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('overall')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'overall'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <LineChart className="h-4 w-4" />
                <span>OVERALL REPORT</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('competency')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'competency'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>COMPETENCY ANALYSIS</span>
              </div>
            </button>
          </div>
        </div>

        {/* Assessment Report Tab Content */}
        {activeTab === 'assessment' && (
          <>
            {/* Main Score Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className={`text-6xl font-bold ${getScoreColor(results.statistics.currentRIT)} mb-2`}>
                {results.statistics.currentRIT}
              </div>
              <div className="text-xl text-gray-600">Current Growth Metric Score</div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                results.statistics.currentRIT >= 350 ? 'bg-purple-100 text-purple-800' :
                results.statistics.currentRIT >= 300 ? 'bg-blue-100 text-blue-800' :
                results.statistics.currentRIT >= 250 ? 'bg-emerald-100 text-emerald-800' :
                results.statistics.currentRIT >= 200 ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {getScoreLevel(results.statistics.currentRIT)} Level
              </div>
            </div>

            {/* Growth Metric Change Indicator */}
            {ritChange && (
              <div className="mt-4">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
                  ritChange.isPositive 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {ritChange.isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>
                    {ritChange.isPositive ? '+' : ''}{ritChange.value} points 
                    ({ritChange.isPositive ? '+' : ''}{ritChange.percentage}%)
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  from previous assessment
                </div>
              </div>
            )}
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-900">{results.statistics.correctAnswers}</div>
                  <div className="text-sm text-emerald-700">Correct</div>
                </div>
              </div>
              <div className="text-emerald-800">
                <div className="text-lg font-semibold">{results.statistics.accuracy}% Accuracy</div>
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-xl border border-red-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-900">{results.statistics.incorrectAnswers}</div>
                  <div className="text-sm text-red-700">Incorrect</div>
                </div>
              </div>
              <div className="text-red-800">
                <div className="text-lg font-semibold">Need Improvement</div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-900">{results.statistics.totalQuestions}</div>
                  <div className="text-sm text-blue-700">Total Questions</div>
                </div>
              </div>
              <div className="text-blue-800">
                <div className="text-lg font-semibold">Adaptive Test</div>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-900">{results.assessment.duration}</div>
                  <div className="text-sm text-purple-700">Minutes</div>
                </div>
              </div>
              <div className="text-purple-800">
                <div className="text-lg font-semibold">Time Taken</div>
                <div className="text-sm">~{Math.round(results.assessment.duration / results.statistics.totalQuestions * 10) / 10} min/question</div>
              </div>
            </div>
          </div>
        </div>

        {/* Competency Summary (if available) */}
        {results.competencyScores && results.competencyScores.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span>Competency Summary</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.competencyScores.slice(0, 6).map((score) => (
                <div key={score.id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{score.competencyName}</h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      score.feedbackType === 'strong' ? 'bg-green-100 text-green-800' :
                      score.feedbackType === 'neutral' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {score.finalScore}%
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{score.feedbackText}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setActiveTab('competency')}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                View Detailed Competency Analysis →
              </button>
            </div>
          </div>
        )}

        {/* Difficulty Progression Chart */}
        <div className="mb-8">
          <DifficultyProgressionChart
            data={results.difficultyProgression}
            currentRIT={results.statistics.currentRIT}
            previousRIT={results.statistics.previousRIT}
          />
        </div>

        {/* Previous Assessment Comparison */}
        {results.previousAssessment && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Progress Comparison</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Previous Assessment</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Growth Metric Score:</span>
                    <span className="font-medium">{results.previousAssessment.ritScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium">{results.previousAssessment.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year:</span>
                    <span className="font-medium">{results.previousAssessment.year}</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Current Assessment</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Growth Metric Score:</span>
                    <span className="font-medium">{results.statistics.currentRIT}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium">{results.assessment.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year:</span>
                    <span className="font-medium">{results.assessment.year}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question-by-Question Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span>Question Analysis</span>
          </h3>
          <div className="space-y-4">
            {results.responses.map((response, index) => (
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
                      {response.questionNumber}
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
                {/* Special handling for FillInBlank - show question with answers integrated */}
                {response.questionType === 'FillInBlank' && response.questionMetadata?.blanks && Array.isArray(response.selectedAnswer) ? (
                  <div className="text-gray-900 mb-3">
                    {(() => {
                      // Parse question text and replace blanks with selected answers
                      let questionText = response.questionText || '';
                      const blanks = response.questionMetadata.blanks;
                      const selectedAnswers = response.selectedAnswer as number[];
                      
                      // Replace each blank placeholder sequentially
                      // Common patterns: ___, [blank], {0}, etc.
                      const blankPattern = /(___+|\[blank\]|\[BLANK\]|\{[0-9]+\})/gi;
                      let matchCount = 0;
                      
                      questionText = questionText.replace(blankPattern, (match) => {
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
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Your Match (Column B)</th>
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
                  // Default display for other question types
                  <>
                    <div className="text-gray-900 mb-3" dangerouslySetInnerHTML={{ __html: response.questionText }} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="font-medium text-gray-700">Your Answer: </span>
                        <span className={response.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                          {response.formattedSelectedAnswer !== undefined 
                            ? response.formattedSelectedAnswer 
                            : ((response.questionType === 'ShortAnswer' || response.questionType === 'Essay') 
                              ? (typeof response.selectedAnswer === 'string' ? response.selectedAnswer : 'N/A')
                              : (response.options && response.options[response.selectedAnswer as number] || 'N/A'))}
                        </span>
                      </div>
                      {!response.isCorrect && response.questionType !== 'ShortAnswer' && response.questionType !== 'Essay' && (
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
                  </>
                )}
                {/* Show AI Grading Reason for Short Answer and Essay */}
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
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <span>View Progress Dashboard</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* Motivational Message */}
        <div className="mt-8 text-center p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl border border-blue-200">
          <p className="text-blue-800 font-medium">
            {results.statistics.accuracy >= 75 
              ? "Excellent work! You're showing strong mastery of the material." 
              : results.statistics.accuracy >= 50
              ? "Good effort! Keep practicing to improve your skills."
              : "Every assessment is a learning opportunity. Keep working hard!"}
          </p>
          {ritChange && (
            <p className="text-blue-700 text-sm mt-2">
              {ritChange.isPositive 
                ? "Great progress! You've improved since your last assessment."
                : "Don't worry! Focus on the areas that need improvement."}
            </p>
          )}
        </div>
          </>
        )}

        {/* Overall Report Tab Content */}
        {activeTab === 'overall' && (
          <div className="space-y-8">
            {growthLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              </div>
            ) : growthData ? (
              <>
                {/* Growth Chart */}
                <GrowthOverTimeChart data={growthData} userRole="student" />
                
                {/* Competency Growth Summary */}
                {competencyGrowthData.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <span>Competency Growth Overview</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {competencyGrowthData.slice(0, 6).map((competency) => (
                        <div key={competency.competencyId} className="bg-gray-50 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">{competency.competencyName}</h4>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              competency.growthTrend === 'improving' ? 'bg-green-100 text-green-800' :
                              competency.growthTrend === 'declining' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {competency.averageScore}%
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mb-2">
                            {competency.growthTrend === 'improving' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : competency.growthTrend === 'declining' ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : (
                              <Target className="h-4 w-4 text-blue-600" />
                            )}
                            <span className="text-xs text-gray-600 capitalize">{competency.growthTrend}</span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{competency.overallFeedback}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setActiveTab('competency')}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        View Detailed Competency Analysis →
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="text-center">
                  <p className="text-gray-600">Unable to load growth data.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Competency Analysis Tab Content */}
        {activeTab === 'competency' && (
          <div className="space-y-8">
            {competencyLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              </div>
            ) : competencyScores.length > 0 ? (
              <CompetencyAnalytics
                currentScores={competencyScores}
                growthData={competencyGrowthData}
                assessmentId={results?.assessment.id}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="text-center">
                  <div className="text-6xl mb-4">🧠</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Competency Data Available</h3>
                  <p className="text-gray-600 mb-4">
                    Competency analysis is not available for this assessment yet.
                  </p>
                  <p className="text-sm text-gray-500">
                    This feature requires questions to be mapped to specific competencies.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;