import React from 'react';
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
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { CompetencyScore, CompetencyGrowthData } from '../types';

interface CompetencyAnalyticsProps {
  currentScores: CompetencyScore[];
  growthData?: CompetencyGrowthData[];
  assessmentId?: number;
}

const CompetencyAnalytics: React.FC<CompetencyAnalyticsProps> = ({ 
  currentScores, 
  growthData, 
  assessmentId 
}) => {
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
              {Math.round(currentScores.reduce((sum, s) => sum + s.finalScore, 0) / currentScores.length)}%
            </div>
          </div>
        </div>
      </div>

      {/* Competency Performance Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <BarChart className="h-5 w-5 text-blue-600" />
          <span>Competency Performance Overview</span>
        </h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  `${value}%`, 
                  name === 'score' ? 'Final Score' : 
                  name === 'accuracy' ? 'Accuracy' : name
                ]}
              />
              <Legend />
              <Bar dataKey="score" fill="#8B5CF6" name="Final Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Competency Distribution Pie Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <PieChart className="h-5 w-5 text-green-600" />
          <span>Performance Distribution</span>
        </h4>
        <div className="h-80">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  minAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value}%`, 'Score']} />
                <Legend />
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
        
        <div className="space-y-4">
          {/* Strong Areas */}
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

          {/* Areas for Growth */}
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

          {/* General Advice */}
          <div className="bg-white bg-opacity-70 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Study Tips</span>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Review questions you answered incorrectly to understand the concepts better</li>
              <li>• Practice regularly with questions of varying difficulty levels</li>
              <li>• Focus on understanding the underlying principles rather than memorizing</li>
              <li>• Take advantage of adaptive learning - the system adjusts to your level</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetencyAnalytics;
