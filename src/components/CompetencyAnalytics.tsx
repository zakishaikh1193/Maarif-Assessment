import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  Star,
  Award,
  Lightbulb
} from 'lucide-react';
import { CompetencyScore, CompetencyGrowthData } from '../types';
import { studentAPI } from '../services/api';

interface CompetencyAnalyticsProps {
  currentScores: CompetencyScore[];
  growthData?: CompetencyGrowthData[];
  assessmentId?: number;
}

interface CompetencyRecommendations {
  strengths: string[];
  studyTips: string[];
  focusAreas: string[];
}

const CompetencyAnalytics: React.FC<CompetencyAnalyticsProps> = ({ 
  currentScores, 
  growthData, 
  assessmentId 
}) => {
  const [recommendations, setRecommendations] = useState<CompetencyRecommendations | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Only fetch once when assessmentId is available and we have scores
    if (assessmentId && currentScores.length > 0 && !hasFetched && !recommendationsLoading) {
      fetchCompetencyRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, currentScores.length]);

  const fetchCompetencyRecommendations = async () => {
    if (!assessmentId || hasFetched || currentScores.length === 0) {
      console.log('Skipping fetch - assessmentId:', assessmentId, 'hasFetched:', hasFetched, 'scores:', currentScores.length);
      return;
    }
    
    console.log('Starting to fetch competency recommendations for assessment:', assessmentId);
    setRecommendationsLoading(true);
    setHasFetched(true);
    
    try {
      const data = await studentAPI.getCompetencyRecommendations(assessmentId);
      console.log('Successfully received competency recommendations:', data);
      
      // Validate the response structure
      if (data && Array.isArray(data.strengths) && Array.isArray(data.studyTips) && Array.isArray(data.focusAreas)) {
        setRecommendations(data);
        console.log('Recommendations set successfully');
      } else {
        console.error('Invalid recommendations data structure:', data);
        setHasFetched(false); // Allow retry
      }
    } catch (error: any) {
      console.error('Failed to fetch competency recommendations:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      // Reset hasFetched to allow retry on next render if needed
      setHasFetched(false);
    } finally {
      setRecommendationsLoading(false);
    }
  };
  const getFeedbackIcon = (feedbackType: string) => {
    switch (feedbackType) {
      case 'strong':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'neutral':
        return <Target className="h-5 w-5 text-yellow-600" />;
      case 'growth':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Target className="h-5 w-5 text-gray-600" />;
    }
  };

  const getFeedbackColor = (feedbackType: string) => {
    switch (feedbackType) {
      case 'strong':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'neutral':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'growth':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getGrowthIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <Target className="h-4 w-4 text-blue-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const chartData = currentScores.map(score => ({
    name: score.competencyName,
    score: Number(score.finalScore) || 0,
    attempted: Number(score.questionsAttempted) || 0,
    correct: Number(score.questionsCorrect) || 0,
    accuracy: Number(score.questionsAttempted) > 0 ? (Number(score.questionsCorrect) / Number(score.questionsAttempted)) * 100 : 0
  }));

  const pieData = currentScores.map(score => ({
    name: score.competencyName,
    value: Number(score.finalScore) || 0,
    color: score.feedbackType === 'strong' ? '#10B981' : 
           score.feedbackType === 'neutral' ? '#F59E0B' : '#EF4444'
  }));

  // Debug logging
  console.log('Current Scores:', currentScores);
  console.log('Pie Data:', pieData);
  console.log('Pie Data Values:', pieData.map(item => ({ name: item.name, value: item.value, type: typeof item.value })));

  return (
    <div className="space-y-6">
      {/* Competency Overview Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Competency Analysis</h3>
            <p className="text-sm text-gray-600">
              Detailed breakdown of your performance across different skill areas
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Strong Areas</span>
            </div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">
              {currentScores.filter(s => s.feedbackType === 'strong').length}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">Developing</span>
            </div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">
              {currentScores.filter(s => s.feedbackType === 'neutral').length}
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">Need Support</span>
            </div>
            <div className="text-2xl font-bold text-red-900 mt-1">
              {currentScores.filter(s => s.feedbackType === 'growth').length}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Average Score</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {currentScores.length > 0 
                ? `${Math.round(currentScores.reduce((sum, s) => sum + (Number(s.finalScore) || 0), 0) / currentScores.length)}%`
                : '0%'}
            </div>
          </div>
        </div>
      </div>

      {/* Competency Performance Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
            <BarChart className="h-5 w-5 text-purple-600" />
            <span>Competency Performance Overview</span>
          </h4>
          <p className="text-sm text-gray-600">Performance scores across different competencies</p>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                interval={0}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickCount={5}
                label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6B7280' } }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                formatter={(value: any, name: string) => [
                  `${value}%`, 
                  name === 'score' ? 'Final Score' : 
                  name === 'accuracy' ? 'Accuracy' : name
                ]}
                labelStyle={{ fontWeight: 600, marginBottom: '4px', color: '#111827' }}
              />
              <Bar 
                dataKey="score" 
                fill="#8B5CF6" 
                name="Final Score"
                radius={[8, 8, 0, 0]}
                stroke="#7C3AED"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Competency Distribution Pie Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
            <PieChart className="h-5 w-5 text-purple-600" />
            <span>Performance Distribution</span>
          </h4>
          <p className="text-sm text-gray-600">Distribution of performance across competency categories</p>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value, percent }) => {
                    // Show label if value is greater than 0
                    if (value > 0) {
                      // Format percentage to show 2 decimal places if needed, otherwise whole number
                      const displayValue = value % 1 === 0 ? value : value.toFixed(2);
                      return `${displayValue}%`;
                    }
                    return '';
                  }}
                  labelLine={{
                    stroke: '#6B7280',
                    strokeWidth: 1.5,
                    length: 15,
                    lengthType: 'straight'
                  }}
                >
                  {pieData.map((entry, index) => {
                    // Use vibrant color palette similar to examples (light blue, red, purple, dark blue, pink)
                    const colors = [
                      '#60A5FA', // Light Blue
                      '#EF4444', // Red
                      '#A78BFA', // Purple
                      '#3B82F6', // Dark Blue
                      '#EC4899', // Pink/Magenta
                      '#10B981', // Green
                      '#F59E0B', // Amber
                      '#6366F1'  // Indigo
                    ];
                    // Use light gray for zero values, otherwise use color from entry or palette
                    const fillColor = entry.value > 0 
                      ? (entry.color || colors[index % colors.length]) 
                      : '#E5E7EB';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={fillColor}
                        stroke="#FFFFFF"
                        strokeWidth={3}
                      />
                    );
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  formatter={(value: any, name: string, props: any) => {
                    const total = pieData.reduce((sum, item) => sum + item.value, 0);
                    const percent = total > 0 ? ((value / total) * 100).toFixed(2) : '0';
                    const displayValue = value % 1 === 0 ? value : parseFloat(value).toFixed(2);
                    return [
                      `${displayValue}% (${percent}% of total)`, 
                      props.payload.name || 'Competency'
                    ];
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: '4px', color: '#111827' }}
                />
                <Legend 
                  verticalAlign="bottom"
                  height={60}
                  iconType="square"
                  wrapperStyle={{ paddingTop: '20px' }}
                  content={(props) => {
                    const { payload } = props;
                    if (!payload || payload.length === 0) return null;
                    
                    return (
                      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
                        {payload.map((entry: any, index: number) => {
                          const data = entry.payload;
                          const displayValue = data.value > 0 
                            ? (data.value % 1 === 0 ? data.value : parseFloat(data.value).toFixed(2))
                            : '0';
                          return (
                            <div key={index} className="flex items-center space-x-2">
                              <div 
                                className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: entry.color || '#E5E7EB' }}
                              />
                              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                {data.name}: {displayValue}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-400 mb-2">
                  <PieChart className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-600">No performance data available for pie chart</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Individual Competency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentScores.map((score) => (
          <div key={score.id} className={`bg-white rounded-xl shadow-sm border p-6 ${getFeedbackColor(score.feedbackType)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getFeedbackIcon(score.feedbackType)}
                <div>
                  <h5 className="font-semibold text-gray-900">{score.competencyName}</h5>
                  <p className="text-sm text-gray-600">{score.competencyCode}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{score.finalScore}%</div>
                <div className="text-sm text-gray-600">Final Score</div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Performance Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Questions</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {score.questionsCorrect}/{score.questionsAttempted}
                  </div>
                </div>
                <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Accuracy</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {score.questionsAttempted > 0 ? Math.round((score.questionsCorrect / score.questionsAttempted) * 100) : 0}%
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Personalized Feedback</div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {score.feedbackText}
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth Indicator (if available) */}
              {growthData && growthData.find(g => g.competencyId === score.competencyId) && (
                <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getGrowthIcon(growthData.find(g => g.competencyId === score.competencyId)?.growthTrend || 'stable')}
                    <span className="text-sm font-medium text-gray-900">
                      {growthData.find(g => g.competencyId === score.competencyId)?.growthTrend === 'improving' ? 'Improving' :
                       growthData.find(g => g.competencyId === score.competencyId)?.growthTrend === 'declining' ? 'Needs Attention' :
                       'Stable Performance'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Growth Tracking (if available) */}
      {growthData && growthData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Competency Growth Over Time</span>
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assessmentPeriod" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Score']} />
                <Legend />
                {growthData.map((competency, index) => (
                  <Line
                    key={competency.competencyId}
                    type="monotone"
                    dataKey="finalScore"
                    data={competency.scores}
                    stroke={['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'][index % 5]}
                    name={competency.competencyName}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Award className="h-5 w-5 text-blue-600" />
          <span>Personalized Recommendations</span>
        </h4>
        
        {recommendationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Generating AI-powered recommendations...</span>
          </div>
        ) : recommendations ? (
          <div className="space-y-4">
            {/* Your Strengths */}
            {recommendations.strengths.length > 0 && (
              <div className="bg-white bg-opacity-70 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Your Strengths</span>
                </div>
                <p className="text-sm text-gray-700">
                  You're excelling in: {recommendations.strengths.join(', ')}. Continue building on these strong foundations!
                </p>
              </div>
            )}

            {/* Focus Areas */}
            {recommendations.focusAreas.length > 0 && (
              <div className="bg-white bg-opacity-70 p-4 rounded-lg border border-amber-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-800">Focus Areas</span>
                </div>
                <p className="text-sm text-gray-700">
                  Consider spending more time on: {recommendations.focusAreas.join(', ')}. These areas offer great opportunities for improvement.
                </p>
              </div>
            )}

          </div>
        ) : (
          <div className="space-y-4">
            {/* Fallback - use existing logic */}
            {currentScores.filter(s => s.feedbackType === 'strong').length > 0 && (
              <div className="bg-white bg-opacity-70 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Your Strengths</span>
                </div>
                <p className="text-sm text-gray-700">
                  You're excelling in: {currentScores.filter(s => s.feedbackType === 'strong').map(s => s.competencyName).join(', ')}. 
                  Continue building on these strong foundations!
                </p>
              </div>
            )}

            {currentScores.filter(s => s.feedbackType === 'growth').length > 0 && (
              <div className="bg-white bg-opacity-70 p-4 rounded-lg border border-red-200">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Focus Areas</span>
                </div>
                <p className="text-sm text-gray-700">
                  Consider spending more time on: {currentScores.filter(s => s.feedbackType === 'growth').map(s => s.competencyName).join(', ')}. 
                  These areas offer great opportunities for improvement.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetencyAnalytics;
