import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Assessment } from '../types';
import { TrendingUp } from 'lucide-react';

interface GrowthChartProps {
  data: Assessment[];
  subjectName: string;
}

const GrowthChart: React.FC<GrowthChartProps> = ({ data, subjectName }) => {
  // Sort and prepare data for chart (Winter → Spring → Fall)
  const chartData = data
    .sort((a, b) => {
      const periodOrder = { 'Winter': 1, 'Spring': 2, 'Fall': 3 };
      return periodOrder[a.assessmentPeriod] - periodOrder[b.assessmentPeriod];
    })
    .map((assessment) => ({
      period: assessment.assessmentPeriod,
      score: assessment.ritScore || 0,
      correctAnswers: assessment.correctAnswers || 0,
      totalQuestions: assessment.totalQuestions,
      dateTaken: new Date(assessment.dateTaken).toLocaleDateString()
    }));

  if (chartData.length === 0) {
    return null;
  }

  // Calculate growth
  const firstScore = chartData[0].score;
  const lastScore = chartData[chartData.length - 1].score;
  const growth = lastScore - firstScore;
  const growthPercentage = ((growth / firstScore) * 100).toFixed(1);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span>{subjectName} Growth Metric Score Progress</span>
        </h4>
        {chartData.length > 1 && (
          <div className={`text-sm font-medium ${growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {growth >= 0 ? '+' : ''}{growth} pts ({growthPercentage}%)
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis domain={['dataMin - 10', 'dataMax + 10']} label={{ value: 'Growth Metric Score', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value, name) => [value, 'Growth Metric Score']}
            labelFormatter={(label) => `${label} Assessment`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, fill: '#1D4ED8' }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
        {chartData.map((point, index) => (
          <div key={index} className="text-center">
            <div className="font-medium text-gray-900">{point.period}</div>
            <div className="text-blue-600 font-bold">{point.score}</div>
            <div className="text-gray-500 text-xs">{point.correctAnswers}/{point.totalQuestions}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GrowthChart;